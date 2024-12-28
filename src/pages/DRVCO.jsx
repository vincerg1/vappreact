// Archivo: src/pages/dashboard/DRVCO.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import '../styles/DRVCO.css'; 


const DRVCO = () => {
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState('7days'); // Temporalidades: '7days', '15days', '30days'
    const [kpiData, setKpiData] = useState({ totalVentas: 0, cantidadPizzas: 0, ticketPromedio: 0, clientesFidelizados: 0, topPizzas: [] });
    const [chartType, setChartType] = useState('ventas'); // Tipos de gráficos: ventas, pizzas, recaudación, clientes, rushHour
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [pizzaMap, setPizzaMap] = useState({}); // Mapeo de id_pizza a nombres de pizzas

    const handleTimeChange = (event) => {
        setTimeRange(event.target.value);
    };

    const handleChartTypeChange = (event) => {
        setChartType(event.target.value);
    };

    useEffect(() => {
        const fetchPizzaMap = async () => {
            try {
                const response = await axios.get('http://localhost:3001/menu_pizzas');
                const pizzas = response.data?.data || [];
                console.log('Datos de pizzas obtenidos:', pizzas);
                const map = pizzas.reduce((acc, pizza) => {
                    acc[pizza.id] = pizza.nombre;
                    return acc;
                }, {});
                setPizzaMap(map);
                console.log('Mapa de pizzas:', map);
            } catch (error) {
                console.error('Error al obtener el mapa de pizzas:', error);
            }
        };

        fetchPizzaMap();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            console.log(`Cambiando rango de tiempo a: ${timeRange}`); // Log para verificar el cambio en el rango
            try {
                const response = await axios.get(`http://localhost:3001/registro_ventas/filtrado?timeRange=${timeRange}`);
                const data = response.data?.data;

                if (!Array.isArray(data) || data.length === 0) {
                    console.warn("Datos vacíos o inválidos recibidos para el rango:", timeRange);
                    setKpiData({ totalVentas: 0, cantidadPizzas: 0, ticketPromedio: 0, clientesFidelizados: 0, topPizzas: [] });
                    setChartData({ labels: [], datasets: [] });
                    return;
                }

                // Procesar KPI generales
                const totalVentas = data.reduce((acc, curr) => acc + (curr.total_con_descuentos || 0), 0);
                const cantidadPizzas = data.reduce((acc, curr) => {
                    const productos = JSON.parse(curr.productos || '[]');
                    return acc + productos.reduce((sum, item) => sum + (item.cantidad || 0), 0);
                }, 0);
                const ticketPromedio = data.length > 0 ? (totalVentas / data.length).toFixed(2) : 0;

                const clienteCompras = {};
                data.forEach((venta) => {
                    const clienteId = venta.id_cliente;
                    if (!clienteCompras[clienteId]) {
                        clienteCompras[clienteId] = 0;
                    }
                    clienteCompras[clienteId]++;
                });

                const clientesFidelizados = Object.values(clienteCompras).filter((compras) => compras > 5).length;

                // Calcular Top 3 Pizzas más vendidas
                const pizzaVentas = {};
                data.forEach((venta) => {
                    const productos = JSON.parse(venta.productos || '[]');
                    productos.forEach((producto) => {
                        const pizzaId = producto.id_pizza;
                        if (!pizzaVentas[pizzaId]) {
                            pizzaVentas[pizzaId] = 0;
                        }
                        pizzaVentas[pizzaId] += producto.cantidad || 0;
                    });
                });

                const topPizzas = Object.entries(pizzaVentas)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([id, count]) => ({ nombre: pizzaMap[id] || `ID: ${id}`, cantidad: count }));

                setKpiData({ totalVentas, cantidadPizzas, ticketPromedio, clientesFidelizados, topPizzas });

                // Procesar datos para la gráfica
                const dailyData = {};
                data.forEach((venta) => {
                    const fecha = venta.fecha;
                    if (!dailyData[fecha]) {
                        dailyData[fecha] = { ventas: 0, pizzas: 0, ticketPromedio: 0, count: 0, clientes: new Set() };
                    }
                    const productos = JSON.parse(venta.productos || '[]');
                    const pizzasPorDia = productos.reduce((sum, item) => sum + (item.cantidad || 0), 0);

                    dailyData[fecha].ventas += venta.total_con_descuentos || 0;
                    dailyData[fecha].pizzas += pizzasPorDia;
                    dailyData[fecha].ticketPromedio += venta.total_con_descuentos || 0;
                    dailyData[fecha].count++;
                    dailyData[fecha].clientes.add(venta.id_cliente);
                });

                const labels = Object.keys(dailyData).sort();
                const dataPorDia = labels.map((fecha) => {
                    if (chartType === 'ventas') return dailyData[fecha].ventas;
                    if (chartType === 'pizzas') return dailyData[fecha].pizzas;
                    if (chartType === 'ticketPromedio') return (dailyData[fecha].ticketPromedio / dailyData[fecha].count).toFixed(2);
                    if (chartType === 'clientes') return dailyData[fecha].clientes.size;
                    return 0;
                });

                setChartData({
                    labels,
                    datasets: [
                        {
                            label:
                                chartType === 'ventas'
                                    ? 'Recaudación Total (€)'
                                    : chartType === 'pizzas'
                                    ? 'Cantidad de Pizzas'
                                    : chartType === 'ticketPromedio'
                                    ? 'Ticket Promedio por Día (€)'
                                    : 'Base de Clientes',
                            data: dataPorDia,
                            backgroundColor: 'rgba(75,192,192,0.6)',
                            borderColor: 'rgba(75,192,192,1)',
                            borderWidth: 1,
                        },
                    ],
                });
            } catch (error) {
                console.error('Error al obtener datos del backend:', error);
                setKpiData({ totalVentas: 0, cantidadPizzas: 0, ticketPromedio: 0, clientesFidelizados: 0, topPizzas: [] });
                setChartData({ labels: [], datasets: [] });
            }
        };

        fetchData();
    }, [timeRange, chartType, pizzaMap]);

 
    return (
        <div className="drvco-container">
            <h1>Daily Report</h1>
    
            {/* Contenedor horizontal para filtros e indicadores */}
            <div className="header-section">
                <div className="time-selector">
                    <label htmlFor="time-range">Selecciona un rango de tiempo:</label>
                    <select id="time-range" value={timeRange} onChange={handleTimeChange}>
                        <option value="7days">Últimos 7 días</option>
                        <option value="15days">Últimos 15 días</option>
                        <option value="30days">Últimos 30 días</option>
                    </select>
                </div>
    
                {/* Indicadores Totales */}
                <div className="kpi-section">
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <h3>Recaudación total</h3>
                            <p>€{kpiData.totalVentas}</p>
                        </div>
                        <div className="kpi-card">
                            <h3>Cantidad de pizzas</h3>
                            <p>{kpiData.cantidadPizzas}</p>
                        </div>
                        <div className="kpi-card">
                            <h3>Ticket promedio</h3>
                            <p>€{kpiData.ticketPromedio}</p>
                        </div>
                        <div className="kpi-card">
                            <h3>Clientes fidelizados</h3>
                            <p>{kpiData.clientesFidelizados}</p>
                        </div>
                    </div>
                </div>
            </div>
    
            {/* Top Pizzas */}
            <div className="top-pizzas-section">
                <h3>Top Pizzas</h3>
                <div className="pizza-grid">
                    {kpiData.topPizzas.map((pizza, index) => (
                        <div key={index} className="pizza-card">
                            <p>{pizza.nombre}</p>
                            <span>{pizza.cantidad} unidades</span>
                        </div>
                    ))}
                </div>
            </div>
    
            {/* Filtro de indicador */}
            <div className="chart-type-selector">
                <label htmlFor="chart-type">Selecciona un indicador:</label>
                <select id="chart-type" value={chartType} onChange={handleChartTypeChange}>
                    <option value="ventas">Recaudación Total (€)</option>
                    <option value="pizzas">Cantidad de Pizzas</option>
                    <option value="ticketPromedio">Ticket Promedio por Día (€)</option>
                    <option value="clientes">Base de Clientes</option>
                </select>
            </div>
    
            {/* Gráfica */}
            <div className="chart-section">
                <h2>Gráfico de Tendencia</h2>
                <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
            </div>
        </div>
    );
    
    
    
    
};

export default DRVCO;
