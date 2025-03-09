import React, { useState } from 'react';
import DateFilter from './DateFilter';
import LocationFilter from './LocationFilter';
import TMisZonas from './TMisZonas';
import '../styles/seguimiento.css';

export default function Seguimiento() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    location: 'ALL'
  });

  const handleFilterChange = (value, filterType) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [filterType]: value
    }));
  };

  return (
    <div className="seguimiento-container">
      <h2>Seguimiento de Zonas</h2>
      <div className="seguimiento-mapa">
        <TMisZonas filters={filters} />
      </div>
    </div>
  );
}
