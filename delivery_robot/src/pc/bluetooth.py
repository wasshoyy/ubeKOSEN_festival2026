# ../spike/bluetooth.pyとの連携用コード

import asyncio
from bleak import BleakScanner, BleakClient

PYBRICKS_COMMAND_EVENT_CHAR_UUID = (
    "c5f50002-8280-46da-89f4-6d8051e4aeef"
)

HUB_NAME = "prototype"


async def main():

    ready_event = asyncio.Event()

    def handle_rx(_, data: bytearray):
        # Pybricksのstdoutイベント
        if data[0] == 0x01:
            payload = data[1:]

            if payload == b"rdy":
                ready_event.set()
            else:
                print("SPIKE:", payload.decode())

    print("Searching for SPIKE PRIME...")

    device = await BleakScanner.find_device_by_name(HUB_NAME)

    if device is None:
        print("SPIKE PRIMEが見つかりません")
        return

    print("Found:", device.name)

    async with BleakClient(device) as client:

        print("Connected")

        await client.start_notify(
            PYBRICKS_COMMAND_EVENT_CHAR_UUID,
            handle_rx
        )

        print("SPIKE PRIMEの中央ボタンを押してください")

        # SPIKE側プログラムから rdy が来るまで待つ
        await ready_event.wait()
        ready_event.clear()
        
        num = int(input("送信するテーブルIDを入力してください："))

        print("Sending")

        await client.write_gatt_char(
            PYBRICKS_COMMAND_EVENT_CHAR_UUID,
            b"\x06" + num.to_bytes(2, "big"),
            response=True
        )

        await asyncio.sleep(2)


asyncio.run(main())