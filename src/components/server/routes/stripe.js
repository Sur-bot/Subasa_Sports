import Stripe from "stripe";
const stripe = new Stripe("sk_test_51SaayePC6D1z0SZ8PjAi2oSaSOtIJJnRoIhytQfAROXRgtjv13bHhiPMd0XwrlLqu49zIo1SV12XS1oMEuAZyKjv00qOTes739");

export const stripePayment = async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    // Quy đổi VND -> USD (Stripe dùng cent)
    const usdAmount = Math.round(amount / 25000 * 100);

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
      success_url: "http://localhost:4200/home",
      cancel_url: "http://localhost:4200/payment-failed",
    });

    res.json({ payUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stripe error" });
  }
};
