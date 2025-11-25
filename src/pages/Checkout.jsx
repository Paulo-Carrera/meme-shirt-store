import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import products from '../data/products.js';
import './Checkout.css';

const Checkout = () => {
  const location = useLocation();
  const spinnerRef = useRef(null);

  const initialProduct = location.state?.product || null;
  const initialQuantity = location.state?.quantity || 1;

  const [selectedProductId, setSelectedProductId] = useState(initialProduct?.id || products[0].id);
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      console.log('Selected product:', selectedProduct.name);
    }
  }, [selectedProduct]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const form = e.target;
    setLoading(true);

    setTimeout(() => {
      spinnerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      const selectedSize = form.selectedSize.value; // 👕 FIX: read size from form

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: selectedProduct,
          quantity,
          customerEmail: form.email.value,
          shippingName: form.shippingName.value,
          shippingAddressLine1: form.shippingAddressLine1.value,
          shippingCity: form.shippingCity.value,
          shippingState: form.shippingState.value,
          shippingPostalCode: form.shippingPostalCode.value,
          selectedSize, // 👕 now defined
        }),
      });

      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      console.error('Stripe checkout error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="gradient-wrapper">
      {!loading && <div className="star"></div>}
      <div className="checkout-container">
        <h1 className="checkout-title">Checkout</h1>

        <form onSubmit={handleSubmit} className="checkout-form">
          <label className="checkout-label">
            Product:
            <select
              name="product"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              className="checkout-input"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (${product.price})
                </option>
              ))}
            </select>
          </label>

          {selectedProduct && (
            <div className="product-preview">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="product-image" />
              <p>{selectedProduct.description}</p>
            </div>
          )}

          {/* 👕 NEW SIZE SELECTOR */}
          {selectedProduct?.sizes && (
            <label className="checkout-label">
              Size:
              <select name="selectedSize" required className="checkout-input">
                {selectedProduct.sizes.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          )}

          <label className="checkout-label">
            Quantity:
            <input
              type="number"
              name="quantity"
              min="1"
              max={selectedProduct?.maxQuantity || 10}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="checkout-input"
            />
          </label>

          <label className="checkout-label">
            Email:
            <input type="email" name="email" required placeholder="you@example.com" className="checkout-input" />
          </label>

          <label className="checkout-label">
            Full Name:
            <input type="text" name="shippingName" required placeholder="John Doe" className="checkout-input" />
          </label>

          <label className="checkout-label">
            Street Address:
            <input type="text" name="shippingAddressLine1" required placeholder="123 Main St" className="checkout-input" />
          </label>

          <label className="checkout-label">
            City:
            <input type="text" name="shippingCity" required placeholder="Los Angeles" className="checkout-input" />
          </label>

          <label className="checkout-label">
            State:
            <input type="text" name="shippingState" required placeholder="CA" className="checkout-input" />
          </label>

          <label className="checkout-label">
            ZIP Code:
            <input type="text" name="shippingPostalCode" required placeholder="90001" className="checkout-input" />
          </label>

          <button
            type="submit"
            disabled={loading || !selectedProduct}
            className="checkout-button"
          >
            {loading ? 'Processing...' : 'Buy Now'}
          </button>

          {loading && (
            <div className="spinner-container" ref={spinnerRef}>
              <div className="spinner"></div>
              <h2 className="spinner-heading">Processing...</h2>
              <p className="spinner-text">Creating Stripe session...</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Checkout;