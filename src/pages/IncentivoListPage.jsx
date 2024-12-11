import React from 'react';
import IncentivoList from './IncentivoList'; // Componente para mostrar la lista
import { useNavigate } from 'react-router-dom';

const IncentivoListPage = () => {
  const navigate = useNavigate();

  return (
    <div>
   
      
      {/* Aquí mostramos la lista de incentivos */}
      <IncentivoList />

    </div>
  );
};

export default IncentivoListPage;
