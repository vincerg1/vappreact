import React from 'react';
import { useNavigate } from 'react-router-dom';

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

  return (
    <div>
      <h1 className="PDCRL">Panel de Control / Menú</h1>
      <section>
        <div className="Form_info2">
          <h1 className="h1_Form_info">Gestión del Menú</h1>
          <button 
          className="Form_info_button"
           onClick={handleCreatePlato}
           >Crear Una Pizza
          </button>
          <button 
          className="Form_info_button"
           onClick={handleCreatePartner}
           >Crear un Partner
          </button>
          <button 
          className="MenuOverview" 
          onClick={handleMenuOverview}
          >Menu Overview
          </button>
        </div>
      </section>
    </div>
  );
};

export default _Menu_p1;
