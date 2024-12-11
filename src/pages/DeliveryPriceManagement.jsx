import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import '../styles/DeliveryPriceManagement.css';

const DeliveryPriceManagement = ({ showModal, onClose }) => {
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (showModal) {
      // Fetch current price from the database
      fetchPrice();
    }
  }, [showModal]);

  const fetchPrice = async () => {
    try {
      const response = await axios.get('http://localhost:3001/delivery/price');
      setPrice(response.data.precio);
    } catch (error) {
      console.error('Error fetching delivery price:', error);
    }
  };

  const handleInputChange = (e) => {
    setPrice(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/precio-delivery', { precio: price }); // Cambio aquí para que coincida con el backend
      fetchPrice(); // Refresh the price after updating
      onClose(); // Close modal after updating
    } catch (error) {
      console.error('Error updating delivery price:', error);
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>X</button>
        <h2>Gestión de Precio de Delivery</h2>
        <form onSubmit={handleSubmit} className="delivery-price-form">
          <div className="form-group">
            <label htmlFor="precio">Precio (€):</label>
            <input
              type="number"
              id="precio"
              name="precio"
              value={price}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit" className="update-price-button">Actualizar Precio</button>
        </form>
      </div>
    </div>
  );
};

export default DeliveryPriceManagement;
