import React, { useState } from "react";

function Checkout() {
  const [method, setMethod] = useState("momo");
  const [amount] = useState(150000);
  const orderId = "ORDER" + Date.now();

  const payNow = async () => {
    if (method === "momo") {
      const res = await fetch("http://localhost:3001/api/payment/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, amount }),
      });
      const data = await res.json();
      window.location.href = data.payUrl;
    }

    if (method === "vnpay") {
      const url = `http://localhost:3001/api/payment/vnpay?orderId=${orderId}&amount=${amount}`;
      const res = await fetch(url);
      const data = await res.json();
      window.location.href = data.payUrl;
    }

    if (method === "bank") {
      alert("Chuyển khoản theo hướng dẫn!");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Checkout</h2>

      <h3>Chọn phương thức thanh toán</h3>
      <label><input type="radio" name="pay" value="momo" onChange={() => setMethod("momo")} checked={method === "momo"} /> MoMo</label><br/>
      <label><input type="radio" name="pay" value="vnpay" onChange={() => setMethod("vnpay")} /> VNPay</label><br/>
      <label><input type="radio" name="pay" value="bank" onChange={() => setMethod("bank")} /> Chuyển khoản ngân hàng</label><br/>

      <button onClick={payNow} style={{ marginTop: 20, padding: 12 }}>
        Thanh toán ngay
      </button>
    </div>
  );
}

export default Checkout;
