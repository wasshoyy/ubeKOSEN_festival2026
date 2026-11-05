from pybricks.tools import wait, multitask
from pybricks.messaging import BLERadio
import course

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

MY_SPIKE_ID = 0

radio = BLERadio(broadcast_channel=MY_SPIKE_ID, observe_channels=[255])

table_id = None

all_stop = False
my_stop = False
ready = False
wait_front = False

inner_state = STATE.WAITING_ORDER
point_id_now = 0

path = course.get_path(0)

def get_state():
    """
    if all_stop or my_stop:
        hub.light.on(Color.RED)
        hub.display.icon(Icon.PAUSE)
    else:
        hub.light.on(Color.GREEN)
        hub.display.icon(Icon.TRIANGLE_RIGHT)
    """
    return all_stop or my_stop

def update_state(new_state):
    global inner_state

    inner_state = new_state

def update_point():
    global point_id_now, wait_front

    wait_front = False
    point_id_now += 1

def get_wait_front():
    return wait_front

def get_point_id_now():
    return point_id_now

def check_arrived_table():
    if table_id is None:
        return False
    return path[point_id_now] == table_id + course.CHECK_POINT_NUM

def all_command(on_off):
    global all_stop

    if on_off == 0:
        all_stop = True
    elif on_off == 1:
        all_stop = False

def task_command(on_off):
    global my_stop

    if on_off == 0:
        my_stop = True
    elif on_off == 1:
        my_stop = False

def set_table_id(new_id):
    global table_id, path

    if new_id is not None:
        if table_id != new_id:
            table_id = new_id
            path = course.get_path(table_id)

def get_path():
    return path

def check_main_way():
    if table_id is None:
        return True

    if path[point_id_now] == course.CHECK_POINT_NUM + table_id or path[point_id_now] == course.cp_aft_table[table_id]:
        return False
    else:
        return True

async def reception():
    global table_id, wait_front
    while True:
        data = None
        while data is None:
            data = radio.observe(255)
            await wait(10)
    
        syg_type = data[0]
        spike_id = data[1]
    
        if syg_type == COMMAND_CENTER_SIGNAL.STOP:
            stop = data[2]
            if spike_id == 255:
                all_command(stop)
            elif spike_id == MY_SPIKE_ID:
                task_command(stop)

        elif syg_type == COMMAND_CENTER_SIGNAL.ASSIGN:
            if spike_id == MY_SPIKE_ID:
                table_id = data[2]
                set_table_id(table_id)

        elif syg_type == COMMAND_CENTER_SIGNAL.MOVE_RESPONSE:
            if spike_id == MY_SPIKE_ID:
                check_point_id = data[2]
                allow = data[3]

                if check_point_id == path[point_id_now + 1]:
                    wait_front = not allow

        elif syg_type == COMMAND_CENTER_SIGNAL.READY:
            if spike_id == MY_SPIKE_ID:
                ready = data[2]

        await wait(10)

async def transmission():
    while True:
        if point_id_now > 0:
            stop = get_state()
            state_message = [CLIENT_SIGNAL.STATE, path[point_id_now - 1], stop, inner_state]

            await radio.broadcast(state_message)
            await wait(10)

        move_request = [CLIENT_SIGNAL.MOVE_REQUEST, path[point_id_now + 1]]

        await radio.broadcast(move_request)
        await wait(10)

async def communication():
    await multitask(reception(), transmission())