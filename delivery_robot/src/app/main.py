from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from communication import spike_ble

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("lifespan: start")

    await spike_ble.start()

    print("lifespan: spike_ble.start finished")

    yield

    print("lifespan: shutdown")

    await spike_ble.stop()

app = FastAPI(lifespan=lifespan)

app.mount("/shared", StaticFiles(directory="shared"), name="shared")

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="management.html",
        context={
            "message": "Hello, FastAPI!"
        }
    )

class RobotCommand(BaseModel):
    robot_id: int
    stop: bool

@app.get("/api/states")
async def get_states():
    return spike_ble.getStates()

@app.post("/api/command")
async def commandRobot(command: RobotCommand):
    await spike_ble.addCommand(command.robot_id, command.stop)
