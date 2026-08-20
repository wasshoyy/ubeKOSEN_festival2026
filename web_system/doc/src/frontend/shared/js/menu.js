// menu.js
// 商品選択画面の動作。menuItems は data.js から読み込んでいる(このファイルより先に読み込む前提)。

// 選ばれた商品を id -> 個数 で保持する
const cart = {};

const gridEl = document.getElementById("menu-grid");
const nextBtn = document.getElementById("next-btn");

const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalPrice = document.getElementById("modal-price");
const modalPhoto = document.getElementById("modal-photo");
const qtyValueEl = document.getElementById("qty-value");

let activeItemId = null; // 今モーダルで開いている商品のid
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
  activeQty = cart[itemId] || 1;

  modalTitle.textContent = `【${item.id}】${item.name}`;
  modalPrice.textContent = `¥${item.price}`;
  qtyValueEl.textContent = activeQty;

  modalPhoto.innerHTML = `
    <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.classList.add('show');">
    <span class="lab-photo-fallback">写真</span>
  `;

  modalOverlay.classList.add("open");
}

function closeModal() {
  modalOverlay.classList.remove("open");
  activeItemId = null;
}

// ---- 個数の増減 ----
document.getElementById("qty-minus").addEventListener("click", () => {
  if (activeQty > 1) {
    activeQty -= 1;
    qtyValueEl.textContent = activeQty;
  }
});

document.getElementById("qty-plus").addEventListener("click", () => {
  const item = menuItems.find((i) => i.id === activeItemId);
  if (item && activeQty < item.stock) {
    activeQty += 1;
    qtyValueEl.textContent = activeQty;
  }
});

// ---- choose: この商品をカートに確定する ----
document.getElementById("modal-choose").addEventListener("click", () => {
  if (activeItemId) {
    cart[activeItemId] = activeQty;
  }
  closeModal();
  renderGrid();
});

document.getElementById("modal-close").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ---- NEXTボタンの有効/無効を切り替える ----
function updateNextButton() {
  const hasSelection = Object.values(cart).some((qty) => qty > 0);
  nextBtn.disabled = !hasSelection;
}

// ---- NEXT: カートの中身を次の画面に渡して遷移する ----
nextBtn.addEventListener("click", () => {
  sessionStorage.setItem("cart", JSON.stringify(cart));
  window.location.href = "dock_select.html";
});

renderGrid();
