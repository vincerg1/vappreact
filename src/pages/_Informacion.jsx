import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/InfoModule.css'; // Agregar un archivo de estilos para estandarización

function App() {
  const navigate = useNavigate();

  const handleEditCompanyInfo = () => {
    navigate('/_Inicio/_Informacion/_Info_Empresa');
  };
  const handleEditPaymentInfo = () => {
    navigate('/_Inicio/_Informacion/_Info_MP');
  };
  const handleEditRestaurantInfo = () => {
    navigate('/_Inicio/_Informacion/_Info_Restauratsx');
  };

  return (
    <div className="info-module-container">
      <h1 className="info-module-title">Información Básica</h1>
      <div className="info-module-buttons">
        <button className="info-button" onClick={handleEditCompanyInfo}>
          Empresa
        </button>
        <button className="info-button" onClick={handleEditPaymentInfo}>
          Medios de Pago
        </button>
        <button className="info-button" onClick={handleEditRestaurantInfo}>
          Horarios
        </button>
      </div>
      <footer className="info-module-footer">
        <p><strong>VoltaPizzaApp 2025.</strong></p>
        <div className="social-icons">
          <i className="fab fa-instagram"></i>
          <i className="fab fa-tiktok"></i>
          <i className="fab fa-whatsapp"></i>
        </div>
      </footer>
    </div>
  );
}

export default App;
