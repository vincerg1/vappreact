import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { _PizzaContext } from './_PizzaContext';


const createCustomIcon = (number, percentage, estado) => {
  const estadoColor = estado === 'activo' ? 'green' : 'red';
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="
      background-color: white;
      color: black;
      width: 80px;
      height: 80px;
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
      <div>${number}</div>
      <div style="font-size: 12px;">(${percentage.toFixed(2)}%)</div>
      <div style="color: ${estadoColor}; font-size: 14px; font-weight: bold;">${estado.toUpperCase()}</div>
    </div>`,
    iconSize: [80, 80],
    iconAnchor: [40, 40],
    popupAnchor: [0, -40]
  });
};

const clientIcon = L.divIcon({
  className: 'client-icon',
  html: `<div style="
    background-color: white;
    color: black;
    width: 30px;
    height: 30px;
    text-align: center;
    font-size: 12px;
    font-weight: bold;
    border-radius: 50%;
    border: 2px solid blue;
    display: flex;
    justify-content: center;
    align-items: center;
  ">🧑</div>`,
  iconSize: [60, 60],
  iconAnchor: [30, 30],
  popupAnchor: [0, -30]
});

function createStoreIcon(isHovered) {
  const borderColor = isHovered ? "gold" : "green"; // Borde dorado si está seleccionada
  const scale = isHovered ? 1.3 : 1; // Escala más grande si está seleccionada

  return new L.DivIcon({ // ✅ Asegurar que es un L.DivIcon válido
    className: 'store-icon',
    html: `<div style="
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
    ">🍕</div>`,
    iconSize: [30 * scale, 30 * scale], 
    iconAnchor: [15 * scale, 15 * scale], 
    popupAnchor: [0, -15 * scale] 
  });
}



const emojis = ["👩‍🦱", "👨", "👨‍🦰", "👩", "👴"];
function getRandomEmoji() {
  return emojis[Math.floor(Math.random() * emojis.length)];
}

function createClientIcon(emoji, dim = false, isHovered = false) {
  const opacity = dim ? 0.4 : 1; // Atenúa clientes no conectados a la tienda en hover
  const backgroundColor = isHovered ? "yellow" : "white"; // Fondo amarillo si la tienda está en hover
  const scale = isHovered ? 1.3 : 1; // Aumenta el tamaño con efecto suave
  const translateY = isHovered ? "-8px" : "0"; // Efecto de elevación progresiva

  return new L.DivIcon({ // ✅ Aseguramos que devuelve un L.DivIcon
    className: 'client-icon',
    html: `<div style="
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
    ">${emoji}</div>`,
    iconSize: [30 * scale, 30 * scale], 
    iconAnchor: [15 * scale, 15 * scale], 
    popupAnchor: [0, -15 * scale] 
  });
}





export default function TMisZonas() {
  const [tiendas, setTiendas] = useState([]);
  const [ventasPorTienda, setVentasPorTienda] = useState({});
  const [clientesVentas, setClientesVentas] = useState([]);
  const [selectedIndicator, setSelectedIndicator] = useState('delivery');
  const [selectedStoreId, setSelectedStoreId] = useState(null)
  const { sessionData } = useContext(_PizzaContext);
  const [hoveredStoreId, setHoveredStoreId] = useState(null);
  const showConnectionLine = false;

  useEffect(() => {
    fetchTiendas();
    fetchVentasPorTienda();
    fetchClientesVentas();
  }, []);

  const fetchTiendas = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/info-empresa');
      setTiendas(response.data);
    } catch (error) {
      console.error('Error fetching tiendas:', error);
    }
  };
  const fetchVentasPorTienda = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/ventas-por-tienda');
      const ventasData = response.data.data.reduce((acc, tienda) => {
        acc[tienda.tienda_id] = {
          delivery: Number(tienda.ventas_delivery) || 0,
          pickup: Number(tienda.ventas_pickup) || 0,
          total: Number(tienda.ventas_totales) || 0
        };
        return acc;
      }, {});
      setVentasPorTienda(ventasData);
    } catch (error) {
      console.error('Error fetching ventas por tienda:', error);
    }
  };
  const fetchClientesVentas = async () => {
    try {
      const idCliente = sessionData?.id_cliente;
      if (!idCliente) {
        console.warn("⚠️ No hay id_cliente disponible en la sesión.");
        return;
      }
  
      const response = await axios.get(`http://localhost:3001/api/clientes-ventas/${idCliente}`);
      
      const dataConEmojis = response.data.map((venta) => {
        return {
          ...venta,
          randomEmoji: getRandomEmoji()
        };
      });
  
      setClientesVentas(dataConEmojis);
    } catch (error) {
      console.error('Error fetching clientes ventas:', error);
    }
  };
  
  

  const totalVentas = Object.values(ventasPorTienda)
    .reduce((acc, tienda) => acc + (Number(tienda[selectedIndicator]) || 0), 0);

  return (
    <div>
      <h3>Zonas de Influencia</h3>

      <label>
        Indicador de Ventas:
        <select value={selectedIndicator} onChange={(e) => setSelectedIndicator(e.target.value)}>
          <option value="delivery">Ventas Delivery</option>
          <option value="pickup">Ventas Pickup</option>
          <option value="total">Ventas Totales</option>
          <option value="clientes">Clientes y relación con Tiendas</option>
        </select>
      </label>

      <div style={{ height: '800px', width: '100%' }}>
        <MapContainer center={[42.34, -7.86]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* 📍 Marcadores de Tiendas según el indicador */}
          {selectedIndicator !== 'clientes' &&
            tiendas.map((tienda, index) => {
              const ventas = ventasPorTienda[tienda.id] || { delivery: 0, pickup: 0, total: 0 };
              const ventasNumber = ventas[selectedIndicator];
              const porcentaje = totalVentas > 0 ? (ventasNumber / totalVentas) * 100 : 0;

              if (ventasNumber === 0) return null;

              return (
                <Marker
                  key={`tienda-${index}`}
                  position={[tienda.coordenadas_latitud, tienda.coordenadas_longitud]}
                  icon={createCustomIcon(ventasNumber, porcentaje, tienda.estado)}
                >
                  <Popup>
                    <strong>Tienda:</strong> {tienda.nombre_empresa} <br />
                    <strong>Estado:</strong> {tienda.estado} <br />
                    <strong>Ventas ({selectedIndicator}):</strong> {ventasNumber} <br />
                    <strong>Porcentaje:</strong> {porcentaje.toFixed(2)}%
                  </Popup>
                </Marker>
              );
            })}

          {/* 📍 Clientes y su conexión con Tienda de Salida */}
          {selectedIndicator === 'clientes' &&
            clientesVentas.map((venta, index) => {
              const storeId = venta?.metodo_entrega?.tiendaSalida?.id; // ID de la tienda
              const storeLatLng = [
                venta.metodo_entrega.tiendaSalida.lat,
                venta.metodo_entrega.tiendaSalida.lng
              ];

              // Determina si el cliente debe atenuarse (es otra tienda en hover)
              const isClientDimmed = hoveredStoreId && hoveredStoreId !== storeId;

              return (
                <React.Fragment key={index}>
                <Marker
                  position={[venta.metodo_entrega.cliente.lat, venta.metodo_entrega.cliente.lng]}
                  icon={createClientIcon(
                    venta.randomEmoji,
                    hoveredStoreId && hoveredStoreId !== storeId, // Atenuamos si la tienda no está en hover
                    hoveredStoreId === storeId // Aplicamos el efecto solo si la tienda está en hover
                  )}
                  eventHandlers={{
                    click: () => {
                      if (venta.id_cliente) {
                        window.location.href = `http://localhost:3000/clientes/seguimiento/${venta.id_cliente}`;
                      } else {
                        console.warn("⚠️ No se encontró el id_cliente para este cliente.");
                      }
                    }
                  }}
                />



<Marker
  position={storeLatLng}
  icon={createStoreIcon(hoveredStoreId === storeId)} // ✅ Se llama la función correctamente
  eventHandlers={{
    mouseover: () => setHoveredStoreId(storeId), // Solo afecta a los clientes
    mouseout: () => setHoveredStoreId(null),
  }}
/>



                 
                </React.Fragment>
              );
            })}
        </MapContainer>
      </div>
    </div>
  );
}
