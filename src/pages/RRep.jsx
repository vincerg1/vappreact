import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import '../styles/RRep.css'; 

const RRep = () => {
    const [timeRange, setTimeRange] = useState('7days'); // Rango de tiempo seleccionado
    const [repartidores, setRepartidores] = useState([]); // Lista de repartidores
    const [selectedRepartidor, setSelectedRepartidor] = useState(''); // Repartidor seleccionado
    const [indicator, setIndicator] = useState('pedidos'); // Indicador seleccionado
    const [reportData, setReportData] = useState({ pedidos: 0, distancia: 0, pedidosPorDia: [] });
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [rankingData, setRankingData] = useState([]); // Datos para la tabla de posiciones

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

    // Obtener los datos de la tabla de posiciones
    useEffect(() => {
        const fetchRankingData = async () => {
            try {
                const response = await axios.get('http://localhost:3001/reportes/posiciones-repartidores', {
                    params: { timeRange },
                });
                const data = response.data.data;

                console.log("Datos de posiciones recibidos:", data);
                setRankingData(data);
            } catch (error) {
                console.error("Error al obtener los datos de posiciones:", error);
                setRankingData([]);
            }
        };

        fetchRankingData();
    }, [timeRange]);

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
                        defaultValue=""
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

            {/* Tabla de Posiciones */}
            <div className="ranking-section">
                <h2>Tabla de Posiciones</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Repartidor</th>
                            <th>Pedidos Totales</th>
                            <th>Distancia Total (km)</th>
                            <th>Índice</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rankingData.map((repartidor, index) => (
                            <tr key={index}>
                                <td>
                                    {
                                        repartidores.find((r) => r.id_repartidor === repartidor.id_repartidor)?.nombre ||
                                        `ID: ${repartidor.id_repartidor}`
                                    }
                                </td>
                                <td>{repartidor.total_pedidos}</td>
                                <td>{repartidor.total_distancia}</td>
                                <td>{repartidor.indice}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RRep;
