// robots-store.js

const ROBOTS_KEY = "robots";

// 初期状態
const DEFAULT_ROBOTS = [
  { id: "R1", name: "１号機", connected: false, running: false, command: false},
  { id: "R2", name: "２号機", connected: true, running: false,command: false },
  { id: "R3", name: "３号機", connected: true, running: true,command: false },
];

function getRobots() {
  const saved = localStorage.getItem(ROBOTS_KEY);

  if (!saved) {
    saveRobots(DEFAULT_ROBOTS);
    return DEFAULT_ROBOTS;
  }

  return JSON.parse(saved);
}

function saveRobots(robots) {
  localStorage.setItem(ROBOTS_KEY, JSON.stringify(robots));
}

// 命令ボタンが押された時
function sendCommand(robotId) {
  const robots = getRobots();
  const robot = robots.find((r) => r.id === robotId);

  if (!robot) return;

  robot.command = !robot.command;
  saveRobots(robots);
}