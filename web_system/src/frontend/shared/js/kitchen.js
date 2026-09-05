// kitchen.js
// 厨房デバイスの動作。orders-store.js が持つ注文リストを、商品1品ごとに1行で表示する。
// 「済/未」ボタンを押すと toggleItemStatus() で状態を切り替え、localStorage に保存する。

const tbody = document.getElementById("kitchen-table-body");

function renderKitchen() {
  const orders = getOrders();
  tbody.innerHTML = "";

  // 全注文の中身を、商品1品=1行になるようにフラットにする
  const rows = [];
  orders.forEach((order) => {
    order.items.forEach((item) => {
      rows.push({ order, item });
    });
  });

  if (rows.length === 0) {
    tbody.innerHTML = `<tr class="lab-table-empty"><td colspan="4">まだ注文はありません</td></tr>`;
    return;
  }

  rows.forEach(({ order, item }) => {
    const row = document.createElement("tr");
    const isDone = item.status === "済";

    row.innerHTML = `
      <td>${order.number}</td>
      <td>${item.name}</td>
      <td>${order.robot}</td>
      <td>
        <button
          class="lab-status-btn ${isDone ? "done" : ""}"
          data-order="${order.number}"
          data-item="${item.itemId}"
        >${item.status}</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ---- 状態ボタン: 押すたびに 未 ⇔ 済 を切り替える ----
// ボタンは毎回作り直されるので、tbody自体に1つだけイベントを付けて
// クリックされた場所がボタンかどうかを判定する(イベント委譲)
tbody.addEventListener("click", (e) => {
  const btn = e.target.closest(".lab-status-btn");
  if (!btn) return;

  const orderNumber = Number(btn.dataset.order);
  const itemId = btn.dataset.item;

  toggleItemStatus(orderNumber, itemId);
  renderKitchen();
});

renderKitchen();

// 他のタブ(店頭側・お客さん側)で注文が増えたり状態が変わったりした時、この画面にも反映する。
// 本実装では、ここをサーバーへのポーリングやWebSocket通知に置き換える想定。
window.addEventListener("storage", (e) => {
  if (e.key === "orders") {
    renderKitchen();
  }
});
