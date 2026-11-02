import asyncio
import httpx

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from communication import spike_ble


# Express側のSSEエンドポイント
EXPRESS_SSE_URL = "http://localhost:3000/api/robot/events"


async def receive_sse():
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "GET",
            EXPRESS_SSE_URL
        ) as response:

            response.raise_for_status()

            print("SSE接続成功")

            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    message = line[5:].strip()
                    data = json.loads(message)
                    
                    print(data)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("lifespan: start")

    await spike_ble.start()

    print("lifespan: spike_ble.start finished")

    app.state.sse_task = asyncio.create_task(receive_sse())

    yield

    print("lifespan: shutdown")

    app.state.sse_task.cancel()

    try:
        await app.state.sse_task
    except asyncio.CancelledError:
        pass

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


@app.get("/api/health")
async def root():
    return {"status": "running"}


class RobotCommand(BaseModel):
    robot_id: int
    stop: bool


@app.get("/api/states")
async def get_states():
    return spike_ble.getStates()


@app.post("/api/command")
async def commandRobot(command: RobotCommand):
    await spike_ble.addCommand(command.robot_id, command.stop)