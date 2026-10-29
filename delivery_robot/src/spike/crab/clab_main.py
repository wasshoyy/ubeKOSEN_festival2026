from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor
from pybricks.parameters import Button, Color, Direction, Port, Side, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait, StopWatch, Matrix, run_task, multitask
from Ackermann import linetrace, exit, run, speed, set_target_length, reset_mileage, get_mileage
from BLEradio1 import reception

hub = PrimeHub()

ultrasonic_sensor = UltrasonicSensor(Port.D)

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

#デモ用
ONE = Matrix(
    [
        [0, 0, 100, 0, 0],
        [0, 100, 100, 0, 0],
        [0, 0, 100, 0, 0],
        [0, 0, 100, 0, 0],
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
    run(True)
    
    # デモ用
    hub.display.icon(ONE)
    while True:
        await wait(1)

        run(True)
        reset_mileage()

        """
        table_id = 0
        if state == State.Instruction_wait:
            # PCからの席指定待ち状態
            hub.light.on(Color.VIOLET)
            run(False)
            reset_mileage()

            # response, table_id = await reception()
            # hub.display.number(table_id)
            
            set_target_length(6150)

            # if response == True:
            await wait(1000)
            state = State.Soup_wait
        elif state == State.Soup_wait:
            # スープ載せられ待ち状態
            hub.light.on(Color.YELLOW)
            run(False)
            
            if have_soup == True and Button.CENTER in hub.buttons.pressed():
                state = State.Run
        elif state == State.Run:
            # ライントレースで配膳中
            hub.light.on(Color.BLUE)
            run(True)
            
            # await multitask(change_velocity(), linetrace())
            
            if get_mileage() >= 6150:
                state = State.Customer_wait
        elif state == State.Customer_wait:
            # お客さんのところまでたどり着き、返却され待ち状態
            hub.light.on(Color.YELLOW)
            run(False)
            reset_mileage()

            if have_soup == False and Button.CENTER in hub.buttons.pressed():
                state = State.Turn
        elif state == State.Turn:
            # 帰宅レーンに移動中
            hub.light.on(Color.RED)
            run(True)

            # 今は仮でライントレース
            # await multitask(change_velocity(), linetrace())
            
            state = State.Send_back
        elif state == State.Send_back:
            # 帰宅中
            hub.light.on(Color.GREEN)
            run(True)

            # await multitask(change_velocity(), linetrace())
            
            if get_mileage() >= 6150:
                state = State.Instruction_wait
        """

async def multi():
    await multitask(main(), reception(), linetrace(), check_soup())
    # await multitask(reception(), linetrace(), check_soup())

try:
    run_task(multi())

except SystemExit:
    # 3秒以内を目指す
    exit()
