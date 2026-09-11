from pybricks.tools import wait, run_task
from pybricks.messaging import BLERadio 

class SIGNAL_TYPE:
    ALL = 0
    TASK = 1
    STATE = 2
    # POLL = 3

MY_SPIKE_ID = 1

radio = BLERadio(broadcast_channel=MY_SPIKE_ID, observe_channels=[255])

table_id = None
current_command_id = None

all_stop = False
my_stop = False

def get_state():
    """
    if all_stop or my_stop:
        hub.light.on(Color.RED)
        hub.display.icon(Icon.PAUSE)
    else:
        hub.light.on(Color.GREEN)
        hub.display.icon(Icon.TRIANGLE_RIGHT)
    """
    return all_stop or my_stop

def all_command(on_off):
    global all_stop

    if on_off == 0:
        all_stop = True
    elif on_off == 1:
        all_stop = False

def task_command(on_off):
    global my_stop

    if on_off == 0:
        my_stop = True
    elif on_off == 1:
        my_stop = False

"""
async def set_table_id(new_id):
    global table_id
    table_id = new_id

    return True
"""

async def reception():
    # global table_id, current_command_id
    while True:
        """
        if table_id is not None:
            hub.display.number(table_id)
            await radio.broadcast(current_command_id)
        """

        data = None
        while data is None:
            data = radio.observe(255)
            await wait(10)
    
        syg_type = data[0]
        spike_id = data[1]
        option = data[2]
    
        if syg_type == SIGNAL_TYPE.ALL:
            all_command(option)
            # current_command_id = command_id
        elif syg_type == SIGNAL_TYPE.TASK and spike_id == MY_SPIKE_ID:
            print("received:", option)
            task_command(option)
            # current_command_id = command_id
        
        state = 0
        if my_stop:
            state += 1
        if all_stop:
            state += 2
        
        await radio.broadcast(state)
        await wait(10)
