import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Clientes.css';

function VerClientes() {
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const response = await axios.get('http://localhost:3001/clientes');
      if (Array.isArray(response.data)) {
        console.log("📊 Datos recibidos de la base de datos:", response.data);
        setClientes(response.data);
      } else {
        setClientes([]);
      }
    } catch (error) {
      console.error('❌ Error al obtener clientes:', error);
      setClientes([]);
    }
  };
  const handleEliminarCliente = async (id_cliente) => {
    if (!window.confirm("¿Seguro que deseas eliminar este cliente?")) return;

    try {
      await axios.delete(`http://localhost:3001/clientes/${id_cliente}`);
      fetchClientes();
    } catch (error) {
      console.error('❌ Error al eliminar cliente:', error);
    }
  };
  const handleSuspenderCliente = async (id_cliente, suspensionPeriod) => {
    try {
      await axios.put(`http://localhost:3001/clientes/suspender/${id_cliente}`, {
        suspensionPeriod,
      });
      console.log(`🚫 Cliente ${id_cliente} suspendido por ${suspensionPeriod} días`);
      fetchClientes();
    } catch (error) {
      console.error('❌ Error al suspender cliente:', error);
    }
  };
  const handleReactivarCliente = async (id_cliente) => {
    try {
      await axios.put(`http://localhost:3001/clientes/reactivar/${id_cliente}`);
      console.log(`✅ Cliente ${id_cliente} reactivado con éxito`);
      fetchClientes();
    } catch (error) {
      console.error('❌ Error al reactivar cliente:', error);
    }
  };
  const handleFiltroChange = (e) => {
    setFiltro(e.target.value);
  };
  const handleSeguimiento = (id_cliente) => {
    navigate(`/clientes/seguimiento/${id_cliente}`);
  };

  const clientesFiltrados = clientes.filter((cliente) =>
    cliente.email.toLowerCase().includes(filtro.toLowerCase())
  );
  return (
    <div className="clientes-container">
      <h2>Lista de Clientes</h2>
      <input
        type="text"
        placeholder="Buscar cliente por email..."
        value={filtro}
        onChange={handleFiltroChange}
        className="buscador"
      />
  
      {/* 🔹 Contenedor con scroll para la tabla */}
      <div className="clientes-table-container">
        <table className="clientes-table">
          <thead>
            <tr>
              <th>ID Cliente</th>
              <th>Email</th>
              <th>Fecha Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((cliente) => (
              <ClienteItem
                key={cliente.id_cliente}
                cliente={cliente}
                onEliminar={() => handleEliminarCliente(cliente.id_cliente)}
                onSuspender={(period) => handleSuspenderCliente(cliente.id_cliente, period)}
                onReactivar={() => handleReactivarCliente(cliente.id_cliente)}
                onSeguimiento={() => handleSeguimiento(cliente.id_cliente)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  
}
function ClienteItem({ cliente, onEliminar, onSuspender, onReactivar, onSeguimiento }) {
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    const isClientSuspended = cliente.suspension_status === "1" && cliente.suspension_end_date !== null;
    setIsSuspended(isClientSuspended);
  }, [cliente.suspension_status, cliente.suspension_end_date]);

  return (
    <tr>
      <td>{cliente.id_cliente}</td>
      <td>{cliente.email}</td>
      <td>{cliente.created_at}</td>
      <td className="action-buttons">
        <button className="eliminar" onClick={onEliminar}>Eliminar</button>
        {isSuspended ? (
          <button onClick={() => {
            onReactivar();
            setIsSuspended(false);
          }}>Reactivar</button>
        ) : (
          <SuspenderMenu
            onSuspender={(period) => {
              onSuspender(period);
              setIsSuspended(true);
            }}
          />
        )}
        <button className="follow-up" onClick={onSeguimiento}>Seguimiento</button>
      </td>
    </tr>
  );
}
function SuspenderMenu({ onSuspender }) {
  const [selectedPeriod, setSelectedPeriod] = useState('7 días');
  const [mostrarMenu, setMostrarMenu] = useState(false);

  const handleSuspender = () => {
    let suspensionDays;
    switch (selectedPeriod) {
      case '7 días':
        suspensionDays = 7;
        break;
      case '15 días':
        suspensionDays = 15;
        break;
      case '30 días':
        suspensionDays = 30;
        break;
      case 'Permanente':
        suspensionDays = 'Permanente';
        break;
      default:
        suspensionDays = 7;
    }
    onSuspender(suspensionDays);
    setMostrarMenu(false);
  };

  return (
    <div className="suspender-menu-container">
      {!mostrarMenu ? (
        <button onClick={() => setMostrarMenu(true)}>Suspender</button>
      ) : (
        <div className="suspender-menu">
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
            <option value="7 días">7 días</option>
            <option value="15 días">15 días</option>
            <option value="30 días">30 días</option>
            <option value="Permanente">Permanente</option>
          </select>
          <button onClick={handleSuspender}>Confirmar</button>
        </div>
      )}
    </div>
  );
}

export default VerClientes;
