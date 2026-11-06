import asyncio
import pb_client

from pb_client.stdio import Output


HUB_NAME = "command_center"

SPIKE_NUM = 2

RECONNECT_INTERVAL = 3


class SIGNAL_TYPE:
    STOP = 0
    ASSIGN = 1
    MOVE_RESPONSE = 2
    READY = 3


# 各SPIKEの[connected, running]
spike_states = [
    [False, False]
    for _ in range(SPIKE_NUM)
]

assigned_table = [None for _ in range(SPIKE_NUM)]

spike_commands = [False for _ in range(SPIKE_NUM)]

communication_task = None


async def communication_loop():

    while True:

        try:
            print("Searching for SPIKE PRIME via USB...")

            async with pb_client.connect() as pb:

                hub = await pb.connect_hub(
                    name=HUB_NAME,
                    transport="usb"
                )

                print(
                    "Connected:",
                    hub.name,
                    hub.firmware,
                    hub.transport
                )

                await communication_session(pb, hub)

        except asyncio.CancelledError:
            raise

        except Exception as e:
            print("USB communication error:", repr(e))

            # 切断時は接続状態をリセット
            for i in range(SPIKE_NUM):
                spike_states[i] = [False, False]

            print(
                f"Retrying in {RECONNECT_INTERVAL} seconds..."
            )

            await asyncio.sleep(RECONNECT_INTERVAL)


async def communication_session(pb, hub):

    ready_event = asyncio.Event()

    rx_buffer = bytearray()

    async def handle_output(data):

        rx_buffer.extend(data)

        while True:

            # rdyを検索
            ready_index = rx_buffer.find(b"rdy")

            # 200をパケット先頭として検索
            packet_index = rx_buffer.find(b"\xc8")

            # =========================
            # 初期接続確認
            # =========================

            if (
                ready_index != -1
                and (
                    packet_index == -1
                    or ready_index < packet_index
                )
            ):

                del rx_buffer[:ready_index + 3]

                ready_event.set()

                continue

            # =========================
            # 状態通知
            # =========================

            if packet_index != -1:

                if packet_index > 0:
                    del rx_buffer[:packet_index]

                # 5バイト揃うまで待つ
                if len(rx_buffer) < 5:
                    break

                packet = bytes(rx_buffer[:5])

                del rx_buffer[:5]

                if packet[0] != 200:
                    continue

                spike_id = packet[1]

                if spike_id >= SPIKE_NUM:
                    continue

                connected = packet[2] == 1

                state = packet[3]

                running = packet[4] == 0

                spike_states[spike_id] = [
                    connected,
                    running
                ]

                print(
                    "spike_id:",
                    spike_id,
                    "connected:",
                    connected,
                    "running:",
                    running
                )

                continue

            # =========================
            # 不要な文字列を破棄
            # =========================

            # rdyが分割されて届く場合に備えて
            # 最後の2バイトだけ残す
            if len(rx_buffer) > 2:
                del rx_buffer[:-2]

            break


    async def reception():

        async with pb.attach(hub_id=hub.id) as events:

            async for event in events:

                if isinstance(event, Output):

                    await handle_output(event.data)

        raise ConnectionError(
            "SPIKE output stream disconnected"
        )


    async def transmission():

        while True:

            # =========================
            # STOP
            # =========================

            for robot_id in range(SPIKE_NUM):
                stop = 1 if spike_commands[robot_id] else 0
                
                command = bytes([
                    SIGNAL_TYPE.STOP,
                    robot_id,
                    stop
                ])

                await pb.write_stdin(
                    command,
                    hub_id=hub.id
                )

                await asyncio.sleep(0.1)


            # =========================
            # ASSIGN
            # =========================

            for robot_id in range(SPIKE_NUM):

                if assigned_table[robot_id] is None:
                    continue

                print(
                    "ASSIGN:",
                    "table_id:", assigned_table[robot_id],
                    "robot_id", robot_id
                )

                command = bytes([
                    SIGNAL_TYPE.ASSIGN,
                    robot_id,
                    assigned_table[robot_id]
                ])

                await pb.write_stdin(
                    command,
                    hub_id=hub.id
                )

                await asyncio.sleep(0.1)


    # =========================
    # 通信開始
    # =========================

    print("Waiting for SPIKE program...")

    receiver_task = asyncio.create_task(
        reception()
    )

    ready_wait_task = asyncio.create_task(
        ready_event.wait()
    )

    sender_task = None

    try:

        # rdyを受信するか、切断されるまで待つ
        done, _ = await asyncio.wait(
            [receiver_task, ready_wait_task],
            return_when=asyncio.FIRST_COMPLETED
        )

        if receiver_task in done:
            await receiver_task

        # 初期接続確認を送信
        await pb.write_stdin(
            bytes([200, 200, 200]),
            hub_id=hub.id
        )

        print("SPIKE communication initialized")

        sender_task = asyncio.create_task(
            transmission()
        )

        # どちらかの通信タスクが終了したら
        # セッションを終了して再接続する
        done, _ = await asyncio.wait(
            [receiver_task, sender_task],
            return_when=asyncio.FIRST_COMPLETED
        )

        for task in done:
            await task

        raise ConnectionError(
            "Communication task stopped"
        )

    finally:

        tasks = [
            receiver_task,
            ready_wait_task,
            sender_task
        ]

        for task in tasks:
            if task is not None and not task.done():
                task.cancel()

        await asyncio.gather(
            *[
                task for task in tasks
                if task is not None
            ],
            return_exceptions=True
        )


# =================================
# main.pyから直接呼び出される関数
# =================================

async def start():

    global communication_task

    if (
        communication_task is not None
        and not communication_task.done()
    ):
        return

    communication_task = asyncio.create_task(
        communication_loop()
    )


async def stop():

    global communication_task

    if communication_task is not None:

        communication_task.cancel()

        try:
            await communication_task

        except asyncio.CancelledError:
            pass

        communication_task = None


def addCommand(robot_id, stop):

    global spike_commands

    spike_commands[robot_id] = not stop

    print(
        "robot_id:", robot_id,
        "stop:",  stop
    )


def getStates():

    return spike_states

def assignment(robot_id, table_id):

    global assigned_table

    assigned_table[robot_id] = table_id

    print("assignment() called")
    print("assigned_table:", assigned_table)