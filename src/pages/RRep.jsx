import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';

const RRep = () => {
    const [timeRange, setTimeRange] = useState('7days'); // Rango de tiempo seleccionado
    const [repartidores, setRepartidores] = useState([]); // Lista de repartidores
    const [selectedRepartidor, setSelectedRepartidor] = useState(''); // Repartidor seleccionado
    const [indicator, setIndicator] = useState('pedidos'); // Indicador seleccionado
    const [reportData, setReportData] = useState({ pedidos: 0, distancia: 0, pedidosPorDia: [] });
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });

    // Obtener la lista de repartidores
    useEffect(() => {
        const fetchRepartidores = async () => {
            try {
                const response = await axios.get('http://localhost:3001/repartidores');
                console.log("Respuesta de repartidores:", response.data);
                const data = response.data.data || [];
                setRepartidores(data);
            } catch (error) {
                console.error("Error al obtener la lista de repartidores:", error);
                setRepartidores([]);
            }
        };

        fetchRepartidores();
    }, []);

    // Obtener los datos del reporte
    useEffect(() => {
        const fetchReportData = async () => {
            if (!selectedRepartidor) return;

            try {
                const response = await axios.get('http://localhost:3001/reportes/repartidores', {
                    params: { timeRange, repartidor: selectedRepartidor },
                });
                const data = response.data.data;

                console.log("Datos recibidos del backend:", data);

                setReportData(data);

                // Configurar datos del gráfico según el indicador seleccionado
                const chartLabel =
                    indicator === 'pedidos' ? 'Pedidos por Día' : 'Distancia por Día';
                const chartDataKey =
                    indicator === 'pedidos' ? 'cantidad' : 'distancia';

                setChartData({
                    labels: data.pedidosPorDia.map((item) => item.fecha),
                    datasets: [
                        {
                            label: chartLabel,
                            data: data.pedidosPorDia.map((item) => item[chartDataKey]),
                            backgroundColor: 'rgba(75,192,192,0.6)',
                            borderColor: 'rgba(75,192,192,1)',
                            borderWidth: 1,
                        },
                    ],
                });
            } catch (error) {
                console.error("Error al obtener los datos del reporte:", error);
                setReportData({ pedidos: 0, distancia: 0, pedidosPorDia: [] });
                setChartData({ labels: [], datasets: [] });
            }
        };

        fetchReportData();
    }, [timeRange, selectedRepartidor, indicator]);

    // Manejar el cambio de repartidor
    const handleRepartidorChange = (event) => {
        setSelectedRepartidor(event.target.value);
    };

    // Manejar el cambio de rango de tiempo
    const handleTimeChange = (event) => {
        setTimeRange(event.target.value);
    };

    // Manejar el cambio de indicador
    const handleIndicatorChange = (event) => {
        setIndicator(event.target.value);
    };

    return (
        <div className="rrep-container">
            <h1>Reporte de Repartidores</h1>

            {/* Filtros */}
            <div className="filters">
                <div>
                    <label>Rango de tiempo:</label>
                    <select value={timeRange} onChange={handleTimeChange}>
                        <option value="7days">Últimos 7 días</option>
                        <option value="15days">Últimos 15 días</option>
                        <option value="30days">Últimos 30 días</option>
                    </select>
                </div>
                <div>
                    <label>Repartidor:</label>
                    <select
                        value={selectedRepartidor}
                        onChange={handleRepartidorChange}
                        defaultValue=""
                    >
                        <option value="" disabled>
                            Seleccione Repartidor
                        </option>
                        {repartidores.map((repartidor) => (
                            <option key={repartidor.id_repartidor} value={repartidor.id_repartidor}>
                                {repartidor.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Indicador:</label>
                    <select
                        value={indicator}
                        onChange={handleIndicatorChange}
                        defaultValue="" // Mostrar el placeholder inicialmente
                    >
                        <option value="" disabled>
                            Seleccionar Indicador
                        </option>
                        <option value="pedidos">Pedidos Totales</option>
                        <option value="distancia">Distancia Total Recorrida</option>
                    </select>
                </div>

            </div>

            {/* Indicadores Clave */}
            <div className="indicators">
                <h2>Indicadores Clave</h2>
                <p>Pedidos Totales: {reportData.pedidos}</p>
                <p>Distancia Total Recorrida: {reportData.distancia} km</p>
            </div>

            {/* Gráfico de Indicadores por Día */}
            <div className="chart-section">
                <h2>Gráfico de {indicator === 'pedidos' ? 'Pedidos' : 'Distancia'} por Día</h2>
                <Bar data={chartData} options={{ responsive: true }} />
            </div>
        </div>
    );
};

export default RRep;
