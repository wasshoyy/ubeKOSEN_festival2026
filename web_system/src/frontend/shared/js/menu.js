// menu.js
// 商品選択画面の動作。menuItems は data.js から読み込んでいる(このファイルより先に読み込む前提)。

// 選ばれた商品を id -> 個数 で保持する
// dock_select.htmlから「戻る」で戻ってきた時にも選択内容が残るよう、
// sessionStorageに保存されているものがあればそこから復元する
const cart = JSON.parse(sessionStorage.getItem("cart") || "{}");

const gridEl = document.getElementById("menu-grid");
const nextBtn = document.getElementById("next-btn");

const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalPrice = document.getElementById("modal-price");
const modalPhoto = document.getElementById("modal-photo");
const qtyValueEl = document.getElementById("qty-value");

let activeItemId = null; // 今モーダルで開いている商品のid。どの商品を操作しているかを他の関数とかにも分かるように。
let activeQty = 1;

// ---- 商品カードを描画する ----
function renderGrid() {
  gridEl.innerHTML = "";

  menuItems.forEach((item) => {
    const card = document.createElement("button");
    card.className = "lab-card";
    card.type = "button";

    const isSoldOut = item.stock <= 0;
    const isSelected = cart[item.id] > 0;

    if (isSoldOut) card.classList.add("disabled");
    if (isSelected) card.classList.add("selected");

    card.innerHTML = `
      <div class="lab-photo">
        ${isSoldOut
          ? `SOLD OUT`
          : `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.classList.add('show');">
             <span class="lab-photo-fallback">写真</span>`
        }
      </div>
      <div class="lab-id">${item.id}</div>
      <div class="lab-name">${item.name}</div>
      <div class="lab-price">&yen;${item.price}${isSelected ? ` × ${cart[item.id]}` : ""}</div>
    `;

    card.addEventListener("click", () => openModal(item.id));
    gridEl.appendChild(card);
  });

  updateNextButton();
}

// ---- モーダルを開く ----
function openModal(itemId) {
  const item = menuItems.find((i) => i.id === itemId);
  if (!item || item.stock <= 0) return;

  activeItemId = itemId;
  activeQty = cart[itemId] || 1;//cart[itemId]に値が無ければ１を入れる

  modalTitle.textContent = `【${item.id}】${item.name}`;//テキスト書き換え。
  modalPrice.textContent = `¥${item.price}`;
  qtyValueEl.value = activeQty;
  qtyValueEl.max = item.stock; // 在庫数より多く入力できないようにする

  modalPhoto.innerHTML = `
    <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.classList.add('show');">
    <span class="lab-photo-fallback">写真</span>
  `;//写真がいないときの指定。

  modalOverlay.classList.add("open");
}

function closeModal() {
  modalOverlay.classList.remove("open");
  activeItemId = null;
}


//入力したあと
qtyValueEl.addEventListener("change", () => {//inputではなく、入力を終えた時(change、フォーカスが外れた時など)
  const item = menuItems.find((i) => i.id === activeItemId);
  if (!item) return;

  let value = parseInt(qtyValueEl.value, 10);

  if (Number.isNaN(value) || value < 0) value = 0;//整数値じゃない（Nan、変換失敗）か０より小さい値なら０にする。
  if (value > item.stock) value = item.stock; // 在庫数を超えないようにする

  activeQty = value;
  qtyValueEl.value = activeQty;
});

// ---- choose: この商品をカートに確定する(0ならカートから削除する) ----
document.getElementById("modal-choose").addEventListener("click", () => {
  if (activeItemId) {
    if (activeQty > 0) {
      cart[activeItemId] = activeQty;
    } else {
      delete cart[activeItemId]; // 0で確定 = 選択を取り消す
    }
  }
  closeModal();
  renderGrid();
});

document.getElementById("modal-close").addEventListener("click", closeModal);

//モーダルを開いてるときに、外側をクリックしたらモーダルを閉じる機能
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();//外側をクリックしたらモーダルを閉じる
});

// ---- NEXTボタンの有効/無効を切り替える ----
function updateNextButton() {
  const hasSelection = Object.values(cart).some((qty) => qty > 0);//cartに一つでも０じゃないのがあるなら
  nextBtn.disabled = !hasSelection;//nextBtn.disabledをtureかfalseに。tureが消える、
}

// ---- NEXT: カートの中身を次の画面に渡して遷移する ----
nextBtn.addEventListener("click", () => {
  sessionStorage.setItem("cart", JSON.stringify(cart));//文字列に変換して保存（保存する時の名前,保存する値）
  window.location.href = "dock_select.html";//ページ移動
});

renderGrid();//商品カード作成

// 商品管理画面(products.html)で価格・在庫が変更された時、この画面も自動で反映する。
// 本実装では、ここをサーバーへのポーリングやWebSocket通知に置き換える想定。
window.addEventListener("storage", (e) => {
  if (e.key === "productOverrides") {
    applyProductOverrides();
    renderGrid();
  }
});
