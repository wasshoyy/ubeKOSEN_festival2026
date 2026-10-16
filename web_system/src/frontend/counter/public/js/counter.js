// counter.js
//order_idごとに表示。

const tbody = document.getElementById("order-table-body");

let orderInfo=[];
const pageSize = 10; // 1ページに表示する注文数
let currentPage = 1; // 現在のページ番号

//API
async function request(url, options) {
  const response = await fetch(url, options);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(response.status + ": " + data.error);
  }

  return data;
}



function renderOrders() {
  const orders = orderInfo;
  tbody.innerHTML = "";
  //ページの設定。
  const startIndex = (currentPage - 1) * pageSize;
  const visibleOrders = orders.slice(startIndex, startIndex + pageSize);

  if (orders.length === 0) {
    tbody.innerHTML = `<tr class="lab-table-empty"><td colspan="5">まだ注文はありません</td></tr>`;
    return;
  }

  visibleOrders.forEach((order) => {
    const row = document.createElement("tr");
    const itemsText = formatItems(order.items);

    row.innerHTML = `
      <td>${order.order_id}</td>
      <td>${order.seat_id}</td>
      <td>${itemsText}</td>
      <td>${order.total_price}</td>
      <td>${order.order_time}</td>
      <td>
        <button class="pay-button">${order.order_status}</button>
      </td>
    `;
    tbody.appendChild(row);

    const payButton = row.querySelector(".pay-button");
    payButton.addEventListener("click", async () => {
      let change;
      try {
        change =await request('/api/staff/orders/pay', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          order_id: order.order_id
        })
      });
      payButton.textContent = "paid";
      payButton.disabled = true;
      order.order_status = change.order_status;
      console.log("ステータス変更完了");

      }catch(err){
        console.error(err);
        return;
      }
    });

  });
}




//注文情報を読み込むAPI
async function loadOrder() {
  const data = await request("/api/staff/orders");
  orderInfo = data.order_info;

  currentPage = Math.max(1, Math.ceil(orderInfo.length / pageSize));

  console.log(orderInfo);
  renderOrders();
}
loadOrder();


// 注文内容を「商品名×個数」の形式にまとめる＝itemText
function formatItems(items) {
  const counts = {};
  items.forEach((item) => {
    counts[item.item_name] = (counts[item.item_name] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([item_name, order_qty]) => (order_qty > 1 ? `${item_name}×${order_qty}` : item_name))
    .join("、");
}



document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderOrders();
  }
});

document.getElementById("next-page").addEventListener("click", () => {
  const totalPages = Math.ceil(orderInfo.length / pageSize);

  if (currentPage < totalPages) {
    currentPage++;
    renderOrders();
  }
});




const eventSource = new EventSource(
  "/api/staff/order-events"
);

eventSource.onmessage = async (event) => {
  const notification = JSON.parse(event.data);

  if (notification.event_type === "order_created") {
    await loadOrder();
  }
};

eventSource.onerror = (error) => {
  console.error("新規注文の通知でエラーが発生しました:", error);
};
