from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor
from pybricks.parameters import Button, Color, Direction, Port, Side, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait, StopWatch, run_task, multitask

hub = PrimeHub()

motor_drive = Motor(Port.C)
motor_direction = Motor(Port.D, Direction.COUNTERCLOCKWISE)
# ultrasonic_sensor = UltrasonicSensor(Port.F)
color_sesor = ColorSensor(Port.E)

angle_max = 270
angle_min = -270
SPEED_MAX = 400
speed = SPEED_MAX
target_angle = 0
p_gain = 0.58
i_gain = 0.0
d_gain = 10.0
angle_delta_max = 1000

brake_gain = 0.5
brake_delta = 0.001
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

distance_max = 300
distance_min = 100
# course_length = 4600

async def init():
    ringbuff_init()
    global angle_min, angle_max

    await wait(10)
    await motor_direction.run_target(100, 0, then=Stop.HOLD, wait=True)
    await wait(10)

async def linetrace():
    await init()
    ref_old = 0
    ref_total = 0
    angle = 0
    brake_now = 0.0
    while True:
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

        brake = brake_gain * abs(ref_now)
        brake_now += max(- brake_delta, min(brake_delta, brake - brake_now))
        speed_now = speed * (1 - brake_now)

        # motor_drive.run(speed - brake_now)
        motor_drive.run(speed_now)
        print(speed_now)

async def main():
    await linetrace()
    # await multitask(linetrace())
try:
    run_task(main())

except SystemExit:
    # 3秒以内を目指す
    while True:
        speed -= 10
        motor_drive.run(max(0, speed))
        angle = motor_direction.angle()
        if angle == 0:
            break
        elif angle > 0:
            motor_direction.run(-100)
        elif angle < 0:
            motor_direction.run(100)
