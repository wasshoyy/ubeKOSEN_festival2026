// menu.js
 
// 選ばれた商品を id -> 個数 で保持する
// dock_select.htmlから「戻る」で戻ってきた時にも選択内容が残るよう、
// sessionStorageに保存されているものがあればそこから復元する


const gridEl = document.getElementById("menu-grid");
const cart = JSON.parse(sessionStorage.getItem("cart") || "{}");

const nextBtn = document.getElementById("next-btn");
const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalPrice = document.getElementById("modal-price");
const modalPhoto = document.getElementById("modal-photo");
const qtyValueEl = document.getElementById("qty-value");
 
let activeItemId = null; // 今モーダルで開いている商品のid。どの商品を操作しているかを他の関数とかにも分かるように。
let activeQty = 1;

let menuItems = [];


// API
async function request(url, options) {
  const response = await fetch(url, options);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(response.status + ": " + data.error);
  }

  return data;
}


//商品カードを描画する関数
function renderGrid() {
  gridEl.innerHTML = "";
 
  menuItems.forEach((item) => {
    const card = document.createElement("button");
    card.className = "lab-card";
    card.type = "button";
 
    const isSoldOut = item.stock <= 0;
    const isSelected = cart[item.item_id] > 0;
 
    if (isSoldOut) card.classList.add("disabled");
    //商品選んだか（色変更）
    if (isSelected) card.classList.add("selected");
 
    card.innerHTML = `
      <div class="lab-photo">
        ${isSoldOut
          ? `SOLD OUT`
          : `<img src="${item.item_image}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.classList.add('show');">
             <span class="lab-photo-fallback">写真</span>`
        }
      </div>

      <div class="lab-id">${item.item_id}</div>
      <div class="lab-name">${item.item_name}</div>
      <div class="lab-price">&yen;${item.price}${isSelected ? ` × ${cart[item.item_id]}` : ""}</div>
    `;
 
    card.addEventListener("click", () => openModal(item.item_id));
    gridEl.appendChild(card);
  });

  //商品選んだらNEXTボタンしゅつげん
  updateNextButton();
}


//メニューを読み込むAPI
async function loadMenu() {
  menuItems = await request("/api/customer/menu");

  console.log(menuItems);

  renderGrid();
}
loadMenu();

 




 
//モーダルを開く関数
function openModal(itemId) {
  const item = menuItems.find((i) => i.item_id === itemId);
  if (!item || item.stock <= 0) return;
 
  activeItemId = itemId;
  activeQty = cart[itemId] || 1;//cart[itemId]に値が無ければ１を入れる
 
  modalTitle.textContent = `【${item.item_id}】${item.item_name}`;//テキスト書き換え。
  modalPrice.textContent = `¥${item.price}`;
  qtyValueEl.value = activeQty;
  qtyValueEl.max = item.stock; // 在庫数より多く入力できないようにする
 
  modalPhoto.innerHTML = `
    <img src="${item.image}" alt="${item.item_name}" onerror="this.style.display='none'; this.nextElementSibling.classList.add('show');">
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
  const item = menuItems.find((i) => i.item_id === activeItemId);
  if (!item) return;
 
  let value = parseInt(qtyValueEl.value, 10);
 
  if (Number.isNaN(value) || value < 0) value = 0;//整数値じゃない（Nan、変換失敗）か０より小さい値なら０にする。
  if (value > item.stock) value = item.stock; // 在庫数を超えないようにする
 
  activeQty = value;
  qtyValueEl.value = activeQty;
});
 
 
//choose: この商品をカートに確定する(0ならカートから削除する)
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
 
 
// 商品管理画面(products.html)で価格・在庫が変更された時、この画面も自動で反映する。
// 本実装では、ここをサーバーへのポーリングやWebSocket通知に置き換える想定。
window.addEventListener("storage", (e) => {
  if (e.key === "productOverrides") {
    applyProductOverrides();
    renderGrid();
  }
});