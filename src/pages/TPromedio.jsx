import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function TPromedio({ filters }) {
  const [data, setData] = useState({
    ticket_promedio_historico: 0,
    ticket_promedio_reciente: 0,
  });

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchPromedio();
    }
  }, [filters]);

  const fetchPromedio = async () => {
    try {
      const response = await axios.get('http://localhost:3001/ticket_promedio', {
        params: filters,
      });

      setData({
        ticket_promedio_historico: response.data.ticket_promedio_historico || 0,
        ticket_promedio_reciente: response.data.ticket_promedio_reciente || 0,
      });
    } catch (error) {
      console.error('Error fetching ticket promedio', error);
    }
  };

  const chartData = {
    labels: ['Ticket Promedio Histórico', 'Ticket Promedio Reciente'],
    datasets: [
      {
        label: 'Ticket Promedio ($)',
        data: [data.ticket_promedio_historico, data.ticket_promedio_reciente],
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
      <h3>Ticket Promedio</h3>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}
