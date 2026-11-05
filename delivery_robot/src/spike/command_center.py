from pybricks.hubs import PrimeHub
from pybricks.tools import Matrix, wait, run_task, multitask
from pybricks.parameters import Icon
from pybricks.messaging import BLERadio
from usys import stdin, stdout
from uselect import poll
from micropython import kbd_intr
import course

hub = PrimeHub()

SMILE = Matrix(
    [
        [0, 100, 0, 100, 0],
        [0, 100, 0, 100, 0],
        [0, 0, 0, 0, 0],
        [100, 0, 0, 0, 100],
        [0, 100, 100, 100, 0],
    ]
)

SPIKE_NUM = 2

class COMMAND_CENTER_SIGNAL:
    STOP = 0
    ASSIGN = 1
    MOVE_RESPONSE = 2
    READY = 3

class CLIENT_SIGNAL:
    STATE = 0
    MOVE_REQUEST = 1

class STATE:
    WAITING_ORDER = 0
    READY = 1

observe_channels = [i for i in range(SPIKE_NUM)]
radio = BLERadio(broadcast_channel=255, observe_channels=observe_channels)

kbd_intr(-1)
keyboard = poll()
keyboard.register(stdin)

stop_command_list = [[255 for _ in range(3)] for _ in range(SPIKE_NUM + 1)]
assign_command_list = [[255 for _ in range(3)] for _ in range(SPIKE_NUM)]
ready_command_list = [[255 for _ in range(3)] for _ in range(SPIKE_NUM)]
move_requests = [None for _ in range(SPIKE_NUM)]

occupied = [None for _ in range(course.CHECK_POINT_NUM + course.TABLE_NUM)]
reserved = [None for _ in range(course.CHECK_POINT_NUM + course.TABLE_NUM)]

# 各spike_idごとにinner_state, secondを保持
spike_states = [[STATE.WAITING_ORDER, 0] for _ in range(SPIKE_NUM)]

pc_connected = False

def check_point(spike_id):
    global occupied, reserved
    
    point_id = move_requests[spike_id]

    if occupied[point_id] == spike_id:
        return True
    
    if reserved[point_id] is None:
        reserved[point_id] = spike_id
    
    if reserved[point_id] == spike_id:
        if occupied[point_id] is None:
            occupied[point_id] = spike_id
            reserved[point_id] = None
            return True
    
    return False

async def from_pc():
    global pc_connected
    while True:
        # PCからのデータ待ち
        while not keyboard.poll(0):
            # PC側に「受信可能」と知らせる
            stdout.buffer.write(b"rdy")
        
            await wait(100)

        symbol = stdin.buffer.read(3)
        int_list = list(symbol)

        successful = int_list[0]
        if successful == 200:
            pc_connected = True
            break

    global stop_command_list, assign_command_list, ready_command_list, move_requests
    while True:
        hub.display.icon(SMILE)
        # PCからのデータ待ち
        while not keyboard.poll(0):
            await wait(10)

        symbol = stdin.buffer.read(3)
        int_list = list(symbol)

        if len(int_list) != 3:
            continue
        
        spike_id = int_list[1]

        if int_list[0] == COMMAND_CENTER_SIGNAL.STOP:
            stop_command_list[spike_id] = int_list
        elif int_list[0] == COMMAND_CENTER_SIGNAL.ASSIGN:
            assign_command_list[spike_id] = int_list
        elif int_list[0] == COMMAND_CENTER_SIGNAL.READY:
            ready_command_list[spike_id] = int_list
        elif int_list[0] == COMMAND_CENTER_SIGNAL.MOVE_RESPONSE:
            point_id = int_list[2]
            move_requests[spike_id] = point_id

async def from_spike():
    global spike_states, move_requests, assign_command_list, occupied, reserved
    while True:
        for spike_id in range(SPIKE_NUM):
            data = radio.observe(spike_id)

            if data is None:
                await wait(10)
                continue

            syg_type = data[0]

            if syg_type == CLIENT_SIGNAL.STATE:
                free_point_id = data[1]
                stop = data[2]
                inner_state = data[3]

                occupied[free_point_id] = None
                reserved[free_point_id] = None

                # 登録時はsecond = 0
                spike_states[spike_id] = [inner_state, 0]
                if inner_state != STATE.WAITING_ORDER:
                    assign_command_list[spike_id][2] = 255
            elif syg_type == CLIENT_SIGNAL.MOVE_REQUEST:
                point_id = data[1]
                move_requests[spike_id] = point_id
        
        await wait(10)


async def forget():
    while True:
        for spike_id in range(SPIKE_NUM):
            if spike_states[spike_id][1] < 1000:
                spike_states[spike_id][1] += 10
        await wait(10)

async def to_pc():
    while True:
        if pc_connected == False:
            await wait(1000)
            continue
        
        for spike_id in range(SPIKE_NUM):
            inner_state, second = spike_states[spike_id]
            connected = 1
            if second >= 1000:
                connected = 0
            
            stdout.buffer.write(bytes([200, spike_id, connected, inner_state]))
            await wait(10)
        await wait(50)

async def to_spike():
    while True:
        # STOP
        for spike_id in range(SPIKE_NUM + 1):
            command = stop_command_list[spike_id]
            await radio.broadcast(command)
            await wait(10)
            
        # ASSIGN
        for spike_id in range(SPIKE_NUM):
            command = assign_command_list[spike_id]

            await radio.broadcast(command)
            await wait(10)

        # MOVE_REQUEST
        for spike_id in range(SPIKE_NUM):
            if move_requests[spike_id] is None:
                continue
            
            command = [
                COMMAND_CENTER_SIGNAL.MOVE_RESPONSE,
                spike_id,
                move_requests[spike_id],
                check_point(spike_id)
            ]
            await radio.broadcast(command)
            await wait(10)
        
        # READY
        for spike_id in range(SPIKE_NUM):
            command = ready_command_list[spike_id]
            await radio.broadcast(command)
            await wait(10)
        
        await wait(50)


async def reception():
    await multitask(from_pc(), from_spike())

async def transmission():
    await multitask(to_pc(), to_spike(), forget())

async def main():
    await multitask(reception(), transmission())

run_task(main())