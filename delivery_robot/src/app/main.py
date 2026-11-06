import asyncio
import httpx
import json

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

            event_type = None
            data = []

            async for line in response.aiter_lines():
                # イベントの終端
                if line == "":
                    if event_type is not None:
                        message = "\n".join(data)
                        payload = json.loads(message) if message else {}

                        # イベントの種類によって処理を分岐
                        if event_type == "assignment":
                            robot_id = payload["robot_id"]
                            order_id = payload["order_id"]
                            table_id = payload["table_id"]
                            
                            print("robot_id:", robot_id)
                            print("order_id:", order_id)
                            print("table_id:", table_id)

                            spike_ble.assignment(robot_id, table_id)

                        elif event_type == "ready":
                            print("準備完了:", payload)
                    event_type = None
                    data = []
                    continue

                # イベントの種類
                if line.startswith("event:"):
                    event_type = line[6:].strip()

                # データ
                elif line.startswith("data:"):
                    data.append(line[5:].strip())


async def updateStatus():
    async with httpx.AsyncClient(timeout=None) as client:
        response = await client.put(
            "http://localhost:3000/api/robot/status",
            json={
                "robot_id": 0,
                "connection": "connected",
                "status": "Running"
            }
        )
        
        print(response.status_code)
        print(response.text)


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


class RobotCommand(BaseModel):
    robot_id: int
    stop: bool


@app.get("/api/states")
async def get_states():
    return spike_ble.getStates()


@app.post("/api/command")
async def commandRobot(command: RobotCommand):
    spike_ble.addCommand(command.robot_id, command.stop)
