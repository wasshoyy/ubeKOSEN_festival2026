from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor
from pybricks.parameters import Direction, Port
from pybricks.tools import wait

# 左モーターは半時計回り
motor_left = Motor(Port.A, Direction.COUNTERCLOCKWISE)
motor_right = Motor(Port.E)
color_sesor = ColorSensor(Port.B)
ultrasonic_sensor = UltrasonicSensor(Port.C)

p_gain = 12
# d_gain = 50
brake_gain = 3
speed = 0
mileage = 0.0
ref_target = 40

speed_max = 300

async def accel(sgn):
    global speed
    acc_time = 100
    i = 0
    while i < acc_time:
        await wait(10)
        speed += sgn * (speed_max / acc_time)
        i += 1
    if sgn == 1: speed = speed_max
    if sgn == -1: speed = 0

distance_max = 200
distance_min = 60
course_length = 5300

async def check_front_distance():
    global speed
    # distance_old = 0
    while mileage < course_length:
        await wait(10)
        distance_now = max(distance_min, min(distance_max, await ultrasonic_sensor.distance()))
        speed = speed_max * (distance_now - distance_min) / (distance_max - distance_min)
        # distance_old = distance_now

async def change_velocity():
    await accel(1)
    await check_front_distance()
    await accel(-1)

async def linetrace():
    global mileage
    mileage = 0
    ref_old = 0
    while speed == 0:
        await wait(10)
    while speed != 0:
        await wait(0.5)
        ref_now = (await color_sesor.reflection()) - ref_target
        ref_diff = ref_now - ref_old

        pwm = p_gain * ref_now
        # pwm += d_gain * ref_diff

        brake = abs(brake_gain * ref_now)

        left_speed = int(max(-30, speed - brake + pwm))
        right_speed = int(max(-30, speed - brake - pwm))
        mileage += (left_speed + right_speed) / (2 * 2 * 1000)
        
        motor_left.run(left_speed)
        motor_right.run(right_speed)
        ref_old = ref_now
    motor_left.run(0)
    motor_right.run(0)
