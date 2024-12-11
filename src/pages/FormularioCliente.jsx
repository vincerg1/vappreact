import React, { useState } from 'react';
import axios from 'axios';

export default function FormularioCliente({ onClienteAgregado }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bday, setBday] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');

  const handleAddCliente = async () => {
    try {
      const newCliente = { email, password, bday, mapsUrl };
      await axios.post('http://localhost:3001/agregar_cliente', newCliente);
      onClienteAgregado();
      setEmail('');
      setPassword('');
      setBday('');
      setMapsUrl('');
    } catch (error) {
      console.error('Error adding cliente', error);
    }
  };

  return (
    <div>
      <h3>Crear Cliente</h3>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="date"
        placeholder="Fecha de Nacimiento"
        value={bday}
        onChange={(e) => setBday(e.target.value)}
      />
      <input
        type="text"
        placeholder="Google Maps URL"
        value={mapsUrl}
        onChange={(e) => setMapsUrl(e.target.value)}
      />
      <button onClick={handleAddCliente}>Agregar Cliente</button>
    </div>
  );
}
