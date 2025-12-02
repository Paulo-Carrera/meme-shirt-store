import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';

import { getSupabaseClient } from './supabase/client.js';
import { insertOrder } from './supabase/insertOrder.js';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = getSupabaseClient();

// ✅ CORS setup
const allowedOrigins = process.env.FRONTEND_URL?.split(',') || [];
app.use(
  cors({
    origin: (origin, callback) => {
      console.log('🌐 Incoming origin:', origin);
      console.log('✅ Allowed origins:', allowedOrigins);
      if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
        callback(null, true);
      } else {
        console.warn('❌ CORS blocked:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('/create-checkout-session', cors());
app.use(express.json());

// ✅ Create Checkout Session (no webhook dependency)
app.post('/create-checkout-session', async (req, res) => {
  const {
    product,
    quantity = 1,
    customerEmail,
    selectedSize,
    shippingName,
    shippingAddressLine1,
    shippingCity,
    shippingState,
    shippingPostalCode,
  } = req.body;

  console.log('📦 Incoming checkout request:', {
    product,
    quantity,
    customerEmail,
    selectedSize,
    shippingName,
    shippingAddressLine1,
    shippingCity,
    shippingState,
    shippingPostalCode,
  });

  const totalPrice = product.price * quantity;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${product.name} (${selectedSize})`,
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

    // Insert order immediately with shipping info from frontend
    const insertPayload = {
      product_id: product.id,
      product_name: product.name,
      product_size: selectedSize,
      quantity,
      total_price: totalPrice,
      status: 'initiated',
      email: customerEmail,
      stripe_session_id: session.id,
      shipping_name: shippingName,
      shipping_address_line1: shippingAddressLine1,
      shipping_city: shippingCity,
      shipping_state: shippingState,
      shipping_postal_code: shippingPostalCode,
    };

    console.log('📝 Supabase insert payload:', insertPayload);
    await insertOrder(insertPayload);

    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe session creation failed:', err.message);
    await insertOrder({
      product_name: product?.name || 'unknown',
      product_size: selectedSize || 'unknown',
      quantity,
      total_price: product?.price || 0,
      status: 'failed',
      email: customerEmail || 'unknown',
      stripe_session_id: 'none',
    });
    res.status(500).json({ error: err.message });
  }
});

// ✅ Order details route for success page
app.get('/order-details', async (req, res) => {
  const { session_id } = req.query;
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', session_id)
    .single();

  if (error || !data) return res.status(500).json({ error: 'Order not found' });
  res.json(data);
});

// ✅ Ping route
app.get('/ping', (req, res) => {
  console.log('🔁 Ping received at', new Date().toISOString());
  res.status(200).send('pong');
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));