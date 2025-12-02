import { getSupabaseClient } from './client.js';
const supabase = getSupabaseClient();

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
      },
    ]);

  if (error) console.error('❌ Supabase insert error:', error.message);
  else console.log('✅ Order inserted:', data);
  return data;
}