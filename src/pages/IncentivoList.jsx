import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const IncentivoList = () => {
  const [incentivos, setIncentivos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchIncentivos = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/incentivos');
        setIncentivos(response.data);
      } catch (error) {
        console.error('Error al obtener los incentivos:', error);
      }
    };
    fetchIncentivos();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/api/incentivos/${id}`);
      setIncentivos(incentivos.filter(incentivo => incentivo.id !== id));
      alert('Incentivo eliminado con éxito');
    } catch (error) {
      console.error('Error al eliminar el incentivo:', error);
    }
  };

  return (
    <div>
      <h2>Lista de Incentivos</h2>
      
      {/* Botón para crear nuevos incentivos */}
      <button onClick={() => navigate('/offers/incentivo/create')}>Crear Nuevo Incentivo</button>
      
      {incentivos.length === 0 ? (
        <p>No hay incentivos disponibles.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>TO mínimo</th>
              <th>Incentivo</th>
              <th>Detalle</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {incentivos.map((incentivo) => (
              <tr key={incentivo.id}>
                <td>{incentivo.TO_minimo}</td>
                <td>{incentivo.incentivo}</td>
                <td>{incentivo.detalle}</td>
                <td>{incentivo.activo ? 'Sí' : 'No'}</td>
                <td>
                  <button onClick={() => navigate(`/offers/incentivo/edit/${incentivo.id}`)}>Editar</button>
                  <button onClick={() => handleDelete(incentivo.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default IncentivoList;
