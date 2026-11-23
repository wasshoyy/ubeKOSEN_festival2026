// result.js

const orderId = sessionStorage.getItem("orderId") || "-";
const orderTotal = sessionStorage.getItem("orderTotal");
// sessionStorage に保存した orderId / orderTotal 

document.getElementById("result-order-id").textContent = orderId;
document.getElementById("result-order-total").textContent = orderTotal ? `¥${orderTotal}` : "-";

const exitBtn = document.getElementById("exit-btn");
const exitNote = document.getElementById("exit-note");


exitBtn.addEventListener("click", async () => {
  exitBtn.disabled = true;
  exitBtn.textContent = "処理中...";
  exitNote.textContent = "席を解放しています...";

  try {
    // バックエンドの退室APIを呼び出す
    const response = await fetch("/api/customer/exit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    // APIでエラーが発生した場合
    if (!response.ok) {
      throw new Error(data.error || "退室処理に失敗しました");
    }

    // 退室成功
    exitBtn.textContent = "退室完了";
    exitNote.textContent = "ご利用ありがとうございました";

    // カートなどの情報を削除
    sessionStorage.removeItem("cart");
    sessionStorage.removeItem("orderInfo");
    sessionStorage.removeItem("orderId");
    sessionStorage.removeItem("orderTotal");

    console.log("退室成功:", data);

  } catch (error) {
    console.error("退室エラー:", error);

    exitBtn.disabled = false;
    exitBtn.textContent = "退室する";
    exitNote.textContent = error.message;
  }
});
