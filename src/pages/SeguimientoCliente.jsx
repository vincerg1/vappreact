import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Plot from 'react-plotly.js';
import axios from 'axios';
import '../styles/Clientes.css';

function SeguimientoCliente() {
  const { id } = useParams();
  const [compras, setCompras] = useState([]);
  const [filtroTiempo, setFiltroTiempo] = useState('historico');
  const [indicadores, setIndicadores] = useState({ segmento: '', ticketPromedio: 0, antiguedad: 0, totalCompras: 0 });
  const [listaClientes, setListaClientes] = useState([]); // Lista de clientes
  const [clienteSeleccionado, setClienteSeleccionado] = useState(id || "");

  
useEffect(() => {
    fetchHistorialCompras();
    fetchClienteSegmento();
}, [id, filtroTiempo]);
useEffect(() => {
    if (clienteSeleccionado) {
        fetchHistorialCompras(clienteSeleccionado);
    }
}, [clienteSeleccionado]);
useEffect(() => {
  fetchListaClientes();
}, []);
useEffect(() => {
  if (clienteSeleccionado) {
    fetchHistorialCompras(clienteSeleccionado);
  }
}, [clienteSeleccionado, filtroTiempo]);

const fetchHistorialCompras = async (clienteId) => {
  try {
      const response = await axios.get(`http://localhost:3001/registro_ventas/cliente/${clienteId}`);
      const data = response.data.data;

      if (data.length === 0) return;

      // Ordenar compras en orden cronológico
      const comprasOrdenadas = data.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      // Obtener datos del cliente
      const clienteResponse = await axios.get(`http://localhost:3001/clientes/${clienteId}`);
      const ticketObjetivo = clienteResponse.data.ticketObjetivo;

      // Obtener la fecha más antigua (primera compra)
      const fechaPrimeraCompra = new Date(comprasOrdenadas[0].fecha);
      const antiguedadCliente = Math.round((new Date() - fechaPrimeraCompra) / (1000 * 60 * 60 * 24));

      console.log(`🟡 Cliente ${clienteId}:`);
      console.log(`   - Fecha de primera compra: ${fechaPrimeraCompra.toISOString().split("T")[0]}`);
      console.log(`   - Antigüedad del cliente en días: ${antiguedadCliente}`);

      // ✅ **Actualizar estado del cliente seleccionado**
      setClienteSeleccionado(clienteId);

      let totalAcumulado = 0; // Para TP progresivo

      const comprasProcesadas = comprasOrdenadas.map((compra, index, arr) => {
          const fechaActual = new Date(compra.fecha);
          const fechaAnterior = index > 0 ? new Date(arr[index - 1].fecha) : fechaActual;
          const DUC = index > 0 ? Math.max(1, Math.round((fechaActual - fechaAnterior) / (1000 * 60 * 60 * 24))) : 0;
          const NCH = index + 1;

          // 📌 **Calcular TP de manera progresiva**
          totalAcumulado += compra.total_con_descuentos;
          const TP = totalAcumulado / NCH;

          // 📌 **Calcular TO basado en el TP progresivo**
          const TO = index === 0 ? 0 : TP * 1.15;

          // 📌 **Cálculo de Rentabilidad Objetiva (Eje X)**
          let RO = index === 0 ? 0 : ((compra.total_con_descuentos - TO) / TO) * 100;
          RO = Math.max(-100, Math.min(100, RO));

          // 📌 **Cálculo de Frecuencia Relativa (Eje Y)**
          let FR = 0;
          if (index > 0 && DUC > 0) {
              FR = NCH / DUC;
          }

          // Aplicar curva de contención si el ratio es menor o igual a 0.10
          const frRatio = NCH / (DUC > 0 ? DUC : 1);
          if (frRatio <= 0.10) {
              if (frRatio > 0.09) FR -= 10;
              else if (frRatio > 0.08) FR -= 20;
              else if (frRatio > 0.07) FR -= 30;
              else if (frRatio > 0.06) FR -= 40;
              else if (frRatio > 0.05) FR -= 50;
              else if (frRatio > 0.04) FR -= 60;
              else if (frRatio > 0.03) FR -= 70;
              else if (frRatio > 0.02) FR -= 80;
              else if (frRatio > 0.01) FR -= 90;
              else FR = -100;
          }

          // Aplicar Checkpoints de Fidelidad
          if (NCH >= 200) {
              FR = Math.max(FR, 50);
          } else if (NCH >= 100 && DUC <= 7) {
              FR = Math.max(FR, 80);
          } else if (NCH >= 50 && DUC <= 7) {
              FR = Math.max(FR, 60);
          }

          // Curva de Contención para evitar FR excesivo
          if (NCH > 100) {
              if (NCH <= 150) {
                  FR *= 0.90;
              } else if (NCH <= 200) {
                  FR *= 0.80;
              } else {
                  FR *= 0.70;
              }
          }

          // Limitar FR entre -100 y 100
          FR = Math.max(-100, Math.min(100, FR));

          // 📌 **CASO COMPRA 1: FR debe ser 0**
          if (index === 0) FR = 0;

          // 📌 **LOG MEJORADO**
          console.log(`🔎 NCH=${NCH}`);
          console.log(`   - Fecha=${compra.fecha}`);
          console.log(`   - TCD=${compra.total_con_descuentos}`);
          console.log(`   - TP=${TP.toFixed(2)}`); // ✅ TP ahora se recalcula correctamente
          console.log(`   - TO=${TO.toFixed(2)}`); // ✅ TO ahora cambia dinámicamente
          console.log(`   - RO=${RO.toFixed(2)}`);
          console.log(`   - DUC=${DUC}`);
          console.log(`   - NCH=${NCH}`);
          console.log(`   - FR=${FR.toFixed(2)}`);

          return {
              ...compra,
              dias_desde_ultima_compra: DUC,
              rentabilidad: RO, // 📌 **Eje X**
              frecuencia: FR // 📌 **Eje Y**
          };
      });

      // ✅ **Actualizar el estado de las compras**
      setCompras(comprasProcesadas);

      // 📌 **Actualizar indicadores globales**
      const totalCompras = comprasProcesadas.length;
      const ticketPromedio = comprasProcesadas.reduce((acc, compra) => acc + compra.total_con_descuentos, 0) / totalCompras;
      const antiguedad = antiguedadCliente;

      setIndicadores(prev => ({
          ...prev,
          ticketPromedio,
          antiguedad,
          totalCompras
      }));

  } catch (error) {
      console.error(`❌ Error al obtener historial de compras para el cliente ${clienteId}:`, error);
  }
};

const fetchClienteSegmento = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/clientes/${id}`);
      setIndicadores(prev => ({ ...prev, segmento: response.data.segmento }));
    } catch (error) {
      console.error('Error al obtener segmento del cliente:', error);
    }
};
const fetchListaClientes = async () => {
  try {
      const response = await axios.get("http://localhost:3001/clientes");
      setListaClientes(response.data);
      console.log(listaClientes)
  } catch (error) {
      console.error("Error al obtener la lista de clientes:", error);
  }
};

  const comprasFiltradas = compras.filter(compra => {
    if (filtroTiempo === '7dias') return compra.dias_desde_ultima_compra <= 7;
    if (filtroTiempo === '15dias') return compra.dias_desde_ultima_compra <= 15;
    if (filtroTiempo === '30dias') return compra.dias_desde_ultima_compra <= 30;
    return true;
  });

  const coloresPuntos = comprasFiltradas.map((_, index, arr) => {
    if (index === 0) return 'blue';
    if (index === arr.length - 1) return 'red';
    return 'black';
  });

  return (
    <div className="seguimiento-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
      <h2>Seguimiento del Cliente #{clienteSeleccionado}</h2>
      <p>Aquí puedes visualizar el historial y evolución del cliente en términos de rentabilidad.</p>
      <select value={filtroTiempo} onChange={(e) => setFiltroTiempo(e.target.value)} style={{ width: '500px' }}>
        <option value="7dias">Últimos 7 días</option>
        <option value="15dias">Últimos 15 días</option>
        <option value="30dias">Últimos 30 días</option>
        <option value="historico">Histórico</option>
      </select>
      <select 
        value={clienteSeleccionado} 
        onChange={(e) => setClienteSeleccionado(e.target.value)}
        style={{ width: '500px' }}
      >
        <option value="" disabled>Selecciona un cliente...</option>
        {listaClientes.length > 0 ? listaClientes.map(cliente => (
          <option key={cliente.id_cliente} value={cliente.id_cliente}>
            {cliente.email} ({cliente.id_cliente})
          </option>
        )) : <option disabled>Cargando clientes...</option>}
      </select>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Plot
         data={[{
          x: comprasFiltradas.map(compra => compra.rentabilidad),
          y: comprasFiltradas.map(compra => compra.frecuencia), // ✅ Usamos la Frecuencia Relativa
          mode: 'markers+text',
          type: 'scatter',
          marker: { size: 10, color: coloresPuntos },
          text: comprasFiltradas.map((_, index) => (index + 1).toString()),
          textposition: 'top center',
          name: 'Evolución del Cliente'
          }]}
          layout={{
            title: 'Mapa de Evolución del Cliente',
            xaxis: { title: 'Rentabilidad', range: [-110, 110], zeroline: true },
            yaxis: { title: 'Frecuencia de Compra', range: [-110, 110], zeroline: true },
            shapes: [
              { type: 'line', x0: 0, x1: 0, y0: -100, y1: 100, line: { color: 'black', dash: 'solid' } },
              { type: 'line', x0: -100, x1: 100, y0: 0, y1: 0, line: { color: 'black', dash: 'solid' } }
            ]
          }}
        />
        <div className="indicadores" style={{ border: '1px solid black', padding: '10px', borderRadius: '5px', width: '40%', height: '430px' }}>
          <h3>Indicadores Clave</h3>
          <p><strong>Segmento:</strong> {indicadores.segmento}</p>
          <p><strong>Ticket Promedio:</strong> {indicadores.ticketPromedio.toFixed(2)}€</p>
          <p><strong>Antigüedad:</strong> {indicadores.antiguedad} días</p>
          <p><strong>Total de Compras:</strong> {indicadores.totalCompras}</p>
          <p style={{ color: 'blue' }}>⬤ Inicio</p>
          <p style={{ color: 'black' }}>⬤ Recorrido</p>
          <p style={{ color: 'red' }}>⬤ Final</p>
        </div>
      </div>
    </div>
  );
}

export default SeguimientoCliente;

