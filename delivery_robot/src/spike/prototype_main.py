from pybricks.hubs import PrimeHub
from pybricks.pupdevices import UltrasonicSensor
from pybricks.parameters import Button, Color, Side, Port
from pybricks.tools import Matrix, wait, run_task, multitask
from linetrace import drive, change_velocity, run, reset_mileage, get_mileage, set_target_length
from BLEradio0 import communication, update_state, STATE, check_arrived_table, get_point_id_now
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
    
    hub.display.icon(ZERO)
    while True:
        hub.display.number(get_point_id_now())
        await wait(5)

        if state == State.Waiting_order:
            # PCからの席指定待ち状態
            hub.light.on(Color.VIOLET)
            await run(False)
            reset_mileage()

            # response, table_id = await reception()
            # hub.display.number(table_id)
            
            # set_target_length(length_to_table(table_id))

            # if response == True:

            state = State.Ready
        elif state == State.Ready:
            # スープ載せられ待ち状態
            hub.light.on(Color.YELLOW)
            await run(False)
            
            if have_soup == True and Button.CENTER in hub.buttons.pressed():
                state = State.Running
        elif state == State.Running:
            # ライントレースで配膳中
            hub.light.on(Color.BLUE)
            await run(True)
            
            if check_arrived_table():
                state = State.Waiting_customer
        elif state == State.Waiting_customer:
            # お客さんのところまでたどり着き、返却され待ち状態
            hub.light.on(Color.YELLOW)
            await run(False)
            reset_mileage()

            if have_soup == False and Button.CENTER in hub.buttons.pressed():
                state = State.Send_back
        elif state == State.Send_back:
            # 帰宅中
            hub.light.on(Color.GREEN)
            await run(True)
            
            if get_mileage() >= 3630:
                state = State.Instruction_wait

async def multi():
    await multitask(main(), communication(), drive(), change_velocity(), check_soup())
    # await multitask(communication(), drive(), check_soup())

run_task(multi())