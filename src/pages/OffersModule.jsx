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
  <h1 className="offers-title">Manage Offers</h1>
  <div className="button-container-off">
    <button className="offers-button" onClick={() => navigate('/offers/create')}>
      <span>Create New Offer</span>
    </button>
    <button className="offers-button" onClick={() => navigate('/offers/existing')}>
      <span>Existing Offers</span>
    </button>
    <button className="offers-button" onClick={() => navigate('/offers/incentivo')}>
      <span>Incentives</span>
    </button>
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
