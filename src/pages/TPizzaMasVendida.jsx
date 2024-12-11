import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TPizzaMasVendida({ filters }) {
  const [data, setData] = useState({ historico: [], reciente: [] });

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchData();
    }
  }, [filters]);

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:3001/top_pizzas', {
        params: filters,
      });

      console.log('Response from server:', response.data);

      setData(response.data);
    } catch (error) {
      console.error('Error fetching top pizzas', error);
    }
  };

  return (
    <div>
      <h3>Pizza Más Vendida</h3>
      <div>
        <h4>Histórico</h4>
        <ul>
          {data.historico.map(pizza => (
            <li key={pizza.id_pizza}>{`Pizza ID: ${pizza.id_pizza}, Total Vendidas: ${pizza.total_vendidas}`}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4>Reciente</h4>
        <ul>
          {data.reciente.map(pizza => (
            <li key={pizza.id_pizza}>{`Pizza ID: ${pizza.id_pizza}, Total Vendidas: ${pizza.total_vendidas}`}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
