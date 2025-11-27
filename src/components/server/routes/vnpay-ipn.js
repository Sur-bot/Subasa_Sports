export const vnpayIPN = (req, res) => {
  console.log("📩 VNPay IPN:", req.query);

  return res.status(200).json({ RspCode: "00", Message: "Success" });
};
