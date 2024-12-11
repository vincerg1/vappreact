import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TSegmentos({ filters }) {
  const [data, setData] = useState({
    labels: [],
    datasets: [
      { label: 'Potencial', data: [], borderColor: '#FF6384', backgroundColor: 'rgba(255, 99, 132, 0.2)', tension: 0.4 },
      { label: 'Inactivo', data: [], borderColor: '#36A2EB', backgroundColor: 'rgba(54, 162, 235, 0.2)', tension: 0.4 },
      { label: 'Activo', data: [], borderColor: '#FFCE56', backgroundColor: 'rgba(255, 206, 86, 0.2)', tension: 0.4 },
      { label: 'MVC', data: [], borderColor: '#4BC0C0', backgroundColor: 'rgba(75, 192, 192, 0.2)', tension: 0.4 },
    ],
  });

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchSegmentos(filters.startDate, filters.endDate);
    }
  }, [filters.startDate, filters.endDate]);

  const fetchSegmentos = async (startDate, endDate) => {
    try {
      console.log('Fetching segmentos with dates:', startDate, endDate);
      const response = await axios.get('http://localhost:3001/segmentos', {
        params: { startDate, endDate },
      });

      console.log('Response from server:', response.data);

      const labels = response.data.map(day => day.day);
      const potencial = response.data.map(day => day.potencial);
      const inactivo = response.data.map(day => day.inactivo);
      const activo = response.data.map(day => day.activo);
      const mvc = response.data.map(day => day.mvc);

      setData({
        labels,
        datasets: [
          { label: 'Potencial', data: potencial, borderColor: '#FF6384', backgroundColor: 'rgba(255, 99, 132, 0.2)', tension: 0.4 },
          { label: 'Inactivo', data: inactivo, borderColor: '#36A2EB', backgroundColor: 'rgba(54, 162, 235, 0.2)', tension: 0.4 },
          { label: 'Activo', data: activo, borderColor: '#FFCE56', backgroundColor: 'rgba(255, 206, 86, 0.2)', tension: 0.4 },
          { label: 'MVC', data: mvc, borderColor: '#4BC0C0', backgroundColor: 'rgba(75, 192, 192, 0.2)', tension: 0.4 },
        ],
      });
    } catch (error) {
      console.error('Error fetching segmentos', error);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Seguimiento de Segmentos',
      },
    },
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
    <div style={{ height: '400px', width: '100%' }}>
      <h3>Seguimiento de Segmentos</h3>
      <Line data={data} options={chartOptions} />
    </div>
  );
}
