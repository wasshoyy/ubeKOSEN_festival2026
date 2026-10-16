// seat.js

const tbody = document.getElementById("order-table-body");

let orderInfo=[];

//API
async function request(url, options) {
  const response = await fetch(url, options);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(response.status + ": " + data.error);
  }

  return data;
}



function renderSeats() {
  const orders = orderInfo;
  tbody.innerHTML = "";

  orders.forEach((order) => {
    const row = document.createElement("tr");
    const people = order.people ?? 0;

    row.innerHTML = `
      <td>${order.seat_id}</td>
      <td>${people}</td>
    `;
    tbody.appendChild(row);

    console.log("seat情報取得")
  });
}


//seat情報を読み込むAPI
async function loadSeat() {
  const data = await request("/api/staff/seats");
  orderInfo = data.order_info;

  console.log(orderInfo);
  renderSeats();
}

loadSeat();






const eventSource = new EventSource("/api/staff/change-seats");

eventSource.onmessage = async (event) => {
  const notification = JSON.parse(event.data);

  if (notification.event_type === "seat_change") {
    await loadSeat();
  }
};

eventSource.onerror = (error) => {
  console.error("席情報の通知でエラーが発生しました:", error);
};
