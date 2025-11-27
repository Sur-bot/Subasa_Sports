export const momoIPN = (req, res) => {
  const data = req.body;

  console.log("📩 MoMo IPN:", data);

  if (data.resultCode == 0) {
    console.log("Thanh toán MOMO thành công:", data.orderId);
  }

  res.status(200).json({ message: "IPN received" });
};
