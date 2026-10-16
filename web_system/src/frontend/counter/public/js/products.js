// products.js
// 商品管理画面(金額・在庫の編集)の動作。
// menuItems・上書きの反映(applyProductOverrides)は data.js から読み込む。
// 編集内容は localStorage に保存し、menu.html 側にも同じ仕組みで反映される
// (本実装ではサーバーのDBに置き換える想定)。

const tbody = document.getElementById("product-table-body");
const editBtn = document.getElementById("edit-btn");
const confirmOverlay = document.getElementById("confirm-overlay");
const confirmYes = document.getElementById("confirm-yes");
const confirmNo = document.getElementById("confirm-no");

let isEditing = false;

function renderTable() {
  tbody.innerHTML = "";

  menuItems.forEach((item) => {
    const row = document.createElement("tr");

    if (isEditing) {
      row.innerHTML = `
        <td>${item.name}</td>
        <td><input type="number" class="lab-table-input" data-id="${item.id}" data-field="price" value="${item.price}" min="0"></td>
        <td><input type="number" class="lab-table-input" data-id="${item.id}" data-field="stock" value="${item.stock}" min="0"></td>
      `;
    } else {
      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.price}</td>
        <td>${item.stock}</td>
      `;
    }

    tbody.appendChild(row);
  });
}

renderTable();

// ---- 編集ボタン: 表示モードと編集モードを切り替える ----
editBtn.addEventListener("click", () => {
  if (!isEditing) {
    isEditing = true;
    editBtn.textContent = "保存";
    renderTable();
  } else {
    // 保存が押されたら、確認モーダルを出す(勝手には保存しない)
    confirmOverlay.classList.add("open");
  }
});

// ---- 確認モーダル: キャンセル ----
confirmNo.addEventListener("click", () => {
  confirmOverlay.classList.remove("open");
});

// ---- 確認モーダル: 確定 ----
confirmYes.addEventListener("click", () => {
  const inputs = tbody.querySelectorAll(".lab-table-input");
  const overrides = JSON.parse(localStorage.getItem(PRODUCT_OVERRIDES_KEY) || "{}");

  inputs.forEach((input) => {
    const id = input.dataset.id;
    const field = input.dataset.field;
    let value = parseInt(input.value, 10);
    if (Number.isNaN(value) || value < 0) value = 0;

    const item = menuItems.find((i) => i.id === id);
    item[field] = value;

    overrides[id] = overrides[id] || {};
    overrides[id].price = item.price;
    overrides[id].stock = item.stock;
  });

  localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(overrides));

  confirmOverlay.classList.remove("open");
  isEditing = false;
  editBtn.textContent = "編集";
  renderTable();
});
