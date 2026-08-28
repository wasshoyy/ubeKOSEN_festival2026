from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor
from pybricks.parameters import Button, Color, Direction, Port, Side, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait, StopWatch, run_task, multitask

hub = PrimeHub()

motor_drive = Motor(Port.C)
motor_direction = Motor(Port.D)
ultrasonic_sensor = UltrasonicSensor(Port.F)
color_sesor = ColorSensor(Port.E)

angle_max = 120
angle_min = -180
SPEED_MAX = 200
speed = SPEED_MAX
target_angle = 0
p_gain = 0.4
i_gain = 0.05
d_gain = 0.02
angle_delta_max = 1000
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

async def check_front_distance():
    global speed
    # distance_old = 0
    while True:
        await wait(10)
        distance_now = max(distance_min, min(distance_max, await ultrasonic_sensor.distance()))
        speed = SPEED_MAX * (distance_now - distance_min) / (distance_max - distance_min)
        # distance_old = distance_now

async def init():
    ringbuff_init()
    global angle_min, angle_max
    motor_direction.reset_angle(0)

    await wait(10)
    angle_min = -90
    angle_max = 90
    await motor_direction.run_target(100, 0, then=Stop.HOLD, wait=True)
    await wait(10)

async def linetrace():
    await init()
    ref_old = 0
    ref_total = 0
    angle = 0
    while True:
        await wait(1)
        # print(motor_direction.angle())

        hsv = await color_sesor.hsv()
        reflection = float(hsv.v)
        d = ultrasonic_sensor.distance()

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

        # motor_drive.run(speed - brake_now)
        motor_drive.run(speed)

async def main():
    await multitask(linetrace(), check_front_distance())

run_task(main())