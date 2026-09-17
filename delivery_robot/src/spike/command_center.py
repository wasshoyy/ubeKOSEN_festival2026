from pybricks.hubs import PrimeHub
from pybricks.tools import Matrix, wait, run_task, multitask
from pybricks.parameters import Icon
from pybricks.messaging import BLERadio
from usys import stdin, stdout
from uselect import poll

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

class SIGNAL_TYPE:
    ALL = 0
    TASK = 1
    STATE = 2
    # POLL = 3

SPIKE_NUM = 2

# POLLはPCがSPIKEにSTATE情報を要求する通信。
# 一旦実装範囲から外している

observe_channels = [i for i in range(SPIKE_NUM)]
radio = BLERadio(broadcast_channel=255, observe_channels=observe_channels)

keyboard = poll()
keyboard.register(stdin)

"""
通信する情報は(TYPE, spike_id, option)の3つ

PCからの情報(SPIKEへの情報)
ALL:全spike(spike_id == 255)に停止命令/再生命令を出してください
TASK:spike_idのSPIKEにtable_idまでスープを運ぶように命令してください

SPIKEからの情報
STATE:私(spike_id)が今状態state_idであることをPCへと伝えてください

PCへの情報
spike_idはconnected(or disconnected)でstate_idです
"""

command_list = [[255 for _ in range(3)] for _ in range(SPIKE_NUM + 1)]
spike_states = [[0, 0] for _ in range(SPIKE_NUM)]
pc_connected = False

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

    global command_list
    while True:
        hub.display.icon(SMILE)
        # PCからのデータ待ち
        while not keyboard.poll(0):
            await wait(10)

        symbol = stdin.buffer.read(3)
        int_list = list(symbol)

        if len(int_list) != 3:
            continue

        if int_list[0] == 0: # ALL
            command_list[SPIKE_NUM] = int_list
        else:
            command_list[int_list[1]] = int_list

async def from_spike():
    global spike_states
    while True:
        for spike_id in range(SPIKE_NUM):
            state = radio.observe(spike_id)
            if state is None:
                continue
            spike_states[spike_id] = [state, 0]
        
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
            state, second = spike_states[spike_id]
            connected = 1
            if second >= 1000:
                connected = 0
            
            stdout.buffer.write(bytes([200, spike_id, connected, state]))
            await wait(10)
        await wait(50)

async def to_spike():
    while True:
        for spike_id in range(SPIKE_NUM + 1):
            command = command_list[spike_id]
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