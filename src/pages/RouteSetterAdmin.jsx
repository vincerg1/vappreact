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
      <h1 className="route-setter-title">Route Setter</h1>
      <div className="route-setter-buttons">
        <button className="route-button" onClick={handleCrearRepartidorClick}>
         <span>Add a Delivery</span> 
        </button>
        <button className="route-button" onClick={handlePrecioDeliveryClick}>
        <span>Delivery Fee </span> 
        </button>
        <button className="route-button" onClick={handleReportsClick}>
        <span>Insights</span>  
        </button>
      </div>

      {showDeliveryPriceModal && (
        <DeliveryPriceManagement showModal={showDeliveryPriceModal} onClose={handleCloseModal} />
      )}

    </div>
  );
};

export default RouteSetterAdmin;
