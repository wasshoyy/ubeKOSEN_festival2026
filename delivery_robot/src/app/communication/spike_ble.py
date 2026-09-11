# ../spike/command_center.pyとの連携用コード

import asyncio
from bleak import BleakScanner, BleakClient

PYBRICKS_COMMAND_EVENT_CHAR_UUID = (
    "c5f50002-8280-46da-89f4-6d8051e4aeef"
)

HUB_NAME = "command_center"

spike_states = [False for _ in range(2)]

command_queue = asyncio.Queue()

communication_task = None

async def communication_loop():

    ready_event = asyncio.Event()
    result_event = asyncio.Event()

    rx_buffer = bytearray()

    def handle_rx(_, data: bytearray):
        print("RAW RX:", list(data))

        # Pybricksのstdoutイベント
        if data[0] != 0x01:
            return
        
        payload = data[1:]

        if payload == b"rdy":
            ready_event.set()
            return

        rx_buffer.extend(payload)

        while len(rx_buffer) >= 3:
            if rx_buffer[0] == 200:
                result_event.set()
                del rx_buffer[0]
                return
            
            del rx_buffer[0]

    print("Searching for SPIKE PRIME...")

    device = await BleakScanner.find_device_by_name(HUB_NAME)

    if device is None:
        print("SPIKE PRIMEが見つかりません")
        return

    print("Found:", device.name)

    async with BleakClient(device) as client:

        async def transmission():
            while True:
                command = await command_queue.get()

                print("send:", command)

                await client.write_gatt_char(
                    PYBRICKS_COMMAND_EVENT_CHAR_UUID,
                    b"\x06" + bytes(command),
                    response=True
                )
                command_queue.task_done()

        async def reception():
            while True:
                # 結果待ち
                try:
                    await asyncio.wait_for(
                        result_event.wait(),
                        timeout=1.0
                    )

                except asyncio.TimeoutError:
                    print("No response")
                    continue

                print("catched response: ", rx_buffer[:2])
                spike_id = rx_buffer[0]
                state = rx_buffer[1]

                my_stop = True if state & 1 == 1 else False
                all_stop = True if state & 2 == 2 else False

                # 走行中であればTrue, 停止中ならFalse
                spike_states[spike_id] = not (my_stop or all_stop)

                print("spike_id: ", spike_id, "running: ", spike_states[spike_id])
                result_event.clear()
                del rx_buffer[:2]

                await asyncio.sleep(0.1)

        print("Connected")

        await client.start_notify(
            PYBRICKS_COMMAND_EVENT_CHAR_UUID,
            handle_rx
        )

        print("SPIKE PRIMEの中央ボタンを押してください")

        # SPIKE側プログラムから rdy が来るまで待つ
        await ready_event.wait()
        ready_event.clear()

        successful = [200, 200, 200]
        await client.write_gatt_char(
            PYBRICKS_COMMAND_EVENT_CHAR_UUID,
            b"\x06" + bytes(successful),
            response=True
        )
        
        await asyncio.gather(reception(), transmission())

# main.pyから直接呼び出される関数たち
async def start():
    global communication_task

    communication_task = asyncio.create_task(
        communication_loop()
    )

async def stop():
    global communication_task

    if communication_task is not None:
        communication_task.cancel()

async def addCommand(robot_id, stop):
    await command_queue.put([1, robot_id, stop])

def getStates():
    return spike_states
