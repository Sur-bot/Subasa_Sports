import express from "express";
import cors from "cors";

import { momoPayment } from "./routes/momo.js";
import { momoIPN } from "./routes/momo-ipn.js";

import { createVNPay } from "./routes/vnpay.js";
import { vnpayIPN } from "./routes/vnpay-ipn.js";

const app = express();

app.use(cors());
app.use(express.json());

// MOMO
app.post("/api/payment/momo", momoPayment);
app.post("/api/payment/momo/ipn", momoIPN);

// VNPAY
app.get("/api/payment/vnpay", createVNPay);
app.get("/api/payment/vnpay/ipn", vnpayIPN);

const PORT = 3001;
app.listen(PORT, () => console.log("🚀 Server chạy tại http://localhost:" + PORT));
