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
      <h1 className="menu-module-title">Manage Menu</h1>
      <div className="menu-module-buttons">
        <button className="menu-button" onClick={handleCreatePlato}>
          <span>Make a Pizza </span>
        </button>
        <button className="menu-button" onClick={handleCreatePartner}>
        <span>Make a Partner</span>
        </button>
        <button className="menu-button" onClick={handleMenuOverview}>
        <span>Menu Overview</span>
        </button>
        <button className="menu-button" onClick={handleGestionarIngredientesExtras}>
        <span>Extra Ingredients</span>
        </button>
      </div>
    </div>
  );
};

export default _Menu_p1;
