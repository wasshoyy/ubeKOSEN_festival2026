// data.js
// 商品マスタデータ。今はダミーだが、将来はサーバー(/api/menu)から取得したものに置き換える想定。
// menu.js と dock_select.js の両方から参照するので、ここに1箇所だけ置いている。

const menuItems = [
  { id: "SPL-01", name: "ABCスープ", price: 200, stock: 10, image: "../shared/images/spl-01.png" },
  { id: "SPL-02", name: "みそ汁", price: 200, stock: 10, image: "../shared/images/spl-02.png" },
  { id: "SPL-03", name: "こんぶスープ", price: 250, stock: 0, image: "../shared/images/spl-03.png" }, // stock:0 = 売り切れ
];

// products.html(商品管理)で編集された price/stock を、上のマスタデータに重ねて反映する。
// 「同じブラウザの中」でだけ共有される localStorage を使っているので、
// 実際にお客さん用端末と店頭用端末が別々になったら、ここをサーバーからの取得に置き換える必要がある。
const PRODUCT_OVERRIDES_KEY = "productOverrides";

function applyProductOverrides() {
  const overrides = JSON.parse(localStorage.getItem(PRODUCT_OVERRIDES_KEY) || "{}");
  menuItems.forEach((item) => {
    if (overrides[item.id]) {
      item.price = overrides[item.id].price;
      item.stock = overrides[item.id].stock;
    }
  });
}

applyProductOverrides();
