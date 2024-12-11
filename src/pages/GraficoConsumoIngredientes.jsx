import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const GraficoConsumoIngredientes = ({ datosSemanaActual, datosSemanaAnterior }) => {
  const data = {
    labels: datosSemanaActual.map(dato => dato.dia), // Asegúrate de que los datos tengan una propiedad 'dia'
    datasets: [
      {
        label: 'Semana Actual',
        data: datosSemanaActual.map(dato => dato.cantidad), // Asegúrate de que los datos tengan una propiedad 'cantidad'
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
        tension: 0.4 
      },
      {
        label: 'Semana Anterior',
        data: datosSemanaAnterior.map(dato => dato.cantidad), // Asegúrate de que los datos tengan una propiedad 'cantidad'
        borderColor: 'rgba(153,102,255,1)',
        fill: false,
        tension: 0.4 
      }
    ]
  };
  const options = {
    maintainAspectRatio: false,
  plugins: {
    title: {
      display: true,
      text: 'Comparación semanal del consumo de ingredientes',
      font: {
        size: 18
      }
    }
  }, // Esto permite que establezcas un alto y ancho definidos
    scales: {
      x: {
        title: {
          display: true,
        }
      },
      y: {
        title: {
          display: true,
        }
      }
    },
  };
  return (
    <section className='contenedor-grafico'>
    <div 
    className='graficodb1'
    > 
    <Line 
    data={data} 
    options={options} 
    />
    </div>
    </section>
  );
};

export default GraficoConsumoIngredientes;
