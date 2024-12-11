import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PartnerCreator from './PartnerCreator';

const EditarPartner = () => {
    const { partnerId } = useParams();
  const navigate = useNavigate();
  const [partnerData, setPartnerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
    const fetchPartnerData = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`http://localhost:3001/PartnerData/${partnerId}`);
        setPartnerData(response.data.data);
      } catch (error) {
        console.error('Error al cargar los datos del partner:', error);
      }
      setIsLoading(false);
    };

    fetchPartnerData();
  }, [partnerId]);

  const handleUpdatePartner = async (updatedData, method) => {
    try {
      const formData = new FormData();
      Object.entries(updatedData).forEach(([key, value]) => {
        if (key !== 'imagen') {
          formData.append(key, value);
        } else if (value instanceof Blob) {
          formData.append('imagen', value, value.name);
        }
      });

      const response = await axios({
        method: 'patch',
        url: `http://localhost:3001/PartnerData/${partnerId}`,
        data: formData,
        headers: {'Content-Type': 'multipart/form-data' }
      });

      navigate('/_Inicio/_Menu_p1/_MenuOverview'); // Ajusta según tu ruta
    } catch (error) {
      console.error('Error al actualizar el partner:', error);
    }
  };

  return !isLoading ? (
    partnerData && (
      <PartnerCreator
        partnerData={partnerData}
        onSubmit={handleUpdatePartner}
      />
    )
  ) : (
    <p>Cargando...</p>
  );
};

export default EditarPartner;
