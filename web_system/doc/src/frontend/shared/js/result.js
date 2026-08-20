// result.js
// 完了・退室画面の動作。tracking.js が sessionStorage に保存した orderId / orderTotal を表示するだけ。

const orderId = sessionStorage.getItem("orderId") || "-";
const orderTotal = sessionStorage.getItem("orderTotal");

document.getElementById("result-order-id").textContent = orderId;
document.getElementById("result-order-total").textContent = orderTotal ? `¥${orderTotal}` : "-";

const exitBtn = document.getElementById("exit-btn");
const exitNote = document.getElementById("exit-note");

exitBtn.addEventListener("click", () => {
  // 本来はここでサーバーに「席を解放する」APIを呼ぶ(例: POST /api/seats/PT-07/release)。
  // 今はまだAPIが無いので、送るはずのデータをコンソールに出すだけにしている。
  console.log("席解放リクエスト(仮):", { orderId });

  exitBtn.disabled = true;
  exitBtn.textContent = "処理中...";

  // デモ用: 少し待ってから完了表示にする
  setTimeout(() => {
    exitBtn.textContent = "退室完了";
    exitNote.textContent = "ご利用ありがとうございました";

    // 使い終わったカート情報などをクリアしておく(次のお客さんが同じ端末を使う場合の対策)
    sessionStorage.removeItem("cart");
    sessionStorage.removeItem("orderInfo");
    sessionStorage.removeItem("orderId");
    sessionStorage.removeItem("orderTotal");
  }, 800);
});
