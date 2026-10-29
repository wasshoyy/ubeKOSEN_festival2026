from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Direction, Port, Color
from pybricks.tools import wait
from BLEradio0 import get_state

# 左モーターは半時計回り
motor_left = Motor(Port.A, Direction.COUNTERCLOCKWISE)
motor_right = Motor(Port.E)
color_sesor = ColorSensor(Port.B)

"""
# 全然ライントレースはできていないが、最高速度verのパラメータたち
p_gain = 6.5
# d_gain = 50
brake_gain = 0.02
brake_delta = 100
speed_max = 800
"""

p_gain = 5
# d_gain = 50
brake_gain = 0.05
brake_delta = 0.0001
speed_max = 420

speed = 0
ref_target = 30

async def accel(sgn):
    global speed
    acc_time = 100
    i = 0
    while i < acc_time:
        await wait(10)
        speed += sgn * (speed_max / acc_time)
        i += 1
        if speed > speed_max or speed < 0:
            break
    if sgn == 1:
        speed = speed_max
    if sgn == -1:
        speed = 0

running = False
arrive = False
stop = False

async def run(tf):
    global running
    run_next = tf and not (arrive or stop)
    if running != run_next:
        running = run_next
        await accel(1 if run_next == True else -1)

target_length = 3630
def set_target_length(length):
    global target_length
    target_length = length

async def change_velocity():
    global speed, arrive, stop
    while True:
        await wait(10)
        if abs(target_length - mileage) <= 500:
            speed = target_length - mileage + 30
        arrive = (mileage >= target_length)
        stop = get_state()

mileage = 0.0
def reset_mileage():
    global mileage
    mileage = 0.0

def get_mileage():
    return mileage

ref_old = 0
brake_now = 0
left_angle_old = 0
right_angle_old = 0

def linetrace(reflection):
    global mileage, ref_old, brake_now, left_angle_old, right_angle_old

    ref_now = reflection - ref_target
    # ref_diff = ref_now - ref_old

    pwm = p_gain * ref_now
    # pwm += d_gain * ref_diff

    brake = brake_gain * abs(ref_now)
    brake_now += max(- brake_delta, min(brake_delta, brake - brake_now))
    speed_now = speed * (1 - brake_now)

    left_speed = int(max(0, speed_now + pwm))
    right_speed = int(max(0, speed_now - pwm))

    motor_left.run(left_speed)
    motor_right.run(right_speed)

    left_angle_now = motor_left.angle()
    right_angle_now = motor_right.angle()

    mileage += ((left_angle_now - left_angle_old) + (right_angle_now - right_angle_old)) / 2

    ref_old = ref_now
    left_angle_old = left_angle_now
    right_angle_old = right_angle_now

table_now = 0

def red_func():
    global mileage, table_now
    d_table = 450
    if mileage >= d_table:
        table_now += 1
    reset_mileage()

def blue_func():
    global mileage, table_now
    d_table = 450
    if mileage >= d_table:
        table_now += 1
    reset_mileage()

red = Color(h=354, s=87, v=38)
blue = Color(h=218, s=49, v=14)

async def drive():
    on_red = False
    on_blue = False
    while True:
        await wait(0.5)

        if not running:
            await wait(10)
            motor_left.run(0)
            motor_right.run(0)
            continue

        hsv = await color_sesor.hsv(surface=True)

        diff_red = abs(hsv.h - red.h) + abs(hsv.s - red.s) + abs(hsv.v - red.v)
        diff_blue = abs(hsv.h - blue.h) + abs(hsv.s - blue.s) + abs(hsv.v - blue.v)

        if diff_red <= 30:
            on_red = True
        else:
            on_red = False
        
        if diff_blue <= 30:
            on_blue = True
        else:
            on_blue = False
        
        if not (on_red or on_blue):
            # hsvのvを反射率としてライントレースに用いる
            linetrace(hsv.v)
        elif on_red:
            red_func()
        elif on_blue:
            blue_func()
    
    motor_left.run(0)
    motor_right.run(0)
