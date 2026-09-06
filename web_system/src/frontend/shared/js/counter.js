// counter.js
// 店頭デバイス(注文一覧)の動作。orders-store.js が持つ共通の注文リストを表示するだけ。

const tbody = document.getElementById("order-table-body");

// ---- 注文内容を「商品名×個数」の形式にまとめる ----
// order.items は個数ぶん1件ずつ並んでいる(例: [{name:"みそ汁"},{name:"みそ汁"}])ので、
// 同じ商品名ごとにカウントして「みそ汁×2」のような表示に変換する。
function formatItems(items) {
  const counts = {};
  items.forEach((item) => {
    counts[item.name] = (counts[item.name] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, qty]) => (qty > 1 ? `${name}×${qty}` : name))
    .join("、");
}

function renderOrders() {
  const orders = getOrders();
  tbody.innerHTML = "";

  if (orders.length === 0) {
    tbody.innerHTML = `<tr class="lab-table-empty"><td colspan="3">まだ注文はありません</td></tr>`;
    return;
  }

  orders.forEach((order) => {
    const row = document.createElement("tr");
    const itemsText = formatItems(order.items);

    row.innerHTML = `
      <td>${order.number}</td>
      <td>${itemsText}</td>
      <td>${order.total}</td>
    `;
    tbody.appendChild(row);
  });
}

renderOrders();

// 他のタブ(お客さんのスマホ側)で新しい注文が追加された時、この画面にも反映されるようにする。
// 本実装ではここを、サーバーへのポーリングやWebSocketに置き換える想定。
window.addEventListener("storage", (e) => {
  if (e.key === "orders") {
    renderOrders();
  }
});
