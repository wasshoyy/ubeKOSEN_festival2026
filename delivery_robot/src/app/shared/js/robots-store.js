// robots-store.js

const ROBOTS_KEY = "robots";

// 初期状態
const DEFAULT_ROBOTS = [
  { id: "0", name: "０号機", connected: true, running: false },
  { id: "1", name: "１号機", connected: true, running: false },
];

async function getRobots() {
  const saved_json = localStorage.getItem(ROBOTS_KEY);
  
  if (!saved_json) {
    saveRobots(DEFAULT_ROBOTS);
    return DEFAULT_ROBOTS;
  }

  const saved = JSON.parse(saved_json);

  const response = await fetch("/api/states");
  if (!response.ok) {
    throw new Error(`Failed to get states: ${response.status}`);
  }

  const states = await response.json();

  states.forEach((state, robotId) => {
    const robot = saved.find((r) => r.id === String(robotId));

    console.log("found robot: ", robot);   
    console.log("state: ", state);

    if(robot){
      robot.running = state;
    }
  });

  saveRobots(saved)
  
  return saved;
}

function saveRobots(robots) {
  localStorage.setItem(ROBOTS_KEY, JSON.stringify(robots));
}

// 命令ボタンが押された時
async function sendCommand(robotId) {
  const robots = await getRobots();
  const robot = robots.find((r) => r.id === robotId);

  if (!robot) return;

  await fetch("/api/command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      robot_id: robotId,
      stop: !robot.running
    })
  });

  saveRobots(robots);
}