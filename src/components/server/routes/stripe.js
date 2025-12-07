import express from "express";
import Stripe from "stripe";

const router = express.Router();
const stripe = new Stripe("sk_test_51SaayePC6D1z0SZ8PjAi2oSaSOtIJJnRoIhytQfAROXRgtjv13bHhiPMd0XwrlLqu49zIo1SV12XS1oMEuAZyKjv00qOTes739");

// CREATE STRIPE CHECKOUT SESSION
router.post("/stripe", async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    const usdAmount = Math.round(amount / 25000 * 100); // 1 USD = 25k VND

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Thanh toán đơn hàng ${orderId}` },
            unit_amount: usdAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `http://localhost:4200/home?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: "http://localhost:4200/payment-failed",
    });

    // Trả cả checkoutUrl và sessionId
    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stripe error" });
  }
});

// CHECK STRIPE PAYMENT STATUS
router.get("/stripe/status", async (req, res) => {
  try {
    const sessionId = String(req.query.sessionId);
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({ paid: session.payment_status === "paid" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stripe status error" });
  }
});

export default router;
