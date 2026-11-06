from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor
from pybricks.parameters import Button, Color, Direction, Port, Side, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait, StopWatch, Matrix, run_task, multitask
from Ackermann import drive, exit, run, speed, set_target_length, reset_mileage, get_mileage
from BLEradio1 import communication, update_state, STATE, check_arrived_table, check_arrived_end, get_table_id, set_table_id
from num import NUM
import course

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

ARROW = Matrix(
    [
        [0, 0, 100, 0, 0],
        [0, 100, 0, 0, 0],
        [100, 100, 100, 100, 100],
        [0, 100, 0, 0, 0],
        [0, 0, 100, 0, 0],
    ]
)

class State:
    Waiting_order = 0
    Ready = 1
    Running = 2
    Waiting_customer = 3
    Send_back = 5


state = State.Waiting_order

async def check_soup():
    d = await ultrasonic_sensor.distance()
    have_soup = (d <= 100)

    return have_soup

async def main():
    global state
    hub.display.icon(SMILE)
    
    hub.display.icon(NUM[1])

    pressed_button = False
    while True:
        table_id = get_table_id()
        """
        if table_id is None:
            hub.display.off()
        else:
            hub.display.number(table_id)
        """

        await wait(20)

        if state == State.Waiting_order:
            # PCからの席指定待ち状態
            hub.light.on(Color.VIOLET)
            await run(False)
            reset_mileage()

            table_id = 0
            on_left = False
            on_right = False
            while not Button.CENTER in hub.buttons.pressed():
                hub.display.icon(NUM[table_id])

                if Button.LEFT in hub.buttons.pressed():
                    if not on_left:
                        if table_id < course.TABLE_NUM - 1:
                            table_id += 1
                        on_left = True
                else:
                    on_left = False
                
                if Button.RIGHT in hub.buttons.pressed():
                    if not on_right:
                        if table_id > 0:
                            table_id -= 1
                        on_right = True
                else:
                    on_right = False

                await wait(10)
            
            pressed_button = True

            if table_id is not None:
                set_table_id(table_id)
                state = State.Ready
            else:
                await wait(100)
        elif state == State.Ready:
            hub.display.icon(NUM[table_id])
            # スープ載せられ待ち状態
            hub.light.on(Color.YELLOW)
            await run(False)
            
            if await check_soup() == True and (not pressed_button and Button.CENTER in hub.buttons.pressed()):
                state = State.Running

            pressed_button = Button.CENTER in hub.buttons.pressed()
        elif state == State.Running:
            hub.display.icon(SMILE)
            # ライントレースで配膳中
            hub.light.on(Color.BLUE)
            await run(True)
            
            if check_arrived_table():
                state = State.Waiting_customer
                hub.light.on(Color.GREEN)
        elif state == State.Waiting_customer:
            # お客さんのところまでたどり着き、返却され待ち状態
            await run(False)

            br = False
            while True:
                if not (await check_soup()):
                    hub.display.icon(ARROW)
                    for _ in range(10):
                        await wait(50)
                        if Button.CENTER in hub.buttons.pressed():
                            br = True
                    if br:
                        break
                    
                    hub.light.off()

                    for _ in range(10):
                        await wait(50)
                        if Button.CENTER in hub.buttons.pressed():
                            br = True
                    if br:
                        break
                    
                    hub.light.on(Color.GREEN)
                
                await wait(100)

            state = State.Send_back
        elif state == State.Send_back:
            hub.display.icon(SMILE)
            # 帰宅中
            hub.light.on(Color.BLUE)
            await run(True)
            
            if check_arrived_end():
                state = State.Waiting_order

async def multi():
    await multitask(main(), communication(), drive())

try:
    run_task(multi())

except SystemExit:
    # 3秒以内を目指す
    exit()
