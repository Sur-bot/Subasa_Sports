import moment from "moment";
import qs from "qs";
import crypto from "crypto";

export const createVNPay = (req, res) => {
  const { amount, orderId } = req.query;

  const tmnCode = "2QXUI4J4";
  const secretKey = "SECRETKEY123";

  const vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const returnUrl = "http://localhost:3000/checkout/success";

  const date = moment().format("YYYYMMDDHHmmss");

  const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  let params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: amount * 100,
    vnp_CreateDate: date,
    vnp_CurrCode: "VND",
    vnp_IpAddr: ipAddr,
    vnp_Locale: "vn",
    vnp_OrderInfo: "Thanh toan don hang",
    vnp_OrderType: "other",
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: orderId,
  };

  params = sortObject(params);

  const signData = qs.stringify(params, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  params["vnp_SecureHash"] = signed;

  const url = vnpUrl + "?" + qs.stringify(params, { encode: true });

  return res.json({ payUrl: url });
};

function sortObject(obj) {
  let sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => (sorted[key] = obj[key]));
  return sorted;
}
