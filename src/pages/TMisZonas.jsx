import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { _PizzaContext } from './_PizzaContext';
import * as turf from '@turf/turf';

const emojis = ['👩‍🦱', '👨', '👨‍🦰', '👩', '👴'];

function createSparkline(data = []) {
  if (!data || data.length < 2) {
    // Si no hay datos suficientes, regresamos vacío
    return '';
  }

  // Configuraciones del gráfico
  const width = 50;
  const height = 15;

  // Calculamos el valor máx y mín para escalar
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1; // Evitar división por cero

  // Convertimos cada valor en un punto x,y
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    // y invertida para que 0 quede abajo
    const y = height - ((val - minVal) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  // Retornamos un pequeño SVG con la línea
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <polyline points="${points}" fill="none" stroke="red" stroke-width="2" />
    </svg>
  `;
}
const createCustomIcon = (
  ventasTotales,
  promedioHistorico,
  promedioPeriodo,
  estado,
  crecimiento,
  isHistoric = false,
  sparklineData = [] // array de números para minigráfico
) => {
  // Si NO es histórico, usamos flechas. Si es histórico, no tiene sentido flecha
  const arrow = isHistoric ? '' : (crecimiento >= 0 ? '🔺' : '🔻');

  // Generamos el SVG del minigráfico con la función de ayuda
  const sparklineSVG = createSparkline(sparklineData);

  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="
        background-color: white;
        color: black;
        width: 80px;
        height: 100px;
        text-align: center;
        font-size: 14px;
        font-weight: bold;
        border-radius: 10px;
        border: 2px solid black;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 5px;
      ">
        <div>${ventasTotales.toFixed(1)}</div>
        ${
          isHistoric
            ? `<div style="font-size: 12px;">(${crecimiento.toFixed(2)}%)</div>`
            : `<div style="font-size: 12px;">(${crecimiento.toFixed(2)}% ${arrow})</div>`
        }
        <div style="color: ${estado === 'activo' ? 'green' : 'red'}; font-size: 14px; font-weight: bold;">
          ${estado.toUpperCase()}
        </div>
        <!-- Aquí incrustamos nuestro sparkline -->
        <div style='margin-top:4px;'>${sparklineSVG}</div>
      </div>
    `,
    iconSize: [80, 100],
    iconAnchor: [40, 50],
    popupAnchor: [0, -50],
  });
};
function createStoreIcon(isHovered) {
  const borderColor = isHovered ? 'gold' : 'green';
  const scale = isHovered ? 1.3 : 1;
  return L.divIcon({
    className: 'store-icon',
    html: `
      <div style="
        background-color: white;
        color: black;
        width: ${30 * scale}px;
        height: ${30 * scale}px;
        text-align: center;
        font-size: 12px;
        font-weight: bold;
        border-radius: 10px;
        border: 2px solid ${borderColor};
        display: flex;
        justify-content: center;
        align-items: center;
        transform: scale(${scale});
        transition: transform 0.3s ease-in-out;
      ">
        🍕
      </div>
    `,
    iconSize: [30 * scale, 30 * scale],
    iconAnchor: [15 * scale, 15 * scale],
    popupAnchor: [0, -15 * scale],
  });
}
function getRandomEmoji() {
  return emojis[Math.floor(Math.random() * emojis.length)];
}
function createClientIcon(emoji, dim = false, isHovered = false) {
  const opacity = dim ? 0.4 : 1;
  const backgroundColor = isHovered ? 'yellow' : 'white';
  const scale = isHovered ? 1.3 : 1;
  const translateY = isHovered ? '-8px' : '0';

  return L.divIcon({
    className: 'client-icon',
    html: `
      <div style="
        background-color: ${backgroundColor};
        color: black;
        width: ${30 * scale}px;
        height: ${30 * scale}px;
        text-align: center;
        font-size: 12px;
        font-weight: bold;
        border-radius: 50%;
        border: 2px solid blue;
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: ${opacity};
        transform: scale(${scale}) translateY(${translateY});
        transition: transform 0.3s ease-in-out, background-color 0.3s ease-in-out;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [30 * scale, 30 * scale],
    iconAnchor: [15 * scale, 15 * scale],
    popupAnchor: [0, -15 * scale],
  });
}

/* ===================== COMPONENTE PRINCIPAL ===================== */
export default function TMisZonas() {
  const { sessionData } = useContext(_PizzaContext);
  const [tiendas, setTiendas] = useState([]);
  const [ventasPorTienda, setVentasPorTienda] = useState({});
  const [tendencias, setTendencias] = useState({});  
  const [clientesVentas, setClientesVentas] = useState([]);
  const [selectedIndicator, setSelectedIndicator] = useState('delivery');
  const [hoveredStoreId, setHoveredStoreId] = useState(null);
  const [voronoiData, setVoronoiData] = useState(null);
  const [storePolygons, setStorePolygons] = useState({});
  const [localesCiudad, setLocalesCiudad] = useState([]);
  const [showComercios, setShowComercios] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  useEffect(() => {
    fetchTiendas();
    fetchVentasPorTienda();
    fetchClientesVentas();
    fetchTendenciasMultiples();
  }, []);
  useEffect(() => {
    if (tiendas.length > 1) {
      generarVoronoiPoligonos(tiendas);
    }
  }, [tiendas]);
  useEffect(() => {
    if (tiendas.length > 0) {
      const ciudadLat = 42.34;  
      const ciudadLng = -7.86;
      const radio = 7000;
      fetchLocalesCiudad(ciudadLat, ciudadLng, radio);
    }
  }, [tiendas]);
  useEffect(() => {
    fetchTiendas();
    fetchClientesVentas();
  }, []);
  useEffect(() => {
    console.log("🟡 Filtro de tiempo cambiado:", selectedPeriod);
    fetchVentasPorTienda(selectedPeriod);
    if (selectedIndicator === 'clientes') {
      fetchClientesVentas(selectedPeriod);
      }
  }, [selectedPeriod]);

  const iconoNaranja = L.divIcon({
    className: "naranja-icon",
    html: `
      <div style="
        background-color: orange;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid #FF6600;
      "></div>
    `,
    iconSize: [15, 15],
    iconAnchor: [7.5, 7.5],
    popupAnchor: [0, -7],
  });

  async function fetchTendenciasMultiples() {
    try {
      const periods = ['7', '15', '30'];
      // Para guardar temporalmente los totales de cada tienda
      // { tiendaId: { '7': number, '15': number, '30': number } }
      const resultsObj = {};

      // Lanzamos 3 peticiones secuenciales (o podrías usar Promise.all, si quieres)
      for (const p of periods) {
        const url = `${process.env.REACT_APP_API_URL}/api/ventas-por-tienda?period=${p}`;
        const resp = await axios.get(url);

        resp.data.data.forEach(row => {
          const tId = row.tienda_id;
          if (!resultsObj[tId]) {
            resultsObj[tId] = { '7': 0, '15': 0, '30': 0 };
          }
          // Asignamos, por ejemplo, la suma de ventas totales
          resultsObj[tId][p] = Number(row.ventas_totales) || 0;
        });
      }

      // Convertimos cada tienda en un array [7d, 15d, 30d]
      const finalTendencias = {};
      Object.keys(resultsObj).forEach(tId => {
        finalTendencias[tId] = [
          resultsObj[tId]['7'],
          resultsObj[tId]['15'],
          resultsObj[tId]['30'],
        ];
      });

      setTendencias(finalTendencias);
    } catch (error) {
      console.error('❌ Error en fetchTendenciasMultiples:', error);
    }
  }
  const fetchTiendas = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/info-empresa`);
      setTiendas(response.data);
    } catch (error) {
      console.error('Error fetching tiendas:', error);
    }
  };
  const fetchVentasPorTienda = async (period) => {
    if (!['7', '15', '30', 'all'].includes(period)) {
      console.warn("⚠️ Intento de consulta con un periodo inválido:", period);
      period = 'all';
    }
    try {
      const url = `${process.env.REACT_APP_API_URL}/api/ventas-por-tienda?period=${period}`;
      console.log("🔵 Petición al backend:", url);
      
      const response = await axios.get(url);
      console.log("🟢 Respuesta de ventas:", response.data);

      const ventasData = response.data.data.reduce((acc, tienda) => {
        acc[tienda.tienda_id] = {
          delivery: Number(tienda.ventas_delivery) || 0,
          pickup: Number(tienda.ventas_pickup) || 0,
          total: Number(tienda.ventas_totales) || 0,
          promedioHistorico: Number(tienda.promedio_historico) || 0,
          promedioPeriodo: Number(tienda.promedio_periodo) || 0,
        };
        return acc;
      }, {});

      setVentasPorTienda(ventasData);
    } catch (error) {
      console.error('❌ Error en fetchVentasPorTienda:', error);
    }
  };
  const fetchClientesVentas = async (period = 'all') => {
    try {

if (!['7','15','30','all'].includes(period)) {
 period = 'all';
}
  

const url = `${process.env.REACT_APP_API_URL}/api/clientes-ventas?period=${period}`;
console.log('🟡 (Clientes) GET:', url);
const response = await axios.get(url);
  
const dataConEmojis = response.data.map(venta => ({
...venta,
randomEmoji: getRandomEmoji(),
}));
  
setClientesVentas(dataConEmojis);
    } catch (error) {
      console.error('Error fetching clientes ventas:', error);
    }
  };
  const generarVoronoiPoligonos = (listaTiendas) => {
    const points = listaTiendas.map((t) =>
      turf.point([Number(t.coordenadas_longitud), Number(t.coordenadas_latitud)])
    );
    const featureCollection = turf.featureCollection(points);

    const lats = listaTiendas.map((t) => Number(t.coordenadas_latitud));
    const lngs = listaTiendas.map((t) => Number(t.coordenadas_longitud));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const bbox = [minLng - 0.01, minLat - 0.01, maxLng + 0.01, maxLat + 0.01];
    const voronoi = turf.voronoi(featureCollection, { bbox });

    if (voronoi) {
      setVoronoiData(voronoi);
      const newStorePolygons = {};
      voronoi.features.forEach((feature) => {
        const store = listaTiendas.find((t) =>
          turf.booleanPointInPolygon(
            turf.point([t.coordenadas_longitud, t.coordenadas_latitud]),
            feature
          )
        );
        if (store) {
          newStorePolygons[store.id] = feature;
        }
      });
      setStorePolygons(newStorePolygons);
    }
  };
  const fetchLocalesCiudad = async (lat, lng, radio) => {
    try {
      const query = `
        [out:json];
        (
          node["shop"](around:${radio},${lat},${lng});
          node["amenity"~"restaurant|cafe|bar|pub|fast_food|bakery|supermarket|convenience|marketplace"](around:${radio},${lat},${lng});
        );
        out;
      `;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      console.log("🌐 Consulta Overpass Única (Ciudad):", url);

      const response = await axios.get(url);
      if (!response.data.elements) {
        return;
      }

      const nodos = response.data.elements.map((el) => ({
        lat: el.lat,
        lng: el.lon,
        tags: el.tags,
        id: el.id,
      }));
      setLocalesCiudad(nodos);
      console.log(`✅ Se obtuvieron ${nodos.length} locales de OSM para la ciudad.`);
    } catch (error) {
      console.error('❌ Error al obtener locales ciudad:', error);
    }
  };
  const getPoligonoStyle = (feature) => {
    const store = tiendas.find((t) =>
      turf.booleanPointInPolygon(
        turf.point([t.coordenadas_longitud, t.coordenadas_latitud]),
        feature
      )
    );
    if (!store) {
      return { color: 'blue', fillColor: 'lightblue', weight: 1, fillOpacity: 0.2 };
    }
    if (store.estado === 'inactivo') {
      return { color: 'red', fillColor: '#FF6666', weight: 1, fillOpacity: 0.3 };
    } else {
      return { color: 'blue', fillColor: 'lightblue', weight: 1, fillOpacity: 0.2 };
    }
  };
  const onEachVoronoiFeature = (feature, layer) => {
    const store = tiendas.find((t) =>
      turf.booleanPointInPolygon(
        turf.point([t.coordenadas_longitud, t.coordenadas_latitud]),
        feature
      )
    );
    if (store) {
      layer.bindPopup(`
        <b>${store.nombre_empresa}</b><br/>
        Estado: ${store.estado}
      `);
    }
  };

  const totalVentas = Object.values(ventasPorTienda).reduce((acc, t) => {
    return acc + (Number(t[selectedIndicator]) || 0);
  }, 0);
  const promedioVentas = tiendas.length > 0 ? totalVentas / tiendas.length : 0;

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* <h3>Zonas de Influencia (Voronoi) + Comercios Ciudad</h3> */}

      {/* Contenedor de filtros y botón, organizados horizontalmente */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '10px'
        }}
      >
        <label>
          Indicador de Ventas:{' '}
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
          >
            <option value="delivery">Ventas Delivery</option>
            <option value="pickup">Ventas Pickup</option>
            <option value="total">Ventas Totales</option>
            <option value="clientes">Clientes y relación con Tiendas</option>
          </select>
        </label>

        <label>
          Filtro de tiempo:{' '}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="7">Últimos 7 días</option>
            <option value="15">Últimos 15 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="all">Histórico</option>
          </select>
        </label>
      </div>
      <button onClick={() => setShowComercios(!showComercios)}>
        {showComercios ? 'Ocultar' : 'Mostrar'} Comercios
      </button>

      {/* Contenedor para el mapa */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[42.34, -7.86]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {voronoiData && (
            <GeoJSON
              data={voronoiData}
              style={getPoligonoStyle}
              onEachFeature={onEachVoronoiFeature}
            />
          )}

          {selectedIndicator !== 'clientes' &&
            tiendas.map((tienda, index) => {
              const ventasTienda = ventasPorTienda[tienda.id] || {
                delivery: 0,
                pickup: 0,
                total: 0,
                promedioHistorico: 0,
                promedioPeriodo: 0,
              };
              const valor = ventasTienda[selectedIndicator] || 0;
              const promHist = ventasTienda.promedioHistorico || 0;
              const promPeriodo = ventasTienda.promedioPeriodo || 0;

              let growthVal = 0;      
              let isHistoric = false; 
              if (selectedPeriod === 'all') {
                // Porcentaje de participación = (ventas tienda / total de ventas) * 100
                isHistoric = true;
                growthVal = (totalVentas > 0) ? (valor / totalVentas) * 100 : 0;
              } else {
                // Crecimiento = ((promPeriodo - promHist) / promHist) * 100 (si promHist != 0)
                if (promHist !== 0) {
                  growthVal = ((promPeriodo - promHist) / promHist) * 100;
                }
              }
              const sparklineArray = tendencias[tienda.id] || [0, 0, 0];
              // Si todo está en 0 y no hay histórico, evitamos dibujar
              if (valor === 0 && promHist === 0);
              
              // Aquí podrías reemplazar [10, 20, 25] con un arreglo real
              // de datos para 3, 15 y 7 días, o la lógica que tú quieras
              return (
                <Marker
                  key={`tienda-${index}`}
                  position={[tienda.coordenadas_latitud, tienda.coordenadas_longitud]}
                  icon={createCustomIcon(
                    valor,
                    promHist,
                    promPeriodo,
                    tienda.estado,
                    growthVal,
                    isHistoric,
                    sparklineArray  
                  )}
                >
                  <Popup>
                    <strong>Tienda:</strong> {tienda.nombre_empresa}
                    <br />
                    <strong>Estado:</strong> {tienda.estado}
                    <br />
                    <strong>Ventas ({selectedIndicator}):</strong> {valor}
                    <br />
                    <strong>Tendencia:</strong> {sparklineArray ? sparklineArray.join(' → ') : 'No disponible'}
                    <br />
                    {isHistoric ? (
                      <>
                        <strong>Participación:</strong> {growthVal.toFixed(2)}%
                      </>
                    ) : (
                      <>
                        <strong>Prom. Hist.:</strong> {promHist}
                        <br />
                        <strong>Crecimiento vs histórico:</strong> {growthVal.toFixed(2)}%
                        <br />
                        
                      </>
                      
                    )}
               
                  </Popup>
                </Marker>
              );
            })}

          {selectedIndicator === 'clientes' &&
            clientesVentas.map((venta, i) => {
              const storeId = venta?.metodo_entrega?.tiendaSalida?.id;
              const storeLatLng = [
                venta.metodo_entrega.tiendaSalida.lat,
                venta.metodo_entrega.tiendaSalida.lng,
              ];

              return (
                <React.Fragment key={i}>
                  <Marker
                    position={[
                      venta.metodo_entrega.cliente.lat,
                      venta.metodo_entrega.cliente.lng,
                    ]}
                    icon={createClientIcon(
                      venta.randomEmoji,
                      hoveredStoreId && hoveredStoreId !== storeId,
                      hoveredStoreId === storeId
                    )}
                    
                  />

                  <Marker
                    position={storeLatLng}
                    icon={createStoreIcon(hoveredStoreId === storeId)}
                    eventHandlers={{
                      mouseover: () => setHoveredStoreId(storeId),
                      mouseout: () => setHoveredStoreId(null),
                    }}
                  />
                </React.Fragment>
              );
            })}

          {showComercios && localesCiudad.map((local) => (
            <Marker
              key={local.id}
              position={[local.lat, local.lng]}
              icon={iconoNaranja}
            >
              <Popup>
                <strong>{local.tags?.name || 'Local sin nombre'}</strong>
                <br />
                {local.tags?.shop && <div>Shop: {local.tags.shop}</div>}
                {local.tags?.amenity && <div>Amenity: {local.tags.amenity}</div>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
