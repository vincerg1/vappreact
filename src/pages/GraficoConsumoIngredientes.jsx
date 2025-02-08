import React from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const GraficoConsumoIngredientes = ({ datos }) => {
  if (!datos || !datos.labels) {
    return <p className="loading-mensaje">🔄 Cargando datos del gráfico...</p>;
  }

  return (
    <section className='contenedor-grafico'>
      <div className='graficodb1'>
        <Line data={datos} options={{
          maintainAspectRatio: false,
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: '📊 Comparación del Consumo Diario vs. Promedio Semanal',
              font: { size: 18 }
            },
            legend: { position: 'top' }
          },
          scales: {
            x: { title: { display: true, text: 'Días de la Semana' }},
            y: { title: { display: true, text: 'Cantidad Consumida' }, beginAtZero: true }
          }
        }} />
      </div>
    </section>
  );
};


export default GraficoConsumoIngredientes;
