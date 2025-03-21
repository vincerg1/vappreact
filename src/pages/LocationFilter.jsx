import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function LocationFilter({ onChange }) {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/ubicaciones`);
      const uniqueLocations = [...new Set(response.data.map(loc => loc.ciudad))];
      setLocations(uniqueLocations);
    } catch (error) {
      console.error('Error fetching locations', error);
    }
  };

  return (
    <div>
      <label>Ubicación: </label>
      <select onChange={(e) => onChange(e.target.value)}>
        <option value="ALL">ALL</option>
        {locations.map((location, index) => (
          <option key={index} value={location}>
            {location}
          </option>
        ))}
      </select>
    </div>
  );
}
