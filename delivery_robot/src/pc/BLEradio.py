import asyncio
from bleak import BleakScanner, BleakClient

PYBRICKS_COMMAND_EVENT_CHAR_UUID = (
    "c5f50002-8280-46da-89f4-6d8051e4aeef"
)

HUB_NAME = "prototype"


async def main():
    ready_event = asyncio.Event()
    result_event = asyncio.Event()

    rx_buffer = bytearray()

    def handle_rx(_, data: bytearray):
        # Pybricks stdout event
        if data[0] != 0x01:
            return

        payload = data[1:]

        print("RX raw:", payload)

        # 司令塔からの "rdy"
        if payload == b"rdy":
            ready_event.set()
            return

        # 計算結果
        rx_buffer.extend(payload)

        if len(rx_buffer) >= 2:
            result_event.set()

    print("Searching for SPIKE...")

    device = await BleakScanner.find_device_by_name(HUB_NAME)

    if device is None:
        print("SPIKE not found")
        return

    print("Found:", device.name)

    async with BleakClient(device) as client:
        print("Connected")

        await client.start_notify(
            PYBRICKS_COMMAND_EVENT_CHAR_UUID,
            handle_rx
        )

        # SPIKE側からrdyが来るまで待つ
        print("Waiting for ready...")

        await ready_event.wait()

        print("SPIKE is ready")

        # -----------------------
        # テストする値
        # -----------------------
        num = 9

        # 2 byte big endian
        payload = num.to_bytes(2, "big")

        print("Send:", num)

        # 0x06 = WRITE_STDIN
        await client.write_gatt_char(
            PYBRICKS_COMMAND_EVENT_CHAR_UUID,
            b"\x06" + payload,
            response=True
        )

        # 結果待ち
        try:
            await asyncio.wait_for(
                result_event.wait(),
                timeout=5.0
            )

        except asyncio.TimeoutError:
            print("Timeout: no response")
            return

        # 最初の2byteを整数に戻す
        result = int.from_bytes(
            rx_buffer[:2],
            "big"
        )

        print("Result:", result)


asyncio.run(main())