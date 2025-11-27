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

// ✅ Create Checkout Session
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
      shipping_address_collection: { allowed_countries: ['US'] },
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
        shippingName: shippingName || '',
        shippingAddressLine1: shippingAddressLine1 || '',
        shippingCity: shippingCity || '',
        shippingState: shippingState || '',
        shippingPostalCode: shippingPostalCode || '',
      },
    });

    console.log('✅ Stripe session created:', session.id);

    const insertPayload = {
      product_id: product.id,
      product_name: product.name,
      product_size: selectedSize,
      quantity,
      total_price: totalPrice,
      status: 'initiated',
      email: customerEmail,
      stripe_session_id: session.id,
      shipping_name: shippingName || null,
      shipping_address: JSON.stringify({
        line1: shippingAddressLine1 || null,
        city: shippingCity || null,
        state: shippingState || null,
        postal_code: shippingPostalCode || null,
      }),
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

// ✅ Webhook to update order with real shipping
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ Webhook received:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('🔔 Webhook session object:', JSON.stringify(session, null, 2));

    const sessionId = session.id;
    const email = session.customer_email || session.customer_details?.email || null;
    const product_name = session.metadata?.productName || null;
    const product_size = session.metadata?.productSize || null;

    const shipping = session.shipping_details;
    console.log('👤 Stripe customer_details:', session.customer_details);
    console.log('🏠 Stripe shipping_details:', shipping);

    const name = shipping?.name || session.metadata?.shippingName || null;
    const address =
      shipping?.address || {
        line1: session.metadata?.shippingAddressLine1 || null,
        city: session.metadata?.shippingCity || null,
        state: session.metadata?.shippingState || null,
        postal_code: session.metadata?.shippingPostalCode || null,
      };

    console.log('✅ Parsed shipping name:', name);
    console.log('✅ Parsed shipping address:', address);

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existingOrder) {
      const updatePayload = {
        status: 'completed',
        email: email || existingOrder.email,
        product_name: product_name || existingOrder.product_name,
        product_size: product_size || existingOrder.product_size,
        shipping_name: name || existingOrder.shipping_name,
        shipping_address: address ? JSON.stringify(address) : existingOrder.shipping_address,
      };

      console.log('📝 Supabase update payload:', updatePayload);

      const { error: updateError } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('stripe_session_id', sessionId);

      if (updateError) {
        console.error('❌ Supabase update error:', updateError.message);
      } else {
        console.log('✅ Supabase order updated successfully');
      }
    } else {
      console.warn('⚠️ No matching order found for session:', sessionId);
    }
  }

  res.status(200).json({ received: true });
});

// ✅ Order details route
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