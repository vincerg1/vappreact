import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const IncentivoForm = () => {
  const { id } = useParams(); // Captura el id del incentivo a editar desde la URL
  const navigate = useNavigate();
  const [TO_minimo, setTO_minimo] = useState('');
  const [incentivo, setIncentivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [activo, setActivo] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false); // Para determinar si estamos en modo edición

  const incentivosPredefinidos = [
    'Delivery Free Pass',
    'Free Dessert',
    'Free Drinks',
    'Extra Product',
    'Gift Voucher',
    'Free Dip',
    'Other'
  ];

  useEffect(() => {
    // Si hay un id, significa que estamos en modo edición, cargamos los datos del incentivo
    if (id) {
      const fetchIncentivo = async () => {
        try {
          const response = await axios.get(`http://localhost:3001/api/incentivos/${id}`);
          const { TO_minimo, incentivo, detalle, activo } = response.data;
          setTO_minimo(TO_minimo);
          setIncentivo(incentivo);
          setDetalle(detalle);
          setActivo(activo === 1); // Convertir a booleano
          setIsEditMode(true);
        } catch (error) {
          console.error('Error al obtener los datos del incentivo:', error);
        }
      };
      fetchIncentivo();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nuevoIncentivo = {
      TO_minimo: parseFloat(TO_minimo),
      incentivo,
      detalle,
      activo: activo ? 1 : 0,
    };

    try {
      if (isEditMode) {
        // Si estamos en modo edición, hacemos un PATCH
        await axios.patch(`http://localhost:3001/api/incentivos/${id}`, nuevoIncentivo);
        alert('Incentivo actualizado con éxito');
      } else {
        // Si no estamos en modo edición, hacemos un POST (crear nuevo incentivo)
        await axios.post('http://localhost:3001/api/incentivos', nuevoIncentivo);
        alert('Incentivo creado con éxito');
      }
      // Después de crear o actualizar, redirigir a la lista de incentivos
      navigate('/offers/incentivo');
    } catch (error) {
      console.error('Error al guardar el incentivo:', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <h1>{isEditMode ? 'Editar Incentivo' : 'Crear Incentivo'}</h1>
        <label>
          TO mínimo:
          <input
            type="number"
            value={TO_minimo}
            onChange={(e) => setTO_minimo(e.target.value)}
            required
          />
        </label>
        <br />
        <label>
          Incentivo:
          <select
            value={incentivo}
            onChange={(e) => setIncentivo(e.target.value)}
            required
          >
            <option value="" disabled>Seleccione un incentivo</option>
            {incentivosPredefinidos.map((inc, index) => (
              <option key={index} value={inc}>{inc}</option>
            ))}
          </select>
        </label>
        <br />
        {incentivo === 'Other' && (
          <label>
            Detalle:
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              required
            ></textarea>
          </label>
        )}
        {incentivo !== 'Other' && (
          <label>
            Detalle:
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
            ></textarea>
          </label>
        )}
        <br />
        <label>
          Activo:
          <input
            type="checkbox"
            checked={activo}
            onChange={() => setActivo(!activo)}
          />
        </label>
        <br />
        <button type="submit">
          {isEditMode ? 'Actualizar Incentivo' : 'Crear Incentivo'}
        </button>
      </form>
    </div>
  );
};

export default IncentivoForm;
