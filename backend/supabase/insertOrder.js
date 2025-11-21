import { getSupabaseClient } from './client.js';
const supabase = getSupabaseClient();

/**
 * Insert a new order into Supabase
 * @param {Object} order
 * @param {string} order.product_id - Internal product ID
 * @param {string} order.product_name - Product name
 * @param {string} order.product_size - Selected size (S–5XL)
 * @param {number} order.quantity - Quantity ordered
 * @param {number} order.total_price - Total price for the order
 * @param {string} order.status - Current order status (e.g. 'pending', 'paid')
 * @param {string} order.email - Customer email
 * @param {string} order.stripe_session_id - Stripe checkout session ID
 * @param {string} order.shipping_name - Recipient name
 * @param {string} order.shipping_address_line1 - Street address
 * @param {string} order.shipping_city - City
 * @param {string} order.shipping_state - State/Province
 * @param {string} order.shipping_postal_code - Postal/ZIP code
 */
export async function insertOrder({
  product_id,
  product_name,
  product_size,
  quantity = 1,
  total_price = null,
  status,
  email,
  stripe_session_id,
  shipping_name,
  shipping_address_line1,
  shipping_city,
  shipping_state,
  shipping_postal_code,
}) {
  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        product_id,
        product_name,
        product_size,
        quantity,
        total_price,
        status,
        email,
        stripe_session_id,
        shipping_name,
        shipping_address_line1,
        shipping_city,
        shipping_state,
        shipping_postal_code,
        created_at: new Date().toISOString(),
      },
    ]);

  if (error) {
    console.error('❌ Supabase insert error:', error.message);
    return null;
  }
  return data;
}