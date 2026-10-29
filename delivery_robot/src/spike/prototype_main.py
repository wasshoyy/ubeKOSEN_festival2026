from pybricks.hubs import PrimeHub
from pybricks.pupdevices import UltrasonicSensor
from pybricks.parameters import Button, Color, Side, Port
from pybricks.tools import Matrix, wait, run_task, multitask
from linetrace import drive, change_velocity, run, reset_mileage, get_mileage, set_target_length
from BLEradio0 import reception
# from measure import localization

hub = PrimeHub()

ultrasonic_sensor = UltrasonicSensor(Port.C)

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

ZERO = Matrix(
    [
        [0, 100, 100, 100, 0],
        [0, 100, 0, 100, 0],
        [0, 100, 0, 100, 0],
        [0, 100, 0, 100, 0],
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

have_soup = False
async def check_soup():
    global have_soup
    while True:
        await wait(10)
        d = await ultrasonic_sensor.distance()
        have_soup = (d <= 100)
        # デモ用
        if have_soup:
            hub.light.on(Color.RED)
        else:
            hub.light.on(Color.GREEN)

async def main():
    global state
    hub.display.icon(SMILE)
    
    hub.display.icon(ZERO)
    while True:
        await wait(2)
        
        await run(True)
        await wait(1000)
        m = get_mileage()
        print(m)

        """
        table_id = 0
        if state == State.Instruction_wait:
            # PCからの席指定待ち状態
            hub.light.on(Color.VIOLET)
            await run(False)
            reset_mileage()

            # response, table_id = await reception()
            # hub.display.number(table_id)
            
            # set_target_length(length_to_table(table_id))
            set_target_length(3630)

            # if response == True:
            await wait(1000)
            state = State.Soup_wait
        elif state == State.Soup_wait:
            # スープ載せられ待ち状態
            hub.light.on(Color.YELLOW)
            await run(False)
            
            if have_soup == True and Button.CENTER in hub.buttons.pressed():
                state = State.Run
        elif state == State.Run:
            # ライントレースで配膳中
            hub.light.on(Color.BLUE)
            await run(True)
            
            if get_mileage() >= 3630:
                state = State.Customer_wait
        elif state == State.Customer_wait:
            # お客さんのところまでたどり着き、返却され待ち状態
            hub.light.on(Color.YELLOW)
            await run(False)
            reset_mileage()

            if have_soup == False and Button.CENTER in hub.buttons.pressed():
                state = State.Turn
        elif state == State.Turn:
            # 帰宅レーンに移動中
            hub.light.on(Color.RED)
            await run(True)
            
            # 仮で何もせず次の状態へ
            state = State.Send_back
        elif state == State.Send_back:
            # 帰宅中
            hub.light.on(Color.GREEN)
            await run(True)
            
            if get_mileage() >= 3630:
                state = State.Instruction_wait
        """

async def multi():
    await multitask(main(), reception(), drive(), change_velocity(), check_soup())
    # await multitask(reception(), drive(), check_soup())

run_task(multi())