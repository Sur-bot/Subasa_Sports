import express from "express";
import cors from "cors";

import { momoPayment } from "./routes/momo.js";
import { momoIPN } from "./routes/momo-ipn.js";
import { createVNPay } from "./routes/vnpay.js";
import { vnpayIPN } from "./routes/vnpay-ipn.js";
import stripeRoutes from "./routes/stripe.js"; 
import orderEmailRoutes from "./email/order.js";

const app = express();

app.use(cors());
app.use(express.json());

// MOMO
app.post("/api/payment/momo", momoPayment);
app.post("/api/payment/momo/ipn", momoIPN);

// VNPAY
app.get("/api/payment/vnpay", createVNPay);
app.get("/api/payment/vnpay/ipn", vnpayIPN);

// STRIPE
app.use("/api/payment", stripeRoutes); 

// EMAIL
app.use("/api/order", orderEmailRoutes);

const PORT = 3001;
app.listen(PORT, () => console.log("🚀 Server chạy tại http://localhost:" + PORT));
