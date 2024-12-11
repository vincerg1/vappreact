import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function TVentas({ filters }) {
  const [data, setData] = useState({
    promedio_historico: 0,
    total_historico: 0,
    promedio_reciente: 0,
    total_reciente: 0,
  });

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchVentas();
    }
  }, [filters]);

  const fetchVentas = async () => {
    try {
      const response = await axios.get('http://localhost:3001/ventas/promedios', {
        params: filters,
      });

      setData({
        promedio_historico: response.data.promedio_historico || 0,
        total_historico: response.data.total_historico || 0,
        promedio_reciente: response.data.promedio_reciente || 0,
        total_reciente: response.data.total_reciente || 0,
      });
    } catch (error) {
      console.error('Error fetching ventas', error);
    }
  };

  const chartData = {
    labels: ['Promedio Histórico', 'Promedio Reciente'],
    datasets: [
      {
        label: 'Pizzas Vendidas Promedio por Día',
        data: [data.promedio_historico, data.promedio_reciente],
        backgroundColor: ['#36A2EB', '#FFCE56'],
      },
    ],
  };

  const chartOptions = {
    scales: {
      x: {
        beginAtZero: true,
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      <h3>Ventas</h3>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}
