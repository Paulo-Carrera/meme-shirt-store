import React, { useState } from 'react';
import './ProductCard.css';
import '../styles/global.css';
import products from '../data/products'; // assuming you moved product data to a separate file

const ProductCard = () => {
  const [selectedId, setSelectedId] = useState(products[0].id);
  const [selectedSize, setSelectedSize] = useState(products[0].sizes[0]);
  const [quantity, setQuantity] = useState(1);

  const selectedProduct = products.find(p => p.id === selectedId);
  const basePrice = selectedProduct.price;
  const compareAtPrice = basePrice + 10;
  const finalPrice = quantity >= 2 ? basePrice * quantity * 0.9 : basePrice * quantity;

  const handleBuyClick = async () => {
    try {
      const orderData = {
        product: {
          ...selectedProduct,
          price: basePrice,
          selectedSize,
        },
        quantity,
        customerEmail: 'test@example.com',
        shippingName: 'John Doe',
        shippingAddressLine1: '123 Main St',
        shippingCity: 'Los Angeles',
        shippingState: 'CA',
        shippingPostalCode: '90001',
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('❌ No URL returned from Stripe');
      }
    } catch (err) {
      console.error('❌ Error creating Stripe session:', err);
    }
  };

  return (
    <div className="product-card">
      <div className="image-wrapper">
        <img
          src={selectedProduct.image}
          alt={selectedProduct.name}
          className="product-image"
        />
      </div>
      <div className="product-info">
        <h2 className="product-name">{selectedProduct.name}</h2>
        <p className="product-description">{selectedProduct.description}</p>

        {/* 🔍 Debug block for live price check */}
        <p style={{ color: 'lime', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Debug: Price is ${basePrice} | Size: {selectedSize}
        </p>

        <label htmlFor="size-dropdown">Choose size:</label>
        <select
          id="size-dropdown"
          className="size-dropdown"
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
        >
          {selectedProduct.sizes.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>

        <label htmlFor="quantity-input">Quantity:</label>
        <input
          id="quantity-input"
          className="quantity-input"
          type="number"
          min="1"
          max={selectedProduct.maxQuantity}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />

        <div className="price-group">
          <span className="original-price">${compareAtPrice.toFixed(2)}</span>
          <span className="product-price">${finalPrice.toFixed(2)}</span>
        </div>

        {quantity >= 2 && (
          <p className="bulk-discount">Bulk discount applied!</p>
        )}

        <button className="buy-button" onClick={handleBuyClick}>
          Buy Now
        </button>
      </div>
    </div>
  );
};

export default ProductCard;