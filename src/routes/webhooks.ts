import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(400).json({ error: 'Missing signature' });

  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); }
  catch (e: any) { return res.status(400).json({ error: 'Signature verification failed' }); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) await prisma.order.update({ where: { id: orderId }, data: { status: 'confirmed', stripePaymentIntentId: session.payment_intent as string } });
  }
  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.orderId;
    if (orderId) await prisma.order.update({ where: { id: orderId }, data: { status: 'payment_failed' } });
  }

  res.json({ received: true });
});

export default router;