import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';

import { getSupabaseClient } from './supabase/client.js';
import { insertOrder } from './supabase/insertOrder.js';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = getSupabaseClient();

// ✅ CORS setup — supports multiple origins via env
const allowedOrigins = process.env.FRONTEND_URL?.split(',') || [];

app.use(cors({
  origin: (origin, callback) => {
    console.log('🌐 Incoming origin:', origin);
    console.log('✅ Allowed origins:', allowedOrigins);
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.includes('vercel.app')
    ) {
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('/create-checkout-session', cors());

// ✅ JSON parser for all non-webhook routes
app.use(express.json());

// ✅ Stripe checkout route
app.post('/create-checkout-session', async (req, res) => {
  const {
    product,
    quantity = 1,
    customerEmail,
    shippingName,
    shippingAddressLine1,
    shippingCity,
    shippingState,
    shippingPostalCode,
    selectedSize, // 👕 added size support
  } = req.body;

  console.log('📦 Incoming checkout request:', {
    product,
    quantity,
    customerEmail,
    shippingName,
    shippingAddressLine1,
    shippingCity,
    shippingState,
    shippingPostalCode,
    selectedSize,
  });

  const totalPrice = product.price * quantity;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${product.name} (${selectedSize})`, // 👕 show size in Stripe
              description: product.description,
              images: [product.image],
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity,
        },
      ],
      success_url: `${allowedOrigins[0]}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${allowedOrigins[0]}/cancel`,
      metadata: {
        productName: product.name,
        productSize: selectedSize,
        quantity: String(quantity),
        shippingName,
        shippingAddressLine1,
        shippingCity,
        shippingState,
        shippingPostalCode,
      },
    });

    console.log('✅ Stripe session created:', session.id);

    await insertOrder({
      product_id: product.id,
      product_name: product.name,
      product_size: selectedSize,
      quantity,
      total_price: totalPrice,
      status: 'initiated',
      email: customerEmail,
      stripe_session_id: session.id,
      shipping_name: shippingName,
      shipping_address: JSON.stringify({
        line1: shippingAddressLine1,
        city: shippingCity,
        state: shippingState,
        postal_code: shippingPostalCode,
      }),
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe session creation failed:', err.message);

    await insertOrder({
      product_name: product?.name || 'unknown',
      product_size: selectedSize || 'unknown',
      quantity: 1,
      total_price: product?.price || 0,
      status: 'failed',
      email: customerEmail || 'unknown',
      stripe_session_id: 'none',
    });

    res.status(500).json({ error: err.message });
  }
});

// ✅ Stripe webhook — raw body parser scoped only to this route
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ Webhook received:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const sessionId = session.id;
    const email = session.customer_email || 'unknown';
    const product_name = session.metadata?.productName || 'unknown';
    const product_size = session.metadata?.productSize || 'unknown';

    const name = session.metadata?.shippingName;
    const address = {
      line1: session.metadata?.shippingAddressLine1,
      city: session.metadata?.shippingCity,
      state: session.metadata?.shippingState,
      postal_code: session.metadata?.shippingPostalCode,
    };

    console.log('🔍 Session ID:', sessionId);
    console.log('📦 Product:', product_name, '👕 Size:', product_size);
    console.log('📧 Email:', email);

    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (fetchError) {
      console.error('❌ Supabase fetch error:', fetchError.message);
    }

    if (existingOrder) {
      const updatePayload = {
        status: 'completed',
        email,
        product_name,
        product_size,
        shipping_name: name,
        shipping_address: JSON.stringify(address),
      };

      console.log('📝 Update payload:', updatePayload);

      const { error: updateError } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('stripe_session_id', sessionId);

      if (updateError) {
        console.error('❌ Supabase update error:', updateError.message);
      } else {
        console.log('✅ Order updated to completed');
      }
    } else {
      console.warn('⚠️ No matching order found for session:', sessionId);
    }
  }

  res.status(200).json({ received: true });
});

// ✅ Order details route for frontend success page
app.get('/order-details', async (req, res) => {
  const { session_id } = req.query;

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', session_id)
    .single();

  if (error || !data) {
    return res.status(500).json({ error: 'Order not found' });
  }

  res.json(data);
});

// ✅ Ping route for cronjob keep-alive
app.get('/ping', (req, res) => {
  console.log('🔁 Ping received at', new Date().toISOString());
  res.status(200).send('pong');
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));