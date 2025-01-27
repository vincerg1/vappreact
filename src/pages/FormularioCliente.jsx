import React, { useState } from 'react';
import axios from 'axios';

export default function FormularioCliente({ onClienteAgregado }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bday, setBday] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // Para manejar errores del backend
  const [successMessage, setSuccessMessage] = useState(''); // Para mensajes de éxito

  const handleAddCliente = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
  
    try {
      const newCliente = { email, password, bday, mapsUrl };
      const response = await axios.post('http://localhost:3001/agregar_cliente', newCliente);
  
      const { id_cliente } = response.data; // Recibir el id_cliente generado por el backend
      console.log('Cliente agregado con éxito:', id_cliente);
  
      // Mostrar un mensaje de éxito
      setSuccessMessage(`Cliente creado con éxito. ID: ${id_cliente}`);
      
      // Notificar al componente padre y limpiar el formulario
      onClienteAgregado();
      setEmail('');
      setPassword('');
      setBday('');
      setMapsUrl('');
    } catch (error) {
      // Manejo de errores basado en la respuesta del backend
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
    <form onSubmit={handleAddCliente} className="formulario-cliente">
      <h3>Crear Cliente</h3>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      <label>
        Email:
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        Contraseña:
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <label>
        Fecha de Nacimiento:
        <input
          type="date"
          placeholder="Fecha de Nacimiento"
          value={bday}
          onChange={(e) => setBday(e.target.value)}
          required
        />
      </label>
      <label>
        Dirección (Google Maps URL):
        <input
          type="text"
          placeholder="Google Maps URL"
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
        />
      </label>
      <button type="submit">Agregar Cliente</button>
    </form>
  );
}
