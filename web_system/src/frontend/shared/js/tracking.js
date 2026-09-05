// tracking.js
// トラッキング画面(注文完了〜配膳待ち)の動作。
// 左上のステータス切り替え：仮の演出。

const cart = JSON.parse(sessionStorage.getItem("cart") || "{}");
const orderInfo = JSON.parse(sessionStorage.getItem("orderInfo") || "null");
// 注文情報とかは sessionStorage へ保存した cart / orderInfo を読み込んで表示する。


// ---- 右上：注文情報を埋める ----
function renderOrderInfo() {
  let totalPrice = 0;
  Object.entries(cart).forEach(([itemId, qty]) => {
    const item = menuItems.find((i) => i.id === itemId);
    if (item) totalPrice += item.price * qty;//合計金額
  });

  // 注文番号・席番号はまだサーバー/席自動割当が実装されてないのでダミー
  const orderId = "RQ-001";
  document.getElementById("order-id").textContent = orderId;
  document.getElementById("order-seat").textContent =
    orderInfo && orderInfo.method === "eatin" ? "PT-01" : "テイクアウト";
  document.getElementById("order-price").textContent = `¥${totalPrice}`;
  document.getElementById("order-time").textContent = new Date().toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // result.html でも同じ注文番号・金額を表示したいので保存
  sessionStorage.setItem("orderId", orderId);
  sessionStorage.setItem("orderTotal", String(totalPrice));
}

// ---- 左上：ステータス表示の切り替え ----
function setStatus(state) {
  const cell = document.getElementById("status-cell");
  const icon = document.getElementById("status-icon");
  const text = document.getElementById("status-text");

  if (state === "waiting") {
    cell.classList.add("warning");
    icon.textContent = "⚠";
    text.textContent = "もうすぐ注文が来ます";
  } else {
    cell.classList.remove("warning");
    icon.textContent = "✓";
    text.textContent = "注文完了";
  }
}

// 今は5秒後に「ロボットが動き始めた」状態に切り替える
// 実装時はここを、ロボットからのステータス通知を受け取る処理に
setTimeout(() => setStatus("waiting"), 5000);

// ---- ロボットが帰還ボタンを押されたら、この画面もresult.htmlへ切り替える ----
// 今は一定時間後に自動遷移させている。
// 実装時はこの setTimeout ごと削除し、ポーリングで受け取ったステータスが"returned"(帰還開始)になった時点で同じ window.location.href を呼ぶ形に置き換える。
setTimeout(() => {
  window.location.href = "result.html";
}, 11000);

// ---- 左下：タイプされていく、意味のないコード演出 ----
function buildFakeCode() {
  // text: タイプする時に表示するプレーンテキスト
  // html: タイプし終わった瞬間に差し替える、色付き版
  const lines = [
    { text: `int main(void) {`, html: `<span class="kw">int</span> <span class="fn">main</span>(<span class="kw">void</span>) {` },
    { text: `  int temp = read_sensor();`, html: `  <span class="kw">int</span> temp = <span class="fn">read_sensor</span>();` },
    { text: `  if (temp > 60) {`, html: `  <span class="kw">if</span> (temp &gt; 60) {` },
    { text: `    cool_down();`, html: `    <span class="fn">cool_down</span>();` },
    { text: `  }`, html: `  }` },
    { text: `  while (dock != true) {`, html: `  <span class="kw">while</span> (dock != <span class="kw">true</span>) {` },
    { text: `    move_forward(1);`, html: `    <span class="fn">move_forward</span>(1);` },
    { text: `    check_tilt();`, html: `    <span class="fn">check_tilt</span>();` },
    { text: `  }`, html: `  }` },
    { text: `  printf("arrived");`, html: `  <span class="fn">printf</span>(<span class="kw">"arrived"</span>);` },
    { text: `  return 0;`, html: `  <span class="kw">return</span> 0;` },
    { text: `}`, html: `}` },
    { text: ``, html: `` },
    { text: `float calibrate_temp(float raw) {`, html: `<span class="kw">float</span> <span class="fn">calibrate_temp</span>(<span class="kw">float</span> raw) {` },
    { text: `  float offset = read_offset();`, html: `  <span class="kw">float</span> offset = <span class="fn">read_offset</span>();` },
    { text: `  if (raw - offset < 0) {`, html: `  <span class="kw">if</span> (raw - offset &lt; 0) {` },
    { text: `    offset = 0;`, html: `    offset = 0;` },
    { text: `  }`, html: `  }` },
    { text: `  return raw - offset;`, html: `  <span class="kw">return</span> raw - offset;` },
    { text: `}`, html: `}` },
    { text: ``, html: `` },
    { text: `void on_dock_reached(int pt) {`, html: `<span class="kw">void</span> <span class="fn">on_dock_reached</span>(<span class="kw">int</span> pt) {` },
    { text: `  stabilize(pt);`, html: `  <span class="fn">stabilize</span>(pt);` },
    { text: `  notify_server("docked");`, html: `  <span class="fn">notify_server</span>(<span class="kw">"docked"</span>);` },
    { text: `}`, html: `}` },
  ];

  const container = document.getElementById("code-scroll");
  const charInterval = 22; // 1文字あたりの間隔(ms)。小さくするほど速く打つ
  const linePause = 160; // 1行打ち終えてから次の行に移るまでの間(ms)

  let lineIndex = 0;

  function typeLine() {
    const line = lines[lineIndex % lines.length];// ループし続けるよう、末尾まで行ったら最初の行に戻る
    lineIndex += 1;

    const lineEl = document.createElement("div");
    const cursor = document.createElement("span");
    cursor.className = "code-cursor";
    cursor.textContent = "▌";
    lineEl.appendChild(cursor);
    container.appendChild(lineEl);

    // 空行はタイプせず、そのまま一瞬で確定する
    if (line.text === "") {
      lineEl.innerHTML = "";
      trimOldLines();
      setTimeout(typeLine, linePause);
      return;
    }

    let charIndex = 0;

    function typeChar() {
      charIndex += 1;
      lineEl.textContent = line.text.slice(0, charIndex);
      lineEl.appendChild(cursor);

      if (charIndex < line.text.length) {
        setTimeout(typeChar, charInterval);
      } else {
        // 行が完成したら、色付き版に差し替えてカーソルを消す
        lineEl.innerHTML = line.html;
        trimOldLines();
        setTimeout(typeLine, linePause);
      }
    }

    typeChar();
  }

  // 表示エリアからはみ出た古い行を消していく(残し続けるとDOMが増え続けてしまうため)
  function trimOldLines() {
    while (container.children.length > 40) {
      container.removeChild(container.firstChild);
    }
  }

  typeLine();
}


renderOrderInfo();
buildFakeCode();
buildTempGraph();


// ---- 左下：温度が目標値付近で揺れ続ける折れ線グラフ(演出のみ) ----
function buildTempGraph() {
  const target = 60; // 目標温度
  const maxPoints = 24; // グラフに表示する点の数
  const graphWidth = 200;
  const graphHeight = 40;

  // 最初は全部target(目標値)で埋めておく、配列
  const readings = new Array(maxPoints).fill(target);

  const line = document.getElementById("temp-graph-line");
  const currentEl = document.getElementById("temp-current");

  function toPoints() {
    const range = 6;//+-6
    return readings.map((value, i) => {
        const x = (i / (maxPoints - 1)) * graphWidth;//0~200　ｘ番目データをｘ座標に
        const ratio = (value - (target - range)) / (range * 2); // 温度を0〜1に正規化
        const y = graphHeight - ratio * graphHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");//つなぐ
  }


  function tick() {//メイン
    const last = readings[readings.length - 1];//latest
    let next = last + (Math.random() - 0.5) * 1.2;//-0.6~+0.6
    next += (target - next) * 0.15;//小さければ増える方向へ15%

    readings.push(next);//新しい温度追加
    readings.shift();//古いの消す

    line.setAttribute("points", toPoints());
    currentEl.textContent = next.toFixed(1);
  }

  tick();
  setInterval(tick, 600); // 0.6秒ごとに更新
}
