import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import products from '../data/products.js';   // ✅ import your products array
import './Home.css';
import '../styles/global.css';

const Home = () => {
  const navigate = useNavigate();

  // Default to the first product
  const [selectedId, setSelectedId] = useState(products[0].id);
  const [selectedSize, setSelectedSize] = useState(products[0].sizes[0]);
  const [quantity, setQuantity] = useState(1);

  const selectedProduct = products.find(p => p.id === selectedId);
  const basePrice = selectedProduct.price;
  const finalPrice = basePrice * quantity;
  const compareAtPrice = (basePrice + 10) * quantity;

  const handleBuyNow = () => {
    navigate('/checkout', {
      state: {
        product: { ...selectedProduct, price: basePrice, selectedSize },
        quantity,
      },
    });
  };

  return (
    <div className="home-container">
      <main className="home-main gradient-wrapper">
        <h1 className="home-title">✨ Featured Products ✨</h1>

        <div className="product-grid">
          <div className="product-card shadow-lg rounded-lg">
            <img
              src={selectedProduct.image}
              alt={selectedProduct.name}
              className="product-image rounded-md"
            />

            <h2 className="product-name">{selectedProduct.name}</h2>
            <p className="product-description">{selectedProduct.description}</p>

            {/* ✅ Size dropdown from product.sizes */}
            <div className="form-group">
              <label htmlFor="size-select">Choose size:</label>
              <select
                id="size-select"
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="size-dropdown"
              >
                {selectedProduct.sizes.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* ✅ Quantity input */}
            <div className="form-group">
              <label htmlFor="quantity-input">Quantity:</label>
              <input
                id="quantity-input"
                type="number"
                min="1"
                max={selectedProduct.maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="quantity-input"
              />
            </div>

            {/* ✅ Price info */}
            <div className="price-info">
              <span className="price-unit">Unit Price: ${basePrice.toFixed(2)}</span>
              <span className="price-original">Compare at: ${compareAtPrice.toFixed(2)}</span>
              <span className="price-sale">Total: ${finalPrice.toFixed(2)}</span>
            </div>

            <button
              onClick={handleBuyNow}
              className="buy-button hover:scale-105 transition-transform"
            >
              🛒 Buy Now
            </button>

            {/* ✅ Supplier link */}
            <p className="supplier-link">
              <a href={selectedProduct.supplierUrl} target="_blank" rel="noopener noreferrer">
                View Supplier
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;