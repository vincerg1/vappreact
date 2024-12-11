import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import OfferList from './OfferList';
import OfferForm from './OfferForm';
import SuggestedOffers from './SuggestedOffers';
import DailyChallengeForm from './DailyChallengeForm';
import IncentivoList from './IncentivoList'; // Asegúrate de importar el IncentivoList
import IncentivoForm from './IncentivoForm'; // Asegúrate de importar el IncentivoForm
import '../styles/OfferModule.css';

const OffersModule = () => {
  const navigate = useNavigate();

  return (
    <div className="offers-module">
      <h1>Offers Module</h1>
      <div className="button-container">
        <button onClick={() => navigate('/offers/create')}>Create New Offer</button>
        <button onClick={() => navigate('/offers/suggested')}>Suggested Offers</button>
        <button onClick={() => navigate('/offers/existing')}>Existing Offers</button>
        <button onClick={() => navigate('/offers/daily-challenge/create')}>Create Daily Challenge</button>
        <button onClick={() => navigate('/offers/incentivo')}>Incentivos</button> {/* Nuevo botón para incentivos */}
      </div>
      <Routes>
        <Route path="create" element={<OfferForm />} />
        <Route path="edit/:id" element={<OfferForm />} />
        <Route path="suggested" element={<SuggestedOffers />} />
        <Route path="existing" element={<OfferList />} />
        <Route path="daily-challenge/create" element={<DailyChallengeForm />} />
        <Route path="incentivo" element={<IncentivoList />} /> {/* Ruta para la lista de incentivos */}
        <Route path="incentivo/create" element={<IncentivoForm />} /> {/* Ruta para crear incentivos */}
        <Route path="incentivo/edit/:id" element={<IncentivoForm />} /> {/* Ruta para editar incentivos */}
      </Routes>
    </div>
  );
};

export default OffersModule;
