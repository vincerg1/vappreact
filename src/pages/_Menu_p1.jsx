import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MenuModule.css'; // Archivo de estilos para estandarización

const _Menu_p1 = () => {
  const navigate = useNavigate();

  const handleCreatePlato = () => {
    navigate('/_Inicio/_Menu_p1/_Menu_p2_crearMenu');
  };
  const handleCreatePartner = () => {
    navigate('/PartnerCreator');
  };
  const handleMenuOverview = () => {
    navigate('/_Inicio/_Menu_p1/_MenuOverview');
  };
  const handleGestionarIngredientesExtras = () => {
    navigate('/GestionarIngredientesExtras');
  };

  return (
    <div className="menu-module-container">
      <h1 className="menu-module-title">Gestión del Menú</h1>
      <div className="menu-module-buttons">
        <button className="menu-button" onClick={handleCreatePlato}>
          Crear Una Pizza
        </button>
        <button className="menu-button" onClick={handleCreatePartner}>
          Crear un Partner
        </button>
        <button className="menu-button" onClick={handleMenuOverview}>
          Menu Overview
        </button>
        <button className="menu-button" onClick={handleGestionarIngredientesExtras}>
          Gestionar Ingredientes Extras
        </button>
      </div>
      <footer className="menu-module-footer">
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

export default _Menu_p1;
