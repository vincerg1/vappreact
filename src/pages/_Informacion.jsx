import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/InfoModule.css'; 

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
      <h1 className="info-module-title">Basic Information</h1>
      <div className="info-module-buttons">
        <button className="info-button" onClick={handleEditCompanyInfo}>
        <span>Company</span>
        </button>
        <button className="info-button" onClick={handleEditPaymentInfo}>
        <span>Payment Methods</span>
        </button>
        <button className="info-button" onClick={handleEditRestaurantInfo}>
       <span>Schedules</span> 
        </button>
      </div>
  
    </div>
  );
}

export default App;
