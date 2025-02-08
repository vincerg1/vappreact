import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';
import axios from 'axios';
import '../styles/Clientes.css';

function MapaClientes() {
  const navigate = useNavigate();
  const [clientesAnalitica, setClientesAnalitica] = useState([]);
  const [filtroTiempo, setFiltroTiempo] = useState('historico');
  const [hoveredCliente, setHoveredCliente] = useState(null);
  const [kpiData, setKpiData] = useState({
    totalCompras: 0,
    ticketPromedio: 0,
    montoTotal: 0,
    segmento1: 0,
    segmento2: 0,
    segmento3: 0,
    segmento4: 0,
    id_pizzaMasComprada: '',
    diaDelMesMasComprado: ''
  });
  const [layout, setLayout] = useState({
    title: 'Mapa General de Clientes',
    hovermode: 'closest',
    showlegend: false,
    xaxis: { title: { text: 'Rentabilidad', standoff: 20 }, range: [-120, 120], zeroline: true, automargin: true },
    yaxis: { title: { text: 'Frecuencia', standoff: 20 }, range: [-120, 120], zeroline: true, automargin: true },
    margin: { l: 60, r: 30, t: 60, b: 60 }
  });

useEffect(() => {
    fetchAllClientes();
}, []);
useEffect(() => {
    fetchAllClientes();
    calcularKPI();
}, [filtroTiempo]);
  
const fetchAllClientes = async () => {
    try {
      const res = await axios.get('http://localhost:3001/clientes');
      const listaClientes = res.data;

      let totalComprasGlobal = 0;
      let totalComprasFiltradas = 0;

      const resultados = await Promise.all(listaClientes.map(async (cli) => {
        const { rentabilidad, frecuencia, ultimaCompra, totalCompras, comprasFiltradas } = await computeROyFRDeCliente(cli.id_cliente);

        totalComprasGlobal += totalCompras;
        totalComprasFiltradas += comprasFiltradas;

        if (ultimaCompra) {
          const diasDesdeUltimaCompra = Math.round((new Date() - new Date(ultimaCompra)) / (1000 * 60 * 60 * 24));
          if (
            (filtroTiempo === '7dias' && diasDesdeUltimaCompra > 7) ||
            (filtroTiempo === '15dias' && diasDesdeUltimaCompra > 15) ||
            (filtroTiempo === '30dias' && diasDesdeUltimaCompra > 30)
          ) {
            return null; // Excluir clientes que no cumplen con el filtro
          }
        }

        return {
          id_cliente: cli.id_cliente,
          email: cli.email,
          rentabilidad,
          frecuencia
        };
      }));

      const clientesFiltrados = resultados.filter(c => c !== null);


      setClientesAnalitica(clientesFiltrados);
    } catch (error) {
      console.error('❌ Error al obtener clientes:', error);
    }
};
const computeROyFRDeCliente = async (clienteId) => {
  try {
      const response = await axios.get(`http://localhost:3001/registro_ventas/cliente/${clienteId}`);
      const data = response.data.data;

      if (!data || data.length === 0) {
          return { rentabilidad: 0, frecuencia: 0, ultimaCompra: null, totalCompras: 0, comprasFiltradas: 0 };
      }

      // 📌 Obtener la fecha más reciente de la base de datos
      const fechasCompras = data.map((compra) => new Date(compra.fecha));
      const fechaMasReciente = new Date(Math.max(...fechasCompras));

      // 📌 Ordenar cronológicamente las compras
      const comprasOrdenadas = data.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      let totalCompras = comprasOrdenadas.length;
      
      // 📌 Filtrar las compras en función del filtro de tiempo basado en la fecha más reciente
      let comprasFiltradas = comprasOrdenadas.filter((compra) => {
          const diasDesdeCompra = Math.round((fechaMasReciente - new Date(compra.fecha)) / (1000 * 60 * 60 * 24));
          return (
              filtroTiempo === 'historico' ||
              (filtroTiempo === '7dias' && diasDesdeCompra <= 7) ||
              (filtroTiempo === '15dias' && diasDesdeCompra <= 15) ||
              (filtroTiempo === '30dias' && diasDesdeCompra <= 30)
          );
      });

      let totalAcumulado = 0;
      let ultimaRO = 0;
      let ultimaFR = 0;
      let ultimaCompra = comprasOrdenadas[comprasOrdenadas.length - 1].fecha;

      if (comprasFiltradas.length === 0) {
          return { rentabilidad: 0, frecuencia: 0, ultimaCompra, totalCompras, comprasFiltradas: 0 };
      }

      for (let index = 0; index < comprasFiltradas.length; index++) {
          const compra = comprasFiltradas[index];
          const fechaActual = new Date(compra.fecha);
          const fechaAnterior = index > 0 ? new Date(comprasFiltradas[index - 1].fecha) : fechaActual;
          const DUC = index > 0 ? Math.max(1, Math.round((fechaActual - fechaAnterior) / (1000 * 60 * 60 * 24))) : 0;
          const NCH = index + 1;

          totalAcumulado += compra.total_con_descuentos;
          const TP = totalAcumulado / NCH;
          const TO = index === 0 ? 0 : TP * 1.15;
          let RO = index === 0 ? 0 : ((compra.total_con_descuentos - TO) / TO) * 100;
          RO = Math.max(-100, Math.min(100, RO));

          let FR = 0;
          if (index > 0 && DUC > 0) {
              FR = NCH / DUC;
          }

          FR = Math.max(-100, Math.min(100, FR));

          if (index === 0) FR = 0;

          ultimaRO = RO;
          ultimaFR = FR;
      }

      return { rentabilidad: ultimaRO, frecuencia: ultimaFR, ultimaCompra, totalCompras, comprasFiltradas: comprasFiltradas.length };
  } catch (error) {
      console.error(`❌ Error calculando RO/FR para cliente ${clienteId}:`, error);
      return { rentabilidad: 0, frecuencia: 0, ultimaCompra: null, totalCompras: 0, comprasFiltradas: 0 };
  }
};
const calcularKPI = async () => {
  try {
    // Obtener todas las ventas de la base de datos
    const res = await axios.get(`http://localhost:3001/registro_ventas`);
    let data = res.data.data || [];

    console.log("🔍 Total de registros antes del filtro:", data.length);

    // 📌 Obtener la fecha más antigua y la más reciente directamente desde los datos
    const fechas = data.map((venta) => new Date(venta.fecha));
    const fechaMasReciente = new Date(Math.max(...fechas)); // Última fecha en la DB
    const fechaMasAntigua = new Date(Math.min(...fechas)); // Primera fecha en la DB

    console.log("📅 Fecha más antigua:", fechaMasAntigua.toISOString().split("T")[0]);
    console.log("📅 Fecha más reciente:", fechaMasReciente.toISOString().split("T")[0]);

    // 📌 Aplicar el filtro de tiempo basado en la fecha más reciente de la DB
    data = data.filter((venta) => {
      const diasDesdeCompra = Math.round((fechaMasReciente - new Date(venta.fecha)) / (1000 * 60 * 60 * 24));

      return (
        filtroTiempo === "historico" ||
        (filtroTiempo === "7dias" && diasDesdeCompra <= 7) ||
        (filtroTiempo === "15dias" && diasDesdeCompra <= 15) ||
        (filtroTiempo === "30dias" && diasDesdeCompra <= 30)
      );
    });

    console.log("✅ Total de registros después del filtro:", data.length);

    const totalCompras = data.length;
    const montoTotal = totalCompras > 0 ? data.reduce((acc, venta) => acc + (venta.total_con_descuentos || 0), 0) : 0;
    const ticketPromedio = totalCompras > 0 ? montoTotal / totalCompras : 0;

    // 📌 Agrupar compras por cliente para determinar su segmento
    const clientesMap = {};

    data.forEach((venta) => {
      if (!clientesMap[venta.id_cliente]) {
        clientesMap[venta.id_cliente] = {
          totalCompras: 0,
          ultimaCompra: new Date(venta.fecha),
          ticketTotal: 0
        };
      }

      clientesMap[venta.id_cliente].totalCompras += 1;
      clientesMap[venta.id_cliente].ticketTotal += venta.total_con_descuentos;
      if (new Date(venta.fecha) > clientesMap[venta.id_cliente].ultimaCompra) {
        clientesMap[venta.id_cliente].ultimaCompra = new Date(venta.fecha);
      }
    });

    // 📌 Calcular segmentos con clientes únicos
    const segmentos = { 1: 0, 2: 0, 3: 0, 4: 0 };

    Object.values(clientesMap).forEach(({ totalCompras, ultimaCompra, ticketTotal }) => {
      const diasDesdeUltimaCompra = Math.round((fechaMasReciente - ultimaCompra) / (1000 * 60 * 60 * 24));
      const ticketPromedioCliente = totalCompras > 0 ? ticketTotal / totalCompras : 0;

      let segmento = 1; // Por defecto POTENCIAL
      if (totalCompras > 5 && diasDesdeUltimaCompra < 15 && ticketPromedioCliente > 20) {
        segmento = 4; // MVC
      } else if (totalCompras > 1 && diasDesdeUltimaCompra < 30 && ticketPromedioCliente > 15) {
        segmento = 3; // ACTIVO
      } else if (totalCompras > 1 && diasDesdeUltimaCompra > 30) {
        segmento = 2; // INACTIVO
      }

      segmentos[segmento] += 1;
    });

    // 📌 Calcular la pizza más comprada
    const pizzaMasComprada = {};
    data.forEach((venta) => {
      const productos = JSON.parse(venta.productos || '[]');
      productos.forEach((producto) => {
        pizzaMasComprada[producto.id_pizza] = (pizzaMasComprada[producto.id_pizza] || 0) + producto.cantidad;
      });
    });

    const id_pizzaMasComprada = Object.keys(pizzaMasComprada).reduce((a, b) =>
      pizzaMasComprada[a] > pizzaMasComprada[b] ? a : b, '');

    // 📌 Calcular el día del mes más comprado
    const diaDelMesMasComprado = data.reduce((acc, venta) => {
      if (venta.fecha) {
        const dia = new Date(venta.fecha).getDate();
        acc[dia] = (acc[dia] || 0) + 1;
      }
      return acc;
    }, {});

    const diaMasComprado = Object.keys(diaDelMesMasComprado).reduce((a, b) =>
      diaDelMesMasComprado[a] > diaDelMesMasComprado[b] ? a : b, '');

    // 📌 Actualizar KPIs con clientes únicos en cada segmento
    setKpiData({
      totalCompras,
      ticketPromedio,
      montoTotal,
      segmento1: segmentos[1],
      segmento2: segmentos[2],
      segmento3: segmentos[3],
      segmento4: segmentos[4],
      id_pizzaMasComprada,
      diaDelMesMasComprado: diaMasComprado
    });

  } catch (error) {
    console.error("❌ Error al calcular KPIs:", error);
  }
};
const handleRelayout = (event) => {
  setLayout(prevLayout => ({
    ...prevLayout,
    xaxis: { ...prevLayout.xaxis, autorange: event['xaxis.autorange'] ?? prevLayout.xaxis.autorange },
    yaxis: { ...prevLayout.yaxis, autorange: event['yaxis.autorange'] ?? prevLayout.yaxis.autorange }
  }));
};
return (
  <div className="mapa-clientes-container">
    <h2>Mapa General de Clientes</h2>

    {/* 🔹 Filtro de tiempo en la parte superior */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
      <label style={{ fontWeight: 'bold' }}>Filtrar por tiempo:</label>
      <select 
        value={filtroTiempo} 
        onChange={(e) => setFiltroTiempo(e.target.value)} 
        style={{ padding: '5px', borderRadius: '5px', width: '250px' }}
      >
        <option value="7dias">Últimos 7 días</option>
        <option value="15dias">Últimos 15 días</option>
        <option value="30dias">Últimos 30 días</option>
        <option value="historico">Histórico</option>
      </select>
    </div>

    <p>Haz clic en un punto para copiar el email de ese cliente.</p>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      {/* 📊 Gráfico de dispersión */}
      <div style={{ flex: 2 }}>
      <Plot
          data={[
            {
              x: clientesAnalitica.map(c => c.rentabilidad),
              y: clientesAnalitica.map(c => c.frecuencia),
              mode: 'markers+text',
              type: 'scatter',
              textposition: 'top center',
              marker: { 
                size: 10, 
                color: clientesAnalitica.map(c => hoveredCliente === c.id_cliente ? 'red' : 'black') 
              },
              customdata: clientesAnalitica,
              name: "", // 🔹 Oculta "trace 0"
              showlegend: false, // 🔹 Deshabilita la leyenda
              hovertemplate:
                'ID: %{customdata.id_cliente}<br>' +
                'Rentabilidad: %{x}<br>' +
                'Frecuencia: %{y}<br>' +
                'Email: %{customdata.email}<br>',
            },
          ]}
          layout={layout}
          onHover={(event) => {
            if (event.points.length > 0 && event.points[0].customdata) {
              setHoveredCliente(event.points[0].customdata.id_cliente);
            }
          }}
          onUnhover={() => {
            setHoveredCliente(null);
          }}
          onClick={(event) => {
            if (event.points.length > 0 && event.points[0].customdata) {
              const clienteId = event.points[0].customdata.id_cliente;
              navigate(`/clientes/seguimiento/${clienteId}`);
            }
          }}
          onRelayout={handleRelayout} // ✅ Evita que la autoescala se rompa
        />
      </div>

      {/* 📌 Tabla de KPI */}
      <div  className="indicadores" 
       style={{ 
        border: '1px solid black',
        padding: '10px', 
        borderRadius: '5px',
        width: '350px',
        height: '430px',
        lineHeight: '.65'
      }}
        >
        <h3>Global - KPI</h3>
        <p><strong>Total de Compras:</strong> {kpiData.totalCompras}</p>
        <p><strong>Ticket Promedio:</strong> {kpiData.ticketPromedio.toFixed(2)}€</p>
        <p><strong>Monto Total:</strong> {kpiData.montoTotal.toFixed(2)}€</p>
        <p><strong>Segmento 1:</strong> {kpiData.segmento1}</p>
        <p><strong>Segmento 2:</strong> {kpiData.segmento2}</p>
        <p><strong>Segmento 3:</strong> {kpiData.segmento3}</p>
        <p><strong>Segmento 4:</strong> {kpiData.segmento4}</p>
        <p><strong>id_pizzaMas:</strong> {kpiData.id_pizzaMasComprada}</p>
        <p><strong>diaDelMesMas:</strong> {kpiData.diaDelMesMasComprado}</p>
      </div>
    </div>
  </div>
);
}

export default MapaClientes;
