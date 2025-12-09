import moment from "moment";
import qs from "qs";
import crypto from "crypto";

export const createVNPay = (req, res) => {
  let { amount, orderId } = req.query;

  amount = Number(amount);

  const tmnCode = "2QXUI4J4";
  const secretKey = "SECRETKEY123";

  const vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const returnUrl = "http://localhost:4200/success";

  const createDate = moment().format("YYYYMMDDHHmmss");
  const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: amount * 100,
    vnp_CreateDate: createDate,
    vnp_CurrCode: "VND",
    vnp_IpAddr: ipAddr,
    vnp_Locale: "vn",
    vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: orderId,
  };

  // 🔥 Sort A-Z theo chuẩn VNPay
  vnp_Params = sortObject(vnp_Params);

  // 🔥 Chuỗi ký đúng format: key=value&key=value
  const signData = qs.stringify(vnp_Params, { encode: false });

  // 🔥 Tạo hash HMAC-SHA512
  const hmac = crypto.createHmac("sha512", secretKey);
  const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  // Gắn vào params
  vnp_Params["vnp_SecureHash"] = secureHash;

  // 📌 Tạo URL thanh toán
  const paymentUrl = vnpUrl + "?" + qs.stringify(vnp_Params, { encode: true });

  return res.json({ payUrl: paymentUrl });
};

function sortObject(obj) {
  let sorted = {};
  const keys = Object.keys(obj).sort();

  keys.forEach((key) => {
    sorted[key] = obj[key].toString(); // Ép về string theo chuẩn VNPay
  });

  return sorted;
}
