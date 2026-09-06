// management.js

const tbody = document.getElementById("management-table-body");

function renderRobots() {
  const robots = getRobots();
  tbody.innerHTML = "";

  robots.forEach((robot) => {
    const row = document.createElement("tr");

    // 接続状態
    const connText = robot.connected? `<span class="lab-conn-dot connected"></span>接続中`: `<span class="lab-conn-dot"></span>未接続`;

    // 走行状態
    const stateText = robot.running ? "走行中" : "停止中";

    // 命令ボタン
    const commandLabel = robot.command ? "走行停止" : "走行開始";

    row.innerHTML = `
      <td>${robot.name}</td>
      <td>${connText}</td>
      <td>${stateText}</td>
      <td>
        <button
          class="lab-status-btn ${robot.running ? "done" : ""}"
          data-id="${robot.id}"
          ${robot.connected ? "" : "disabled"}
        >
          ${commandLabel}
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}


// ---- 命令ボタン: 押すとそのロボットに開始/停止を送る----
tbody.addEventListener("click", (e) => {
  const btn = e.target.closest(".lab-status-btn");
  if (!btn || btn.disabled) return; // 未接続で押せないボタンなら何もしない

  sendCommand(btn.dataset.id);
  renderRobots();
});

renderRobots();

// 他のタブでロボットの状態が変わった時？画面にも反映？？？
window.addEventListener("storage", (e) => {
  if (e.key === "robots") {
    renderRobots();
  }
});
