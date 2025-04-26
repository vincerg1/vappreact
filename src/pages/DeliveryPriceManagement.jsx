import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DeliveryPriceManagement = ({ showModal, onClose }) => {
  const [priceKm, setPriceKm] = useState('');        // "precio" en la DB
  const [basePrice, setBasePrice] = useState('');    // "precioBase"
  const [over23hFee, setOver23hFee] = useState('');
  const [weekendFee, setWeekendFee] = useState('');
  const [weatherFee, setWeatherFee] = useState('');

  useEffect(() => {
    if (showModal) {
      fetchDeliveryData();
    }
  }, [showModal]);

  const fetchDeliveryData = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/delivery/price`);
      const data = response.data;

      // Rellenamos los states con lo que viene de la DB:
      setPriceKm(data.precio || '');
      setBasePrice(data.precioBase || '');
      setOver23hFee(data.over23hFee || '');
      setWeekendFee(data.weekendFee || '');
      setWeatherFee(data.weatherFee || '');
    } catch (error) {
      console.error('Error fetching delivery data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Hacemos POST con los 5 campos
      await axios.post(`${process.env.REACT_APP_API_URL}/precio-delivery`, {
        precio: parseFloat(priceKm) || 0,
        precioBase: parseFloat(basePrice) || 0,
        over23hFee: parseFloat(over23hFee) || 0,
        weekendFee: parseFloat(weekendFee) || 0,
        weatherFee: parseFloat(weatherFee) || 0
      });

      onClose();  // Cerrar modal
    } catch (error) {
      console.error('Error updating delivery data:', error);
    }
  };

  if (!showModal) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>X</button>
        <h2>Gestión de Tarifas de Delivery</h2>

        <form onSubmit={handleSubmit} className="delivery-price-form">
          <div className="form-group">
            <label>Precio por km (€/km):</label>
            <input
              type="number"
              step="0.01"
              value={priceKm}
              onChange={(e) => setPriceKm(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Precio base (€/envío):</label>
            <input
              type="number"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Recargo después de 23h (€/envío):</label>
            <input
              type="number"
              step="0.01"
              value={over23hFee}
              onChange={(e) => setOver23hFee(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Recargo fin de semana (€/envío):</label>
            <input
              type="number"
              step="0.01"
              value={weekendFee}
              onChange={(e) => setWeekendFee(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Recargo por clima (€/envío):</label>
            <input
              type="number"
              step="0.01"
              value={weatherFee}
              onChange={(e) => setWeatherFee(e.target.value)}
            />
          </div>

          <button type="submit" className="update-price-button">
            Actualizar Tarifas
          </button>
        </form>
      </div>
    </div>
  );
};

export default DeliveryPriceManagement;
