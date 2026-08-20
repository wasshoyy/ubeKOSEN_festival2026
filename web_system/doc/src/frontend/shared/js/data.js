// data.js
// 商品マスタデータ。今はダミーだが、将来はサーバー(/api/menu)から取得したものに置き換える想定。
// menu.js と dock_select.js の両方から参照するので、ここに1箇所だけ置いている。

const menuItems = [
  { id: "SPL-01", name: "ABCスープ", price: 200, stock: 10, image: "../shared/images/spl-01.png" },
  { id: "SPL-02", name: "みそ汁", price: 200, stock: 10, image: "../shared/images/spl-02.png" },
  { id: "SPL-03", name: "コーンスープ", price: 200, stock: 10, image: "../shared/images/spl-03.png" }, // stock:0 = 売り切れ
];
