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

// ✅ JSON parser for all non-webhook routes
app.use(express.json());

// ✅ Stripe checkout route
app.post('/create-checkout-session', async (req, res) => {
  const {
    product,
    quantity = 1,
    customerEmail,
    selectedSize,
    // keep these from frontend so we have a non-null baseline
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
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      // collect shipping address in Stripe as well
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
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
      // include shipping info in metadata as a fallback
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

    // Insert initial order using frontend shipping info as baseline
    await insertOrder({
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
    });

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

    // Stripe-filled values
    const email = session.customer_email || session.customer_details?.email || null;
    const product_name = session.metadata?.productName || null;
    const product_size = session.metadata?.productSize || null;

    // Prefer Stripe shipping_details, fall back to customer_details, then metadata
    const shipping = session.shipping_details || null;
    const stripeName = shipping?.name || session.customer_details?.name || null;
    const stripeAddress =
      shipping?.address ||
      session.customer_details?.address ||
      null;

    // Fetch existing order to avoid overwriting good data with nulls
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (fetchError) {
      console.error('❌ Supabase fetch error:', fetchError.message);
    }

    if (existingOrder) {
      // Parse existing address JSON safely
      let existingAddress = null;
      try {
        existingAddress =
          typeof existingOrder.shipping_address === 'string'
            ? JSON.parse(existingOrder.shipping_address)
            : existingOrder.shipping_address;
      } catch {
        existingAddress = null;
      }

      // Metadata fallback
      const metaAddress = {
        line1: session.metadata?.shippingAddressLine1 || null,
        city: session.metadata?.shippingCity || null,
        state: session.metadata?.shippingState || null,
        postal_code: session.metadata?.shippingPostalCode || null,
      };

      const chosenName = stripeName || existingOrder.shipping_name || session.metadata?.shippingName || null;
      const chosenAddress =
        stripeAddress ||
        existingAddress ||
        (metaAddress.line1 || metaAddress.city || metaAddress.state || metaAddress.postal_code ? metaAddress : null);

      const updatePayload = {
        status: 'completed',
        // Don’t null-out email if we already had one
        email: email || existingOrder.email,
        product_name: product_name || existingOrder.product_name,
        product_size: product_size || existingOrder.product_size,
        shipping_name: chosenName || existingOrder.shipping_name || null,
        shipping_address: chosenAddress ? JSON.stringify(chosenAddress) : (existingOrder.shipping_address || null),
      };

      console.log('📝 Update payload:', updatePayload);

      const { error: updateError } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('stripe_session_id', sessionId);

      if (updateError) {
        console.error('❌ Supabase update error:', updateError.message);
      } else {
        console.log('✅ Order updated to completed (with safe fallbacks)');
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