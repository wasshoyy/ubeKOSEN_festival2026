// dock_select.js
// イートイン/テイクアウト選択・人数入力・注文内容確認画面の動作。
// menuItems は data.js から、cart は前の画面(menu.js)が sessionStorage に保存したものを読み込む。

const cart = JSON.parse(sessionStorage.getItem("cart") || "{}");

let method = null; // "eatin" | "takeout" | null
let peopleCount = 1;

const optionEls = {
  eatin: document.getElementById("option-eatin"),
  takeout: document.getElementById("option-takeout"),
};

const peopleRow = document.getElementById("people-row");
const peopleValueEl = document.getElementById("people-value");
const summaryBox = document.getElementById("summary-box");
const confirmBtn = document.getElementById("confirm-btn");

// ---- 注文内容の要約を描画する(カートの中身 + 合計) ----
function renderSummary() {
  summaryBox.innerHTML = "";

  let totalQty = 0;
  let totalPrice = 0;

  Object.entries(cart).forEach(([itemId, qty]) => {
    if (qty <= 0) return;
    const item = menuItems.find((i) => i.id === itemId);
    if (!item) return;

    totalQty += qty;
    totalPrice += item.price * qty;

    const line = document.createElement("div");
    line.className = "lab-summary-line";
    line.innerHTML = `<span>${item.name}</span><span>${qty}</span>`;
    summaryBox.appendChild(line);
  });

  const divider = document.createElement("div");
  divider.className = "lab-summary-divider";
  summaryBox.appendChild(divider);

  const totalRow = document.createElement("div");
  totalRow.className = "lab-summary-total";
  totalRow.innerHTML = `<span>数量：${totalQty}</span><span class="lab-accent-text">合計：¥${totalPrice}</span>`;
  summaryBox.appendChild(totalRow);
}

// ---- 提供方法の選択(イートイン/テイクアウトは排他選択) ----
function selectMethod(value) {
  method = value;

  optionEls.eatin.classList.toggle("checked", value === "eatin");
  optionEls.takeout.classList.toggle("checked", value === "takeout");

  // イートインの時だけ人数入力を表示する
  peopleRow.classList.toggle("visible", value === "eatin");

  updateConfirmButton();
}

optionEls.eatin.addEventListener("click", () => selectMethod("eatin"));
optionEls.takeout.addEventListener("click", () => selectMethod("takeout"));

// ---- 人数の増減(1人〜) ----
document.getElementById("people-minus").addEventListener("click", () => {
  if (peopleCount > 1) {
    peopleCount -= 1;
    peopleValueEl.textContent = peopleCount;
  }
});

document.getElementById("people-plus").addEventListener("click", () => {
  peopleCount += 1;
  peopleValueEl.textContent = peopleCount;
});

// ---- 注文確定ボタンの有効/無効(提供方法が選ばれていないと押せない) ----
function updateConfirmButton() {
  confirmBtn.disabled = method === null;
}

// ---- 戻るボタン: 商品選択画面に戻る ----
document.getElementById("back-btn").addEventListener("click", () => {
  window.location.href = "menu.html";
});

// ---- 注文確定: 提供方法・人数を保存して次の画面(注文完了/トラッキング)へ ----
confirmBtn.addEventListener("click", () => {
  const orderInfo = {
    method,
    people: method === "eatin" ? peopleCount : null,
  };
  sessionStorage.setItem("orderInfo", JSON.stringify(orderInfo));
  console.log("注文情報:", orderInfo, "カート:", cart);
  window.location.href = "tracking.html";
});

renderSummary();
