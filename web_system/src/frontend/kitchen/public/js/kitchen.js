// kitchen.js

const tbody = document.getElementById("kitchen-table-body");

let orderitem_Info=[];
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



function renderKitchen() {
  const totalPages = Math.max(
    1,
    Math.ceil(orderitem_Info.length / pageSize)
  );
  currentPage = Math.min(currentPage, totalPages);
  document.getElementById("page-info").textContent =
  `${currentPage} / ${totalPages}`;


  const orders = orderitem_Info;
  tbody.innerHTML = "";

  const startIndex = (currentPage - 1) * pageSize;
  const visibleOrders = orders.slice(startIndex, startIndex + pageSize);

  if (orders.length === 0) {
    tbody.innerHTML = `<tr class="lab-table-empty"><td colspan="5">まだ注文はありません</td></tr>`;
    return;
  }


  visibleOrders.forEach((order) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.order_item_id}</td>
      <td>${order.item.item_name}</td>
      <td>${order.robot_id}</td>
      <td>
        <button class="cook-button">${order.cook_status}</button>
      </td>
      <td>
        <button class="deli-button">${order.delivery_status}</button>
      </td>
    `;
    tbody.appendChild(row);


    //調理状態ボタン
    const cookButton = row.querySelector(".cook-button");
    cookButton.addEventListener("click", async () => {
      let change;
      try {
        change =await request('/api/staff/orders/cook', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          order_item_id: order.order_item_id
        })
      });
      order.cook_status = change.cook_status;
      cookButton.textContent = order.cook_status;
      cookButton.disabled = true;
      console.log("調理ステータス変更完了");

      }catch(err){
        console.error(err);
        return;
      }
    });


    //配達状況ボタン
    const deliButton = row.querySelector(".deli-button");
    deliButton.addEventListener("click", async () => {
      let change;
      try {
        change =await request('/api/staff/orders/deli', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          order_item_id: order.order_item_id
        })
      });
      order.delivery_status = change.delivery_status;
      deliButton.textContent = order.delivery_status;

      if (order.delivery_status === "deliveryed") {
        deliButton.disabled = true;
      }
      console.log("配達ステータス変更完了");

      }catch(err){
        console.error(err);
        return;
      }
    });


  });
}


async function loadKitchen() {
  try {
    const data = await request("/api/staff/orders/paid");
    orderitem_Info = data.order_item_info;
    renderKitchen();
  } catch (err) {
    console.error("厨房情報の取得に失敗しました:", err);
  }
}


document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderKitchen();
  }
});

document.getElementById("next-page").addEventListener("click", () => {
  const totalPages = Math.ceil(orderitem_Info.length / pageSize);

  if (currentPage < totalPages) {
    currentPage++;
    renderKitchen();
  }
});




const eventSource = new EventSource("/api/staff/NewPaidOrder");

eventSource.onmessage = async (event) => {
  const notification = JSON.parse(event.data);

  if (notification.event_type === "paid") {
    await loadKitchen();
  }
};

eventSource.onerror = (error) => {
  console.error("支払済の新規注文の通知でエラーが発生しました:", error);
};


loadKitchen();

