from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor
from pybricks.parameters import Button, Color, Direction, Port, Side, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait, StopWatch, run_task, multitask
from BLEradio1 import get_state, update_point, check_main_way, get_point_id_now, get_wait_front, get_all_stop, get_my_stop

hub = PrimeHub()
motor_drive = Motor(Port.A)
motor_direction = Motor(Port.C)
color_sensor = ColorSensor(Port.E)

running = False
arrive = False
stop = False
ready = True

drive_start = False

async def run(tf):
    global running, stop, drive_start

    stop = get_state()

    run_next = tf and ready and not stop and not arrive

    if running != run_next:
        print(
            "run:", tf,
            "ready:", ready,
            "stop:", stop,
            "arrive:", arrive,
            "wait_front:", get_wait_front()
        )
    
    if run_next and not running:
        running = True
        await wait(500)
        drive_start = True
    elif not run_next:
        drive_start = False
    
    running = run_next

angle_max = 120
angle_min = -180

"""
# 最高速度verのパラメータたち
SPEED_MAX = 1000
speed = SPEED_MAX
target_angle = 0
p_gain = 0.9
i_gain = 0.3
d_gain = 10.0
brake_gain = 100
brake_delta = 1
angle_delta_max = 10
"""

SPEED_MAX = 400
speed = SPEED_MAX
target_angle = 0
p_gain = 0.6
i_gain = 0.2
d_gain = 40.0
brake_gain = 100
brake_delta = 1
angle_delta_max = 5


BLACK = 20.0
WHITE = 60.0
target_reflection = (BLACK + WHITE) / 2.0

main_way = True

RINGBUFF_MAX = 30

def ringbuff_init():
    global ringbuff_idx, ringbuff
    ringbuff_idx = 0
    ringbuff = []
    for i in range(RINGBUFF_MAX):
        ringbuff.append(0)

def ringbuff_set(newdata):
    global ringbuff_idx, ringbuff
    ringbuff_idx = (ringbuff_idx + 1) % RINGBUFF_MAX
    ringbuff[ringbuff_idx] = newdata

def ringbuff_get(idx_offset):
    if -idx_offset >= RINGBUFF_MAX: return 0
    idx = (ringbuff_idx + idx_offset + RINGBUFF_MAX) % RINGBUFF_MAX
    return ringbuff[idx]

async def init():
    ringbuff_init()
    global angle_min, angle_max
    motor_direction.reset_angle(0)

    await wait(10)
    angle_min = (await motor_direction.run_until_stalled(-100))
    angle_max = (await motor_direction.run_until_stalled(100))

    zero_angle = ((angle_min + 73) + (angle_max - 55)) / 2
    await motor_direction.run_target(100, zero_angle, then=Stop.HOLD, wait=True)
    await wait(10)
    motor_direction.reset_angle(0)
    await wait(10)

def reset_pid():
    global ref_old, ref_total, angle

    ref_old = 0
    ref_total = 0
    angle = motor_direction.angle()

    ringbuff_init()

target_length = 6150
def set_target_length(length):
    global target_length
    target_length = length

mileage = 0.0
def reset_mileage():
    global mileage
    mileage = 0.0

def get_mileage():
    return mileage


ref_old = 0
ref_total = 0
angle = 0
brake_now = 0
drive_angle_old = 0

def linetrace(reflection):
    global ref_old, ref_total, angle, speed, brake_now, drive_angle_old, mileage, arrive

    # black <= reflection <= white

    ref_now = (reflection - target_reflection) / ((WHITE - BLACK) / 2.0)
    ref_diff = ref_old - ref_now
    ref_old = ref_now

    ringbuff_set(ref_now)
    ref_total += ref_now
    ref_total -= ringbuff_get(-(RINGBUFF_MAX-1))
        
    p = p_gain * ref_now
    i = i_gain * (ref_total / float(RINGBUFF_MAX))
    d = d_gain * ref_diff

    target_angle = p + i + d

    if target_angle < 0:
        target_angle *= abs(angle_min)
    else:
        target_angle *= abs(angle_max)
        
        
    target_angle = max(angle_min, min(angle_max, target_angle))

    angle += min(angle_delta_max, max(-angle_delta_max, target_angle - angle))
    # delta_angle = target_angle - motor_direction.angle()
    motor_direction.track_target(angle)


    if running:
        speed += min(1, max(-1, SPEED_MAX - speed))
    else:
        speed -= min(1, max(-1, speed))

    brake = brake_gain * abs(ref_now)
    brake_now += max(- brake_delta, min(brake_delta, brake - brake_now))

    if speed - brake_now > 0 and drive_start:
        motor_drive.run(speed - brake_now)
    else:
        motor_drive.run(0)
    # motor_drive.run(speed)

    drive_angle_now = motor_drive.angle()
    mileage += drive_angle_now - drive_angle_old
    drive_angle_old = drive_angle_now
    if mileage >= target_length:
        arrive = True

table_now = 0

def blue_func():
    global mileage, main_way
    d_table = 500
    set_target_length(100)

    # print("blue:", mileage, get_point_id_now(), main_way)

    if mileage >= d_table:
        update_point()
        main_way = check_main_way()
        print("changed:", get_point_id_now(), main_way)

    reset_mileage()

main_blue = Color(h=209, s=55, v=28)
sub_blue = Color(h=216, s=34, v=39)

async def drive():
    await init()

    on_blue = False
    was_blue = False

    hsv = await color_sensor.hsv(surface=True)
    diff_blue = abs(hsv.h - main_blue.h)
    if hsv.s >= 30 and diff_blue <= 30:
        on_blue = True
        was_blue = True
    else:
        raise SystemExit
    
    while True:
        await wait(1)

        if not running:
            await wait(10)
            motor_drive.stop()
            continue

        if get_wait_front():
            set_target_length(100)
        else:
            set_target_length(6150)

        hsv = await color_sensor.hsv(surface=True)

        # diff_red = abs(hsv.h - red.h) + abs(hsv.s - red.s)
        diff_blue = 0
                    
        if main_way:
            diff_blue = abs(hsv.h - main_blue.h)
            
            # hsvのvを反射率としてライントレースに用いる
            linetrace(hsv.v)
        else:
            diff_blue = abs(hsv.h - sub_blue.h)

            # hsvのsでライントレース
            linetrace((hsv.s - 50) * 2 / 3 + 40)
        
        if hsv.s >= 30 and diff_blue <= 30:
            on_blue = True
        else:
            on_blue = False
        
        if on_blue:
            blue_func()
        
        if not on_blue and was_blue:
            reset_pid()

        was_blue = on_blue
    
    motor_left.run(0)
    motor_right.run(0)

def exit():
    global speed
    # 3秒以内を目指す
    while True:
        speed -= SPEED_MAX / 100
        motor_drive.run(max(0, speed))
        angle = motor_direction.angle()
        if angle == 0:
            break
        elif angle > 0:
            motor_direction.run(-100)
        elif angle < 0:
            motor_direction.run(100)
