import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Clientes.css'; 

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);

  useEffect(() => {
    if (mostrarLista) {
      fetchClientes();
    }
  }, [mostrarLista]);


  const fetchClientes = async () => {
    try {
      const response = await axios.get('http://localhost:3001/clientes');
      if (Array.isArray(response.data)) {
        console.log("Datos recibidos de la base de datos:", response.data);
        setClientes(response.data);
      } else {
        setClientes([]);
      }
    } catch (error) {
      console.error('Error fetching clientes', error);
      setClientes([]);
    }
  };
  const handleMostrarFormulario = () => {
    setMostrarFormulario(!mostrarFormulario);
  };
  const handleVerClientes = () => {
    setMostrarLista(!mostrarLista);
  };
  const handleEliminarCliente = async (id_cliente) => {
    try {
      await axios.delete(`http://localhost:3001/clientes/${id_cliente}`);
      fetchClientes(); // Recargar la lista después de eliminar
    } catch (error) {
      console.error('Error deleting cliente', error);
    }
  };
  const handleSuspenderCliente = async (id_cliente, suspensionPeriod) => {
    try {
      await axios.put(`http://localhost:3001/clientes/suspender/${id_cliente}`, {
        suspensionPeriod,
      });
      console.log('Cliente suspendido con éxito');
      fetchClientes(); // Para actualizar la lista de clientes después de la suspensión
    } catch (error) {
      console.error('Error suspending cliente', error);
    }
  };
  const handleReactivarCliente = async (id_cliente) => {
    try {
      await axios.put(`http://localhost:3001/clientes/reactivar/${id_cliente}`);
      console.log('Cliente reactivado con éxito');
      fetchClientes(); // Para actualizar la lista de clientes después de la reactivación
    } catch (error) {
      console.error('Error reactivating cliente', error);
    }
  };
  const handleFiltroChange = (e) => {
    setFiltro(e.target.value);
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    return cliente.email.toLowerCase().includes(filtro.toLowerCase());
  });

  return (
    <div className="clientes-container">
      <h2>Clientes</h2>
      <div className="botones-acciones">
        <button onClick={handleMostrarFormulario}>
          {mostrarFormulario ? 'Regresar' : 'Crear Cliente'}
        </button>
        <button onClick={handleVerClientes}>
          {mostrarLista ? 'Ocultar Clientes' : 'Ver Clientes'}
        </button>
      </div>
      {mostrarFormulario && (
        <FormularioCliente
          onClienteAgregado={() => {
            fetchClientes();
            setMostrarFormulario(false); 
          }}
        />
      )}
      {mostrarLista && (
        <div className="lista-clientes-container">
          <h3>Lista de Clientes</h3>
          <input 
            type="text" 
            placeholder="Buscar cliente por email..." 
            value={filtro} 
            onChange={handleFiltroChange} 
            className="buscador" 
          />
          <ul className="lista-clientes">
            {clientesFiltrados.map((cliente) => (
              <ClienteItem 
                key={cliente.id_cliente} 
                cliente={cliente} 
                onEliminar={() => handleEliminarCliente(cliente.id_cliente)} 
                onSuspender={(period) => handleSuspenderCliente(cliente.id_cliente, period)} 
                onReactivar={() => handleReactivarCliente(cliente.id_cliente)} 
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

  function ClienteItem({ cliente, onEliminar, onSuspender, onReactivar }) {
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    // Verificar si el cliente está suspendido basado en suspension_status y suspension_end_date
    const isClientSuspended = cliente.suspension_status === "1" && cliente.suspension_end_date !== null;
    console.log(`Cliente ID: ${cliente.id_cliente}, Suspended: ${isClientSuspended}`);
    setIsSuspended(isClientSuspended);
  }, [cliente.suspension_status, cliente.suspension_end_date]);

  return (
    <li className="cliente-item">
      <span className="cliente-id">{cliente.id_cliente}</span>
      <span>{cliente.email} - {cliente.created_at}</span>
      <div className="action-container">
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
      </div>
    </li>
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
    setMostrarMenu(false); // Ocultar el menú después de suspender
  };

  return (
    <div className="action-container">
      {!mostrarMenu && (
        <button onClick={() => setMostrarMenu(true)}>Suspender</button>
      )}
      {mostrarMenu && (
        <>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
            <option value="7 días">7 días</option>
            <option value="15 días">15 días</option>
            <option value="30 días">30 días</option>
            <option value="Permanente">Permanente</option>
          </select>
          <button onClick={handleSuspender}>Confirmar</button>
        </>
      )}
    </div>
  );
  }
  function FormularioCliente({ onClienteAgregado }) {
    const [email, setEmail] = useState('');
    const [bday, setBday] = useState('');
    const [password, setPassword] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setErrorMessage('');
      setSuccessMessage('');
  
      try {
        // Usar el endpoint `/agregar_cliente` para validar y crear el cliente
        const response = await axios.post('http://localhost:3001/agregar_cliente', {
          email,
          password,
          bday,
          mapsUrl,
        });
  
        const { id_cliente } = response.data;
        console.log('Cliente agregado con éxito:', id_cliente);
  
        // Mostrar mensaje de éxito y notificar al padre
        setSuccessMessage(`Cliente creado con éxito. ID: ${id_cliente}`);
        onClienteAgregado();
        setEmail('');
        setPassword('');
        setBday('');
        setMapsUrl('');
      } catch (error) {
        // Manejar errores específicos del backend
        if (error.response?.status === 400) {
          setErrorMessage('Este correo ya está registrado. Por favor, usa otro email.');
        } else if (error.response?.status === 500) {
          setErrorMessage('Error en el servidor. Por favor, inténtalo de nuevo más tarde.');
        } else {
          setErrorMessage('Error inesperado. Por favor, verifica tu conexión.');
        }
        console.error('Error agregando cliente:', error);
      }
    };
  
    return (
      <form onSubmit={handleSubmit} className="formulario-cliente">
        <h3>Crear Cliente</h3>
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Contraseña:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
       
        <button type="submit">Agregar Cliente</button>
      </form>
    );
  }
  
  
