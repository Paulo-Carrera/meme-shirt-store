import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Success.css';

export default function Success() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    async function fetchOrder() {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/order-details?session_id=${sessionId}`
      );
      const data = await res.json();
      setOrder(data);
    }

    if (sessionId) fetchOrder();
  }, [sessionId]);

  if (!order) return <p>Loading order details...</p>;

  const formattedDate = order.timestamp
    ? new Date(order.timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not available';

  return (
    <div className="gradient-wrapper">
      <div className="star"></div>
      <div className="success-page receipt-box">
        <h1>MemeThreads</h1>
        <h2>✅ Thank you for your order!</h2>
        <p><strong>Date:</strong> {formattedDate}</p>
        <p><strong>Product:</strong> {order.product_name}</p>
        {/* 👕 Show size */}
        <p><strong>Size:</strong> {order.product_size || 'Not specified'}</p>
        <p><strong>Quantity:</strong> {order.quantity}</p>
        <p><strong>Total Price:</strong> ${order.total_price?.toFixed(2) || 'N/A'}</p>
        <p><strong>Email:</strong> {order.email || 'Not provided'}</p>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Shipping to:</strong> {order.shipping_name}</p>

        {order.shipping_address && (() => {
          const address =
            typeof order.shipping_address === 'string'
              ? JSON.parse(order.shipping_address)
              : order.shipping_address;

          return (
            <p>
              <strong>Address:</strong> {address.line1}, {address.city}, {address.state}{' '}
              {address.postal_code}
            </p>
          );
        })()}

        <p><small><strong>Check email for confirmation.</strong></small></p>
        <a href="/">Back to home</a>
      </div>
    </div>
  );
}