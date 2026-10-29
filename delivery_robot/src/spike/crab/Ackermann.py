from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor
from pybricks.parameters import Button, Color, Direction, Port, Side, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait, StopWatch, run_task, multitask
from BLEradio1 import get_state, reception

motor_drive = Motor(Port.A)
motor_direction = Motor(Port.C)
color_sesor = ColorSensor(Port.E)

running = False

def run(tf):
    global running
    running = tf

angle_max = 120
angle_min = -180

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
angle_delta_max = 3

"""

black = 20.0
white = 60.0
target_reflection = (black + white) / 2.0

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

async def linetrace():
    global speed, mileage, running
    await init()
    ref_old = 0
    ref_total = 0
    angle = 0
    brake_now = 0
    drive_angle_old = 0
    while True:
        while get_state():
            motor_drive.run(0)
            await wait(100)
        
        await wait(1)
        # print(motor_direction.angle())

        hsv = await color_sesor.hsv()
        reflection = float(hsv.v)

        # black <= reflection <= white
        reflection = max(black, min(white, reflection))

        ref_now = (reflection - target_reflection) / ((white - black) / 2.0)
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
            speed += min(5, max(-5, SPEED_MAX - speed))
        else:
            speed -= min(5, max(-5, speed))

        brake = brake_gain * abs(ref_now)
        brake_now += max(- brake_delta, min(brake_delta, brake - brake_now))

        if speed - brake_now > 0:
            motor_drive.run(speed - brake_now)
        else:
            motor_drive.run(0)
        # motor_drive.run(speed)

        drive_angle_now = motor_drive.angle()
        mileage += drive_angle_now - drive_angle_old
        drive_angle_old = drive_angle_now
        if mileage >= target_length:
            running = False

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
