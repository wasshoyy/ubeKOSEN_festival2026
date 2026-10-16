// orders-store.js
// 本来はサーバー(DB)が持つべき「全注文のリスト」を、今はまだサーバーが無いので
// localStorage(同じブラウザの中でタブをまたいでも共有される保存領域)で代用している。
//
// 注意: これはあくまで開発中の代用。別の端末(実際の厨房PC・店頭タブレット)からは
// 見えないし、ブラウザのデータを消せば失われる。本実装ではここを丸ごと
// サーバーAPI(例: GET/POST /api/orders)に差し替える想定。

const ORDERS_KEY = "orders";

function getOrders() {
  return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
}

function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

// 新しい注文を1件追加する。注文番号は「これまでの件数+1」の連番にしている。
function addOrder({ items, total, method, people }) {
  const orders = getOrders();

  // ロボットは今のところ2台(#1, #2)を想定し、注文ごとに交互に割り当てている。
  // 本実装では、その時点で手が空いているロボットを割り当てる処理に差し替える想定。
  const robot = (orders.length % 2) + 1;

  const order = {
    number: orders.length + 1,
    robot: `#${robot}`,
    // 各商品に、厨房側で個別に切り替えられる状態(未/済)を持たせる
    items: items.map((item, index) => ({
      ...item,
      itemId: `${orders.length + 1}-${index}`, // この注文の中で一意なID(状態変更時の目印)
      status: "未",
    })),
    total,
    method, // "eatin" | "takeout"
    people,
    paid: false,
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  saveOrders(orders);
  return order;
}

// 厨房デバイスから、特定の商品1つの状態(未/済)を切り替える
function toggleItemStatus(orderNumber, itemId) {
  const orders = getOrders();
  const order = orders.find((o) => o.number === orderNumber);
  if (!order) return;

  const item = order.items.find((i) => i.itemId === itemId);
  if (!item) return;

  item.status = item.status === "済" ? "未" : "済";
  saveOrders(orders);
}
