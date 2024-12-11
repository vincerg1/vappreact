import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TVentas from './TVentas';
import TSegmentos from './TSegmentos';
import TPromedio from './TPromedio';
import TPizzaMasVendida from './TPizzaMasVendida';
import TMisZonas from './TMisZonas';
import DateFilter from './DateFilter';
import CustomerFilter from './CustomerFilter';
import LocationFilter from './LocationFilter';
import '../styles/seguimiento.css';

export default function Seguimiento() {
  const [clientes, setClientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    customer: 'ALL',
    location: 'ALL'
  });

  useEffect(() => {
    fetchClientes();
    fetchHistorial();
  }, [filters]);

  const fetchClientes = async () => {
    try {
      const response = await axios.get('http://localhost:3001/clientes', { params: filters });
      setClientes(response.data);
    } catch (error) {
      console.error('Error fetching clientes', error);
    }
  };

  const fetchHistorial = async () => {
    try {
      const response = await axios.get('http://localhost:3001/historial_clientes', { params: filters });
      setHistorial(response.data);
    } catch (error) {
      console.error('Error fetching historial', error);
    }
  };

  const handleFilterChange = (value, filterType) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [filterType]: value
    }));
  };

  return (
    <div className="seguimiento-container">
      <h2>Seguimiento de Clientes</h2>
      <div className="filters-container">
        <DateFilter onChange={(value, type) => handleFilterChange(value, type)} />
        <CustomerFilter onChange={(value) => handleFilterChange(value, 'customer')} />
        <LocationFilter onChange={(value) => handleFilterChange(value, 'location')} />
      </div>
      <div className="seguimiento-grid">
        <div className="seguimiento-item ventas">
          <TVentas filters={filters} />
        </div>
        <div className="seguimiento-item ticket-promedio">
          <TPromedio filters={filters} />
        </div>
        <div className="seguimiento-item pizza-mas-vendida">
          <TPizzaMasVendida filters={filters} />
        </div>
        <div className="seguimiento-item mis-zonas">
          <TMisZonas />
        </div>
        <div className="seguimiento-item segmentos">
          <TSegmentos filters={filters} />
        </div>
      </div>
    </div>
  );
}
