import '../styles/footer.css';
import '../styles/global.css';
import '../styles/header.css';
import React from 'react';
import { useNavigate } from 'react-router-dom';

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
    <div>
      <h1 className="PDCRL">Panel de Control / Información </h1>
      <section>
        <div className="Form_info">
          <h1 className="h1_Form_info">Editar Información Básica Sobre:</h1>
          <button className="Form_info_button" onClick={handleEditCompanyInfo}>
            Empresa
          </button>
          <button className="Form_info_button" onClick={handleEditPaymentInfo}>
            +Medios de Pago
          </button>
          <button className="Form_info_button" onClick={handleEditRestaurantInfo}>
            Horarios
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
