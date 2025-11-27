import crypto from "crypto";
import axios from "axios";

export const momoPayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const partnerCode = "MOMO";
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";

    const redirectUrl = "http://localhost:4200/home";
    const ipnUrl = "http://localhost:3001/api/payment/momo/ipn";

    const requestId = `${orderId}_${Date.now()}`;
    const orderInfo = `Thanh toán đơn hàng ${orderId}`;
    const requestType = "captureWallet";

    const rawSignature =
      "accessKey=" +
      accessKey +
      "&amount=" +
      amount +
      "&extraData=" +
      "" +
      "&ipnUrl=" +
      ipnUrl +
      "&orderId=" +
      orderId +
      "&orderInfo=" +
      orderInfo +
      "&partnerCode=" +
      partnerCode +
      "&redirectUrl=" +
      redirectUrl +
      "&requestId=" +
      requestId +
      "&requestType=" +
      requestType;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const paymentData = {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      signature,
      extraData: "",
    };

    const momoRes = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      paymentData
    );

    return res.json(momoRes.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
