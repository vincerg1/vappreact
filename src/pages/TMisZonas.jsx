import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41]
});

export default function TMisZonas({ filters }) {
  const [locations, setLocations] = useState([]);
  const [zipData, setZipData] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('All');

  useEffect(() => {
    fetchLocations();
    fetchCities();
  }, [selectedCity]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get('http://localhost:3001/ubicaciones', {
        params: {
          ciudad: selectedCity,
        },
      });

      const locationsWithPostalCodes = response.data;

      setLocations(locationsWithPostalCodes);

      const zipCounts = locationsWithPostalCodes.reduce((acc, loc) => {
        acc[loc.codigo_postal] = (acc[loc.codigo_postal] || 0) + loc.numero_de_compras;
        return acc;
      }, {});

      const totalCompras = Object.values(zipCounts).reduce((acc, val) => acc + val, 0);

      const zipData = Object.keys(zipCounts).map(zip => ({
        zip,
        numeroDeCompras: zipCounts[zip],
        porcentaje: ((zipCounts[zip] / totalCompras) * 100).toFixed(2)
      }));

      setZipData(zipData);
    } catch (error) {
      console.error('Error fetching locations', error);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await axios.get('http://localhost:3001/ubicaciones');
      const citiesSet = new Set(response.data.map(loc => loc.ciudad));
      setCities(['All', ...Array.from(citiesSet)]);
    } catch (error) {
      console.error('Error fetching cities', error);
    }
  };

  const handleCityChange = (e) => {
    setSelectedCity(e.target.value);
  };

  return (
    <div>
      <h3>Mis Zonas</h3>
      <label>
        Ciudad:
        <select value={selectedCity} onChange={handleCityChange}>
          {cities.map((city, index) => (
            <option key={index} value={city}>{city}</option>
          ))}
        </select>
      </label>
      <div style={{ height: '400px', width: '100%' }}>
        <MapContainer center={[42.34, -7.86]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {locations.map((location, index) => (
            <Marker key={index} position={[location.lat, location.lng]} icon={customIcon}>
              <Popup>
                {location.ciudad}, {location.codigo_postal}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <h4>Porcentaje de Ventas por Código Postal</h4>
      <table>
        <thead>
          <tr>
            <th>ZIP</th>
            <th>Numero de Compras</th>
            <th>% Ubi</th>
          </tr>
        </thead>
        <tbody>
          {zipData.map((data, index) => (
            <tr key={index}>
              <td>{data.zip}</td>
              <td>{data.numeroDeCompras}</td>
              <td>{data.porcentaje}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
