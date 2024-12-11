import React from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryPriceManagement from './DeliveryPriceManagement'; // Asegúrate de que la ruta sea correcta
import '../styles/routeSetterAdmin_style.css'; // Asegúrate de crear este archivo para los estilos

const RouteSetterAdmin = () => {
  const navigate = useNavigate(); // useNavigate() debe usarse correctamente aquí

  const handleCrearRepartidorClick = () => {
    navigate('/repartidores'); // Asegúrate de que la ruta sea correcta
  };

  const handlePrecioDeliveryClick = () => {
    setShowDeliveryPriceModal(true);
  };

  const handleReportsClick = () => {
    navigate('/reports'); // Asegúrate de que la ruta sea correcta
  };

  const [showDeliveryPriceModal, setShowDeliveryPriceModal] = React.useState(false);

  const handleCloseModal = () => {
    setShowDeliveryPriceModal(false);
  };

  return (
    <div className="route-setter-container">
      <h1 className="PDCRL">Route Setter - Administración</h1>
      <section className="contenedorRS">
        <button className="background_icon_button crear-repartidor" onClick={handleCrearRepartidorClick}>
          <span>Crear Repartidor</span>
        </button>
        <button className="background_icon_button precio-delivery" onClick={handlePrecioDeliveryClick}>
          <span>Precio Delivery</span>
        </button>
        <button className="background_icon_button reports" onClick={handleReportsClick}>
          <span>Reports</span>
        </button>
      </section>

      {showDeliveryPriceModal && (
        <DeliveryPriceManagement showModal={showDeliveryPriceModal} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default RouteSetterAdmin;
