import React, { useState } from 'react';

const AddressFormModal = ({ onClose, onSave }) => {
  const [street, setStreet] = useState('');
  const [portal, setPortal] = useState('');
  const [floor, setFloor] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Función para manejar el guardado de la dirección
  const handleSave = () => {
    // Normalizar todos los datos para estandarizar
    const normalizedStreet = street.trim().toUpperCase();
    const normalizedPortal = portal.trim().toUpperCase();
    const normalizedFloor = floor.trim().toUpperCase();
    const normalizedCity = city.trim().toUpperCase();
    const normalizedPostalCode = postalCode.trim();

    // Armar la dirección completa sin incluir el piso/casa
    const direccion = `${normalizedStreet}, ${normalizedPortal}, ${normalizedPostalCode} ${normalizedCity}, ESPAÑA`;
    
    // Armar las observaciones con el piso/casa
    const observaciones = normalizedFloor ? `Piso/Casa: ${normalizedFloor} \nObservaciones:` : '';

    // Log para verificar la información que se está enviando al guardar
    console.log("Datos enviados desde el modal:", {
      address: direccion,
      postalCode: normalizedPostalCode,
      city: normalizedCity,
      street: normalizedStreet,
      portal: normalizedPortal,
      observations: observaciones,
    });
    onSave({
      address: direccion,
      postalCode: normalizedPostalCode,
      city: normalizedCity,
      street: normalizedStreet,
      portal: normalizedPortal,
      observations: observaciones,
    });
    onClose(); 
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Agregar Dirección</h3>

        <label style={{ display: 'block', marginBottom: '10px' }}>
          Rúa/Calle:
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Ingresa el nombre de la calle"
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '10px' }}>
          Portal:
          <input
            type="text"
            value={portal}
            onChange={(e) => setPortal(e.target.value)}
            placeholder="Número de portal"
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '10px' }}>
          Número de Piso/Casa:
          <input
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="Número de piso o casa"
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '10px' }}>
          Ciudad:
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ingresa el nombre de la ciudad"
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '10px' }}>
          Código Postal:
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="Ingresa el código postal"
            style={{ width: '100%' }}
          />
        </label>

        <div className="button-group" style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <button onClick={handleSave} className="save-button">
            Guardar Dirección
          </button>
          <button onClick={onClose} className="close-button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressFormModal;
