import React from 'react';
import { useNavigate } from 'react-router-dom';
import inicio_style from '../styles/inicio_style.css'; // Asegúrate de que el CSS esté importado correctamente

export const Inicio = () => {
  const navigate = useNavigate();

  const handleInformacionClick = () => {
    navigate('/_Inicio/_Informacion');
  };

  const handleMenuClick = () => {
    navigate('/_Inicio/_Menu_p1');
  };

  const handleInvClick = () => {
    navigate('/_Inicio/_InvIngDB');
  };

  const handleOffersClick = () => {
    navigate('/offers');
  };

  const handleClientesClick = () => {
    navigate('/clientes');
  };

  const handleSeguimientoClick = () => {
    navigate('/seguimiento');
  };

  const handleRouteSetterClick = () => {
    navigate('/RouteSetterAdmin'); 
  };

  return (
    <div>
      <h1 className="PDCRL">Panel de Control / My_Backoffice</h1>
      <section className="contenedorPC">
        <button className="background_icon_button informacion" onClick={handleInformacionClick}>
          <span>Información</span>
        </button>
        <button className="background_icon_button menu" onClick={handleMenuClick}>
          <span>Menú</span>
        </button>
        <button className="background_icon_button clientes" onClick={handleClientesClick}>
          <span>Clientes</span>
        </button>
        <button className="background_icon_button inventario" onClick={handleInvClick}>
          <span>Inventario</span>
        </button>
        <button className="background_icon_button seguimiento" onClick={handleSeguimientoClick}>
          <span>Seguimiento</span>
        </button>
        <button className="background_icon_button ofertas" onClick={handleOffersClick}>
          <span>Ofertas</span>
        </button>
        <button className="background_icon_button routesetter" onClick={handleRouteSetterClick}>
          <span>RouteSetter</span>
        </button>
      </section>
    </div>
  );
};

export default Inicio;
