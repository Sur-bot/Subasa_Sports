import Stripe from "stripe";
const stripe = new Stripe("sk_test_xxx"); // Secret Key Test Mode

export const stripePayment = async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "vnd",
            product_data: {
              name: `Thanh toán đơn hàng ${orderId}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: "http://localhost:4200/home",
      cancel_url: "http://localhost:4200/payment-failed",
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stripe error" });
  }
};
