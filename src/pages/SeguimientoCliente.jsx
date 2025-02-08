import React, { useContext, useState, useEffect } from 'react';
import { _PizzaContext } from './_PizzaContext';
import { useParams, useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';
import axios from 'axios';
import '../styles/Clientes.css';

function SeguimientoCliente() {
  const { sessionData } = useContext(_PizzaContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const [listaClientes, setListaClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(sessionData.id_cliente || "");
  const [comprasHistoricas, setComprasHistoricas] = useState([]);
  const [comprasFiltradas, setComprasFiltradas] = useState([]);
  const [filtroTiempo, setFiltroTiempo] = useState('historico');
  const [indicadoresGlobales, setIndicadoresGlobales] = useState({
    antiguedadReal: 0,
    diasDesdeUltimaCompraReal: 0,
    segmento: 1
  });
  const [kpiCliente, setKpiCliente] = useState({
    ticketPromedio: 0,
    montoTotal: 0,
    numeroDeCompras: 0,
    // Estos 2 pueden seguir siendo calculados en base al dataset completo
    // o al subset, según tu decisión final:
    antiguedadCliente: 0,        
    diasDesdeUltimaCompra: 0,    

    id_pizzaMasComprada: "",
    diaMasComprado: "",
    diaDelMesMasComprado: "",
    horaMasComprada: ""
  });
  const [cuadranteVisual, setCuadranteVisual] = useState([]);
  const [layout, setLayout] = useState({
    title: 'Mapa de Evolución del Cliente',
    hovermode: 'closest',
    xaxis: { title: 'Rentabilidad', range: [-120, 120], zeroline: true, automargin: true },
    yaxis: { title: 'Frecuencia', range: [-120, 120], zeroline: true, automargin: true },
    margin: { l: 60, r: 30, t: 60, b: 60 },
    shapes: cuadranteVisual
  });

  useEffect(() => {
    fetchListaClientes(); 
  }, []);
  useEffect(() => {
    if (id) {
      setClienteSeleccionado(id); 
      fetchHistorialCompleto(id); 
    }
  }, [id]);
  useEffect(() => {
    if (comprasFiltradas.length > 0) {
      actualizarLayoutAutoescala();
    }
  }, [comprasFiltradas]);
  useEffect(() => {
    if (comprasHistoricas.length > 0) {
      aplicarFiltroYRecalcular();
    }
  }, [filtroTiempo, comprasHistoricas]);

const fetchListaClientes = async () => {
    try {
      const response = await axios.get("http://localhost:3001/clientes");
      setListaClientes(response.data);
    } catch (error) {
      console.error("Error al obtener la lista de clientes:", error);
    }
};
const fetchHistorialCompleto = async (clienteId) => {
  try {
      const response = await axios.get(`http://localhost:3001/registro_ventas/cliente/${clienteId}`);
      const data = response.data.data || [];

      if (data.length === 0) {
          setComprasFiltradas([]);
          setComprasHistoricas([]);
          setIndicadoresGlobales({
              antiguedadReal: 0,
              diasDesdeUltimaCompraReal: 0,
              segmento: 1
          });
          return;
      }

      // 📌 Ordenar cronológicamente las compras
      const comprasOrdenadas = data.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      setComprasHistoricas(comprasOrdenadas);

      // 📌 Calcular indicadores globales basados en TODAS las compras
      calcularIndicadoresGlobales(comprasOrdenadas);

      // 📌 Aplicar el filtro inicial y actualizar la autoescala
      aplicarFiltroYRecalcular(comprasOrdenadas);

  } catch (error) {
      console.error(`❌ Error al obtener historial de compras para el cliente ${clienteId}:`, error);
      setComprasFiltradas([]);
      setComprasHistoricas([]);
      setIndicadoresGlobales({
          antiguedadReal: 0,
          diasDesdeUltimaCompraReal: 0,
          segmento: 1
      });
  }
};
const calcularIndicadoresGlobales = (comprasArr) => {
    if (!comprasArr || comprasArr.length === 0) {
      setIndicadoresGlobales(prev => ({
        ...prev,
        antiguedadReal: 0,
        diasDesdeUltimaCompraReal: 0,
        segmento: 1 
      }));
      return;
    }

    const fechas = comprasArr.map(c => new Date(c.fecha));
    const fechaPrimera = new Date(Math.min(...fechas));
    const fechaUltima = new Date(Math.max(...fechas));
    const hoy = new Date();

    const antiguedad = Math.round((hoy - fechaPrimera) / (1000*60*60*24));
    const diasUltima = Math.round((hoy - fechaUltima) / (1000*60*60*24));

    // Calcular segmento
    const numeroDeCompras = comprasArr.length;
    const totalImporte = comprasArr.reduce((acc, c) => acc + (c.total_con_descuentos || 0), 0);
    const ticketPromedio = numeroDeCompras > 0 ? totalImporte / numeroDeCompras : 0;

    let segmento = 1; // POTENCIAL
    if (numeroDeCompras > 5 && diasUltima < 15 && ticketPromedio > 20) {
      segmento = 4; // MVC
    } else if (numeroDeCompras > 1 && diasUltima < 30 && ticketPromedio > 15) {
      segmento = 3; // ACTIVO
    } else if (numeroDeCompras > 1 && diasUltima > 30) {
      segmento = 2; // INACTIVO
    }

    setIndicadoresGlobales(prev => ({
      ...prev,
      antiguedadReal: antiguedad,
      diasDesdeUltimaCompraReal: diasUltima,
      segmento: segmento
    }));
};
const aplicarFiltroYRecalcular = () => {
    if (comprasHistoricas.length === 0) {
      setComprasFiltradas([]);
      return;
    }

    // 1) Fecha más reciente y más antigua dentro de TODAS las compras
    const fechas = comprasHistoricas.map(c => new Date(c.fecha));
    const fechaMasReciente = new Date(Math.max(...fechas));
    const fechaMasAntigua = new Date(Math.min(...fechas));

    // 2) Aplicar filtro
    let comprasEnRango = comprasHistoricas;
    if (filtroTiempo !== 'historico') {
      comprasEnRango = comprasHistoricas.filter((compra) => {
        const diasDesdeCompra = Math.round((fechaMasReciente - new Date(compra.fecha)) / (1000*60*60*24));
        if (filtroTiempo === '7dias') return diasDesdeCompra <= 7;
        if (filtroTiempo === '15dias') return diasDesdeCompra <= 15;
        if (filtroTiempo === '30dias') return diasDesdeCompra <= 30;
        return true; 
      });
    }

    // 3) Reordenar
    const comprasOrdenadasFiltradas = [...comprasEnRango].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // 4) Calcular RO/FR en esas compras filtradas
    const comprasConROyFR = calcularRentabilidadYFrecuencia(comprasOrdenadasFiltradas);

    setComprasFiltradas(comprasConROyFR);

    // 5) Calcular los KPIs (ticketPromedio, horaMásComprada, etc.) con esas compras
    const kpis = calcularKPIsCliente(comprasConROyFR, fechaMasReciente, fechaMasAntigua);
    setKpiCliente(kpis);

    // 6) Determinar Q1..Q4
    determinarCuadranteVisual(comprasConROyFR);
};
const calcularRentabilidadYFrecuencia = (comprasArr) => {
    let totalAcumulado = 0;
    let resultado = [];

    comprasArr.forEach((compra, index) => {
      const fechaActual = new Date(compra.fecha);
      const fechaAnterior = index > 0 ? new Date(comprasArr[index - 1].fecha) : fechaActual;
      const DUC = index > 0 
        ? Math.max(1, Math.round((fechaActual - fechaAnterior) / (1000 * 60 * 60 * 24))) 
        : 0;

      const NCH = index + 1;

      // Ticket promedio progresivo
      totalAcumulado += (compra.total_con_descuentos || 0);
      const TP = totalAcumulado / NCH;

      const TO = index === 0 ? 0 : TP * 1.15;

      let RO = index === 0 ? 0 : ((compra.total_con_descuentos - TO) / TO) * 100;
      RO = Math.max(-100, Math.min(100, RO));

      let FR = 0;
      if (index > 0 && DUC > 0) {
        FR = NCH / DUC;
      }

      // Mantén aquí la lógica de contención si la tenías
      // ...
      
      if (index === 0) FR = 0;
      FR = Math.max(-100, Math.min(100, FR));

      resultado.push({
        ...compra,
        dias_desde_ultima_compra: DUC, // original
        rentabilidad: RO,
        frecuencia: FR
      });
    });

    return resultado;
};
const calcularKPIsCliente = (comprasArr, fechaMasReciente, fechaMasAntigua) => {
    if (!comprasArr || comprasArr.length === 0) {
      return {
        segmento: "",
        ticketPromedio: 0,
        montoTotal: 0,
        numeroDeCompras: 0,
        antiguedadCliente: 0,
        diasDesdeUltimaCompra: 0,
        id_pizzaMasComprada: "",
        diaMasComprado: "",
        diaDelMesMasComprado: "",
        horaMasComprada: ""
      };
    }

    // (1) Totales en el rango
    const numeroDeCompras = comprasArr.length;
    const montoTotal = comprasArr.reduce((acc, c) => acc + (c.total_con_descuentos || 0), 0);
    const ticketPromedio = montoTotal / numeroDeCompras;

    // (2) Antigüedad y días desde última compra
    //     Aquí seguimos usando la "fechaMasReciente" del HISTORIAL, 
    //     en vez de 'new Date()'. Si quieres que sea "real", cámbialo.
    const antiguedadCliente = Math.round((fechaMasReciente - fechaMasAntigua) / (1000*60*60*24));
    const ultimaCompra = new Date(comprasArr[comprasArr.length - 1].fecha);
    const diasDesdeUltimaCompra = Math.round((fechaMasReciente - ultimaCompra) / (1000*60*60*24));

    // (3) Pizza más comprada
    let pizzaCount = {};
    comprasArr.forEach(venta => {
      try {
        const productos = JSON.parse(venta.productos || "[]");
        productos.forEach(p => {
          pizzaCount[p.id_pizza] = (pizzaCount[p.id_pizza] || 0) + p.cantidad;
        });
      } catch (err) {
        // ...
      }
    });
    const id_pizzaMasComprada = Object.keys(pizzaCount).reduce((a, b) =>
      pizzaCount[a] > pizzaCount[b] ? a : b,
      ""
    );

    // (4) Día y hora más comprados dentro del rango
    let diasSemana = {};     
    let diasDelMes = {};      
    let horas = {};

    comprasArr.forEach((venta) => {
      const fecha = new Date(venta.fecha);
      const diaSemana = fecha.getDay(); // 0..6
      const diaMes = fecha.getDate();   // 1..31
      const hora = venta.hora ? venta.hora.split(':')[0] : "00";  

      diasSemana[diaSemana] = (diasSemana[diaSemana] || 0) + 1;
      diasDelMes[diaMes] = (diasDelMes[diaMes] || 0) + 1;
      horas[hora] = (horas[hora] || 0) + 1;
    });

    // Para convertir 0..6 -> Lunes, Martes, etc.
    const nombreDias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

    const diaMasCompradoNum = Object.keys(diasSemana).reduce((a, b) =>
      diasSemana[a] > diasSemana[b] ? a : b, 0
    );
    const diaMasComprado = nombreDias[diaMasCompradoNum] || "";

    const diaDelMesMasComprado = Object.keys(diasDelMes).reduce((a, b) =>
      diasDelMes[a] > diasDelMes[b] ? a : b,
      ""
    );

    const horaMasCompradaNum = Object.keys(horas).reduce((a, b) =>
      horas[a] > horas[b] ? a : b,
      ""
    );
    const horaMasComprada = Object.keys(horas).reduce((a, b) =>
      horas[a] > horas[b] ? a : b,
      ""
    );
    // (5) Segmento simple (puedes retomar tu Q1, Q2, Q3, Q4 o tu heurística)
    let segmento = "";
    if (numeroDeCompras > 10 && ticketPromedio > 25) {
      segmento = "Cliente VIP";
    } else if (numeroDeCompras > 5) {
      segmento = "Cliente Activo";
    } else {
      segmento = "Cliente Nuevo/Esporádico";
    }

    return {
      segmento,
      ticketPromedio,
      montoTotal,
      numeroDeCompras,
      antiguedadCliente,
      diasDesdeUltimaCompra,
      id_pizzaMasComprada,
      diaMasComprado,
      diaDelMesMasComprado,
      horaMasComprada
    };
};
const determinarCuadranteVisual = (compras) => {
    let q1=0, q2=0, q3=0, q4=0;
    compras.forEach((c) => {
      const RO = c.rentabilidad;
      const FR = c.frecuencia;
      if (RO > 0 && FR > 0) q1++;
      else if (RO < 0 && FR > 0) q2++;
      else if (RO < 0 && FR < 0) q3++;
      else if (RO > 0 && FR < 0) q4++;
    });

    const maxQ = Math.max(q1, q2, q3, q4);
    let shape = null;

    if (maxQ === q1) {
      shape = { x0: 0, x1: 100, y0: 0, y1: 100 }; 
    } else if (maxQ === q2) {
      shape = { x0: -100, x1: 0, y0: 0, y1: 100 };
    } else if (maxQ === q3) {
      shape = { x0: -100, x1: 0, y0: -100, y1: 0 };
    } else if (maxQ === q4) {
      shape = { x0: 0, x1: 100, y0: -100, y1: 0 };
    }

    if (shape) {
      setCuadranteVisual([
        {
          type: 'rect',
          x0: shape.x0,
          x1: shape.x1,
          y0: shape.y0,
          y1: shape.y1,
          fillcolor: 'rgba(100, 100, 255, 0.2)',
          line: { width: 0 }
        }
      ]);
    } else {
      setCuadranteVisual([]);
    }
};
const actualizarLayoutAutoescala = () => {
  if (comprasFiltradas.length > 0) {
    const xValues = comprasFiltradas.map(c => c.rentabilidad);
    const yValues = comprasFiltradas.map(c => c.frecuencia);

    const xMin = Math.min(...xValues) - 10;
    const xMax = Math.max(...xValues) + 10;
    const yMin = Math.min(...yValues) - 10;
    const yMax = Math.max(...yValues) + 10;

    setLayout(prevLayout => ({
      ...prevLayout,
      xaxis: { ...prevLayout.xaxis, range: [xMin, xMax] },
      yaxis: { ...prevLayout.yaxis, range: [yMin, yMax] }
    }));
  }
};
const handleRelayout = (event) => {
  setLayout(prevLayout => ({
    ...prevLayout,
    xaxis: { ...prevLayout.xaxis, autorange: event['xaxis.autorange'] ?? prevLayout.xaxis.autorange },
    yaxis: { ...prevLayout.yaxis, autorange: event['yaxis.autorange'] ?? prevLayout.yaxis.autorange }
  }));
};

const coloresPuntos = comprasFiltradas.map((_, i, arr) => {
  if (i === 0) return 'blue';
  if (i === arr.length - 1) return 'red';
  return 'black';
});

return (
    <div className="mapa-clientes-container">
      <h2>Seguimiento del Cliente #{clienteSeleccionado}</h2>

      {/* FILTRO DE TIEMPO */}
      <select
        value={filtroTiempo}
        onChange={(e) => setFiltroTiempo(e.target.value)}
        style={{ width: '500px' }}
      >
        <option value="7dias">Últimos 7 días</option>
        <option value="15dias">Últimos 15 días</option>
        <option value="30dias">Últimos 30 días</option>
        <option value="historico">Histórico</option>
      </select>

      {/* SELECTOR DE CLIENTES */}
      <select
        value={clienteSeleccionado || ""}
        onChange={(e) => {
          const nuevoClienteId = e.target.value;
          setClienteSeleccionado(nuevoClienteId);
          navigate(`/clientes/seguimiento/${nuevoClienteId}`, { replace: true });
        }}
        style={{ width: '500px' }}
      >
        <option value="" disabled>Selecciona un cliente...</option>
        {listaClientes.length > 0 ? (
          listaClientes.map(cliente => (
            <option key={cliente.id_cliente} value={cliente.id_cliente}>
              {cliente.email} ({cliente.id_cliente})
            </option>
          ))
        ) : (
          <option disabled>Cargando clientes...</option>
        )}
      </select>

      {/* GRÁFICO */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      <Plot
          data={[
            {
              x: comprasFiltradas.map(c => c.rentabilidad),
              y: comprasFiltradas.map(c => c.frecuencia),
              mode: 'markers+text',
              type: 'scatter',
              marker: { size: 10, color: coloresPuntos },
              text: comprasFiltradas.map((_, index) => (index + 1).toString()),
              textposition: 'top center',
              name: 'Evolución del Cliente'
            }
          ]}
          layout={layout}
          style={{ width: '700px', height: '450px' }}
          onRelayout={handleRelayout} // ✅ Evita que la autoescala se rompa
        />

        {/* PANEL DE KPI */}
        <div 
          className="indicadores"
          style={{ 
            border: '1px solid black',
            padding: '10px', 
            borderRadius: '5px',
            width: '350px',
            height: '430px',
            lineHeight: '.65'
          }}
        >
          <h3>KPIs Globales (histórico + fecha real)</h3>
          <p><strong>Antigüedad Real:</strong> {indicadoresGlobales.antiguedadReal} días</p>
          <p><strong>Días desde última compra (Real):</strong> {indicadoresGlobales.diasDesdeUltimaCompraReal}</p>
          <p><strong>Segmento (histórico):</strong> {indicadoresGlobales.segmento}</p>
          <p><strong>Ticket Promedio:</strong> {kpiCliente.ticketPromedio.toFixed(2)}€</p>
          <p><strong>Monto Total:</strong> {kpiCliente.montoTotal.toFixed(2)}€</p>
          <p><strong>Total de Compras:</strong> {kpiCliente.numeroDeCompras}</p>
          <p><strong>id_pizzaMas:</strong> {kpiCliente.id_pizzaMasComprada}</p>
          <p><strong>Día más comprado (semana):</strong> {kpiCliente.diaMasComprado}</p>
          <p><strong>Día del Mes más comprado:</strong> {kpiCliente.diaDelMesMasComprado}</p>
          <p><strong>Hora más comprada:</strong> {kpiCliente.horaMasComprada}</p>

          <hr />
          <p style={{ color: 'blue' }}>⬤ Inicio</p>
          <p style={{ color: 'black' }}>⬤ Recorrido</p>
          <p style={{ color: 'red' }}>⬤ Final</p>
        </div>
      </div>

      <button 
        onClick={() => navigate(`/offers/create?tipo=Customized&idCliente=${clienteSeleccionado}`)}
        className="crear-cupon-btn"
      >
        Customized Coupon
      </button>
    </div>
);
}

export default SeguimientoCliente;
