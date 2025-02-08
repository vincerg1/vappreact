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
      <h2>Clientes</h2>
      <div className="botones-acciones">
        <button onClick={() => navigate('/clientes/crear')}>Crear Cliente</button>
        <button onClick={() => navigate('/clientes/mapa')}>Mapa Clientes</button>
        <button onClick={() => navigate('/clientes/ver')}>Ver Clientes</button>
      </div>
    </div>
  );
}

export default Clientes;
