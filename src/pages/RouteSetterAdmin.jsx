import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryPriceManagement from './DeliveryPriceManagement'; 
import '../styles/RouteSetterAdmin.css';

const RouteSetterAdmin = () => {
  const navigate = useNavigate();
  const [showDeliveryPriceModal, setShowDeliveryPriceModal] = useState(false);

  const handleCrearRepartidorClick = () => {
    navigate('/repartidores');
  };
  const handlePrecioDeliveryClick = () => {
    setShowDeliveryPriceModal(true);
  };
  const handleReportsClick = () => {
    navigate('/repartidores-reportes');
  };
  const handleCloseModal = () => {
    setShowDeliveryPriceModal(false);
  };

  return (
    <div className="route-setter-container">
      <h1 className="route-setter-title">Route Setter - Administración</h1>
      <div className="route-setter-buttons">
        <button className="route-button" onClick={handleCrearRepartidorClick}>
          Crear Repartidor
        </button>
        <button className="route-button" onClick={handlePrecioDeliveryClick}>
          Precio Delivery
        </button>
        <button className="route-button" onClick={handleReportsClick}>
          Reports
        </button>
      </div>

      {showDeliveryPriceModal && (
        <DeliveryPriceManagement showModal={showDeliveryPriceModal} onClose={handleCloseModal} />
      )}

      <footer className="route-setter-footer">
        <p><strong>VoltaPizzaApp 2025.</strong></p>
        <div className="social-icons">
          <i className="fab fa-instagram"></i>
          <i className="fab fa-tiktok"></i>
          <i className="fab fa-whatsapp"></i>
        </div>
      </footer>
    </div>
  );
};

export default RouteSetterAdmin;
