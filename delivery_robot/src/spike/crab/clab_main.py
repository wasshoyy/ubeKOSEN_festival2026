from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor
from pybricks.parameters import Button, Color, Direction, Port, Side, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait, StopWatch, Matrix, run_task, multitask
from Ackermann import drive, exit, run, speed, set_target_length, reset_mileage, get_mileage
from BLEradio1 import communication, update_state, STATE, check_arrived_table, check_arrived_end, get_table_id

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
    Waiting_order = 0
    Ready = 1
    Running = 2
    Waiting_customer = 3
    Send_back = 5


state = State.Waiting_order

have_soup = False
async def check_soup():
    global have_soup
    while True:
        await wait(10)
        d = await ultrasonic_sensor.distance()
        have_soup = (d <= 100)
        """
        # デモ用
        if have_soup:
            hub.light.on(Color.RED)
        else:
            hub.light.on(Color.GREEN)
        """

async def main():
    global state
    hub.display.icon(SMILE)
    
    hub.display.icon(ONE)
    while True:
        table_id = get_table_id()
        if table_id is None:
            hub.display.off()
        else:
            hub.display.number(table_id)
        
        await wait(20)

        if state == State.Waiting_order:
            # PCからの席指定待ち状態
            hub.light.on(Color.VIOLET)
            run(False)
            reset_mileage()

            # response, table_id = await reception()
            # hub.display.number(table_id)
            
            # set_target_length(length_to_table(table_id))

            # if response == True:

            if table_id is not None:
                state = State.Ready
            else:
                await wait(100)
        elif state == State.Ready:
            # スープ載せられ待ち状態
            hub.light.on(Color.YELLOW)
            run(False)
            
            if have_soup == True and Button.CENTER in hub.buttons.pressed():
                state = State.Running
        elif state == State.Running:
            # ライントレースで配膳中
            hub.light.on(Color.BLUE)
            run(True)
            
            if check_arrived_table():
                state = State.Waiting_customer
        elif state == State.Waiting_customer:
            # お客さんのところまでたどり着き、返却され待ち状態
            hub.light.on(Color.YELLOW)
            run(False)

            if have_soup == False and Button.CENTER in hub.buttons.pressed():
                state = State.Send_back
        elif state == State.Send_back:
            # 帰宅中
            hub.light.on(Color.GREEN)
            run(True)
            
            if check_arrived_end():
                state = State.Waiting_order

async def multi():
    await multitask(main(), communication(), drive(), check_soup())
    # await multitask(communication(), drive(), check_soup())

try:
    run_task(multi())

except SystemExit:
    # 3秒以内を目指す
    exit()
