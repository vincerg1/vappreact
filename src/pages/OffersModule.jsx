import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import OfferList from './OfferList';
import OfferForm from './OfferForm';
import IncentivoList from './IncentivoList';
import IncentivoForm from './IncentivoForm';
import '../styles/OfferModule.css';

const OffersModule = () => {
  const navigate = useNavigate();

  return (
    <div className="offers-module">
      <h1>Offers Module</h1>
      <div className="button-container">
        <button onClick={() => navigate('/offers/create')}>Create New Offer</button>
        <button onClick={() => navigate('/offers/existing')}>Existing Offers</button>
        <button onClick={() => navigate('/offers/incentivo')}>Incentivos</button>
      </div>
      <Routes>
        {/* Rutas existentes */}
        <Route path="create" element={<OfferForm />} />
        <Route path="edit/:id" element={<OfferForm />} />
        <Route path="existing" element={<OfferList />} />

        {/* Rutas para Incentivos */}
        <Route path="incentivo" element={<IncentivoList />} />
        <Route path="incentivo/create" element={<IncentivoForm />} />
        <Route path="incentivo/edit/:id" element={<IncentivoForm />} />
      </Routes>
    </div>
  );
};

export default OffersModule;
