from pybricks.hubs import PrimeHub
from pybricks.parameters import Button, Color, Side
from pybricks.tools import Matrix, wait, run_task, multitask
from linetrace import linetrace, change_velocity
from bluetooth import reception

hub = PrimeHub()

hub.system.set_stop_button((Button.LEFT, Button.RIGHT))
# hub.system.set_stop_button(None)

hub.display.orientation(Side.LEFT)

SMILE = Matrix(
    [
        [0, 100, 0, 100, 0],
        [0, 100, 0, 100, 0],
        [0, 0, 0, 0, 0],
        [100, 0, 0, 0, 100],
        [0, 100, 100, 100, 0],
    ]
)

class State:
    Instruction_wait = 0
    Soup_wait = 1
    Run = 2
    Customer_wait = 3
    Turn = 4
    Send_back = 5

state = State.Instruction_wait

async def main():
    global state
    hub.display.icon(SMILE)
    while True:
        table_id = 0
        if state == State.Instruction_wait:
            # PCからの席指定待ち状態
            hub.light.on(Color.VIOLET)

            response, table_id = await reception()
            # hub.display.number(table_id)
            
            if response == True:
                state = State.Soup_wait
        elif state == State.Soup_wait:
            # スープ載せられ待ち状態
            hub.light.on(Color.YELLOW)
            
            if Button.CENTER in hub.buttons.pressed():
                state = State.Run
        elif state == State.Run:
            # ライントレースで配膳中
            hub.light.on(Color.BLUE)
            
            await multitask(change_velocity(), linetrace())
            
            state = State.Customer_wait
        elif state == State.Customer_wait:
            # お客さんのところまでたどり着き、返却され待ち状態
            hub.light.on(Color.YELLOW)

            if Button.CENTER in hub.buttons.pressed():
                state = State.Turn
        elif state == State.Turn:
            # 帰宅レーンに移動中
            hub.light.on(Color.RED)
            
            # 今は仮でライントレース
            await multitask(change_velocity(), linetrace())
            
            state = State.Send_back
        elif state == State.Send_back:
            # 帰宅中
            hub.light.on(Color.GREEN)
            
            await multitask(change_velocity(), linetrace())
            
            state = State.Instruction_wait

run_task(main())