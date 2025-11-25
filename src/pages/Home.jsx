import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import products from '../data/products.js';
import './Home.css';
import '../styles/global.css';

const Home = () => {
  const navigate = useNavigate();

  // Track size and quantity per product
  const [selectedSizes, setSelectedSizes] = useState(
    products.reduce((acc, p) => ({ ...acc, [p.id]: p.sizes[0] }), {})
  );
  const [quantities, setQuantities] = useState(
    products.reduce((acc, p) => ({ ...acc, [p.id]: 1 }), {})
  );

  const handleSizeChange = (productId, size) => {
    setSelectedSizes(prev => ({ ...prev, [productId]: size }));
  };

  const handleQuantityChange = (productId, qty) => {
    setQuantities(prev => ({ ...prev, [productId]: qty }));
  };

  const handleBuyNow = (product) => {
    navigate('/checkout', {
      state: {
        product: { ...product, selectedSize: selectedSizes[product.id] },
        quantity: quantities[product.id],
      },
    });
  };

  return (
    <div className="home-container">
      
      <main className="home-main gradient-wrapper">
        <h1 className="home-title">✨ Featured Products ✨</h1>

        <div className="product-grid">
          {products.map((product) => {
            const basePrice = product.price;
            const quantity = quantities[product.id];
            const finalPrice = basePrice * quantity;
            const compareAtPrice = (basePrice + 10) * quantity;

            return (
              <div key={product.id} className="product-card shadow-lg rounded-lg">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-image rounded-md"
                />

                <h2 className="product-name">
                  {product.name}
                  {product.isNew && <span className="new-badge">New!</span>}
                </h2>
                <p className="product-description">{product.description}</p>

                {/* Size dropdown */}
                <div className="form-group">
                  <label htmlFor={`size-select-${product.id}`}>Choose size:</label>
                  <select
                    id={`size-select-${product.id}`}
                    value={selectedSizes[product.id]}
                    onChange={(e) => handleSizeChange(product.id, e.target.value)}
                    className="size-dropdown"
                  >
                    {product.sizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity input */}
                <div className="form-group">
                  <label htmlFor={`quantity-input-${product.id}`}>Quantity:</label>
                  <input
                    id={`quantity-input-${product.id}`}
                    type="number"
                    min="1"
                    max={product.maxQuantity}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(product.id, Number(e.target.value))}
                    className="quantity-input"
                  />
                </div>

                {/* Price info */}
                <div className="price-info">
                  <span className="price-unit">Unit Price: ${basePrice.toFixed(2)}</span>
                  <span className="price-original">Compare at: ${compareAtPrice.toFixed(2)}</span>
                  <span className="price-sale">Total: ${finalPrice.toFixed(2)}</span>
                </div>

                <button
                  onClick={() => handleBuyNow(product)}
                  className="buy-button hover:scale-105 transition-transform"
                >
                  🛒 Buy Now
                </button>

                <p className="supplier-link">
                  <a href={product.supplierUrl} target="_blank" rel="noopener noreferrer">
                    View Supplier
                  </a>
                </p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Home;