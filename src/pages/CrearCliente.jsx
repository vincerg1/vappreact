import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Clientes.css'; 

function CrearCliente({ onClienteAgregado }) {
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
      if (onClienteAgregado) {
        onClienteAgregado();
      }
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


export default CrearCliente;
