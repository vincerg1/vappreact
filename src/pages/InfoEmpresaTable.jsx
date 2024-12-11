import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const InfoEmpresaTable = () => {
  const [companyInfo, setCompanyInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Hacer una solicitud para obtener la información de la empresa
    axios.get('http://localhost:3001/api/info-empresa')
      .then((response) => {
        setCompanyInfo(response.data);
      })
      .catch((error) => {
        console.error('Error al cargar la información de la empresa:', error);
      });
  }, []);

  const handleEdit = (id) => {
    navigate(`/edit-company/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta empresa?')) {
      axios.delete(`http://localhost:3001/api/info-empresa/${id}`)
        .then(() => {
          alert('Empresa eliminada con éxito');
          setCompanyInfo(null); // Refrescar la lista
        })
        .catch((error) => {
          console.error('Error al eliminar la empresa:', error);
        });
    }
  };

  if (!companyInfo) {
    return <div>Cargando información de la empresa...</div>;
  }

  return (
    <div>
      <h2>Información de la Empresa</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre de la Empresa</th>
            <th>Teléfono</th>
            <th>Correo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{companyInfo.nombre_empresa}</td>
            <td>{companyInfo.telefono_contacto}</td>
            <td>{companyInfo.correo_contacto}</td>
            <td>
              <button onClick={() => handleEdit(companyInfo.id)}>Editar</button>
              <button onClick={() => handleDelete(companyInfo.id)}>Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default InfoEmpresaTable;
