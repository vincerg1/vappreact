import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import CrearCliente from './CrearCliente';
import VerClientes from './VerClientes';
import MapaClientes from './MapaClientes';
import '../styles/Clientes.css'; 

function Clientes() {
  const navigate = useNavigate();

  return (
<div className="clientes-container">
  <h1 className="clientes-title">Manage Clients</h1>
  <div className="botones-acciones">
    <button className="clientes-button" onClick={() => navigate('/clientes/crear')}>
      <span>Create </span>
    </button>
    <button className="clientes-button" onClick={() => navigate('/clientes/mapa')}>
      <span>Map</span>
    </button>
    <button className="clientes-button" onClick={() => navigate('/clientes/ver')}>
      <span>View</span>
    </button>
  </div>
</div>

  ); 
}

export default Clientes;
