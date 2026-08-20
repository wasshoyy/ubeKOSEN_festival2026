from pybricks.tools import wait
from usys import stdin, stdout
from uselect import poll

keyboard = poll()
keyboard.register(stdin)

async def reception():
    while True:
        # PC側に「受信可能」と知らせる
        stdout.buffer.write(b"rdy")

        # PCからのデータ待ち
        while not keyboard.poll(0):
            await wait(10)

        symbol = stdin.buffer.read(2)
        table_id = int.from_bytes(symbol)
        
        return True, table_id