
import React, { useEffect, useState } from "react";
import moment from "moment-timezone";
import geohash from "ngeohash";
import axios from "axios";
import "../styles/RouteSetter.css"; 


const RouteSetter = () => {
  const [orders, setOrders] = useState([]);
  const [selectedChain, setSelectedChain] = useState("");
  const [rutasSelladas, setRutasSelladas] = useState([]);
  const [asignandoCadena, setAsignandoCadena] = useState(null);
  const [repartidorSeleccionado, setRepartidorSeleccionado] = useState("");
  const [repartidoresActivos, setRepartidoresActivos] = useState([]);
  const [successMessage, setSuccessMessage] = useState(null);
  const [cadenasAprobadas, setCadenasAprobadas] = useState([]);
  const [generatedRoutes, setGeneratedRoutes] = useState([]);
  const googleMapsApiKey = "AIzaSyAi1A8DDiBPGA_KQy2G47JVhFnt_QF0fN8"; 
  const geoHashColors = {};
  const coordinateCache = {};



  useEffect(() => {
    fetchOrders();
    fetchRepartidoresActivos();
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          timeLeft: calculateTimeLeft(o.fechaYHoraPrometida),
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000); // cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const getGeoHashColor = (hash) => {
    if (!geoHashColors[hash]) {
      const colors = [
        "red", "blue", "green", "orange",
        "purple", "teal", "pink", "brown",
        "yellow", "gray", "coral", "gold"
      ];
      geoHashColors[hash] = colors[Math.floor(Math.random() * colors.length)];
    }
    return geoHashColors[hash];
  };
  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/registro_ventas`);
      const data = response.data.data || [];

      const pedidos = await Promise.all(
        data
          .filter((venta) => {
            try {
              const metodoEntrega = JSON.parse(venta.metodo_entrega || "{}");
              return metodoEntrega.Delivery && venta.estado_entrega !== "Entregado";
            } catch (err) {
              console.error("Error al parsear metodo_entrega:", err);
              return false;
            }
          })
          .map(async (venta) => {
            const metodoEntrega = JSON.parse(venta.metodo_entrega);
            const delivery = metodoEntrega.Delivery || {};

            const address = delivery.address || "Sin dirección";
            const fechaYHoraPrometida = delivery.fechaYHoraPrometida || null;
            const lat = delivery.latitud;
            const lng = delivery.longitud;

            const hasValidCoords =
              typeof lat === "number" &&
              typeof lng === "number" &&
              !isNaN(lat) &&
              !isNaN(lng);

            // Calculamos geohash. Si no hay coords, forzamos un "xxxxx"
            const hash = hasValidCoords ? geohash.encode(lat, lng, 5) : "xxxxx";

            // Retornamos el pedido con todos sus datos
            return {
              id_order: venta.id_order,
              address,
              fechaYHoraPrometida,
              timeLeft: calculateTimeLeft(fechaYHoraPrometida),
              estado_entrega: venta.estado_entrega,
              metodo_entrega: venta.metodo_entrega,
              isExpress: delivery.TicketExpress || false,
              delivery_chain_id: null, 
              repartidor: venta.id_repartidor || null,
              geoHash: hash,
              color: getGeoHashColor(hash),
            };
          })
      );

      setOrders(pedidos);
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
    }
  };
  const fetchRepartidoresActivos = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/repartidores/activos`);
      if (response.data.success) {
        setRepartidoresActivos(response.data.data);
      } else {
        console.warn("No se pudieron obtener los repartidores activos:", response.data.message);
      }
    } catch (error) {
      console.error("Error al obtener repartidores activos:", error);
    }
  };
  const geocodeAddressWithCache = async (address) => {
    if (coordinateCache[address]) return coordinateCache[address];

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`
      );
      const results = response.data.results;
      if (results.length > 0) {
        const { lat, lng } = results[0].geometry.location;
        coordinateCache[address] = { lat, lng };
        return coordinateCache[address];
      } else {
        coordinateCache[address] = null;
        return null;
      }
    } catch (error) {
      console.error("Error al geocodificar:", error);
      coordinateCache[address] = null;
      return null;
    }
  };
  const calculateTimeLeft = (fecha) => {
    const now = moment();
    const diff = moment(fecha).diff(now, "seconds");
    if (diff <= 0) return "Agotado";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h}h ${m}m ${s}s`;
  };
  const handleAsignarRepartidor = (chainId) => {
    setAsignandoCadena(chainId);
    setRepartidorSeleccionado(""); 
  };
  const confirmarAsignacion = () => {
    if (!repartidorSeleccionado) return;

    setOrders((prev) =>
      prev.map((o) => {
        // Si coincide con la cadena
        const sameChain = o.geoHash === asignandoCadena;
        if (sameChain) {
          return {
            ...o,
            repartidor: repartidorSeleccionado,
            estado_entrega: "Asignado",
          };
        }
        return o;
      })
    );
    setAsignandoCadena(null);
  };
  const handlePushToDB = async (chainId) => {
    const pedidosCadena = orders.filter((o) => o.geoHash === chainId);
    if (!pedidosCadena.length) return console.warn("⚠️ Ruta no encontrada para push:", chainId);
    if (pedidosCadena.length > 3) return console.warn(`⚠️ No se puede pushear, +3 pedidos en la cadena: ${chainId}.`);
  
    let repartidorBase = pedidosCadena.find(p => p.repartidor)?.repartidor || "No asignado";
  
    setOrders((prev) =>
      prev.map((p) => p.geoHash === chainId
        ? { ...p, estado_entrega: "Asignado", repartidor: p.repartidor || repartidorBase }
        : p
      )
    );
  
    const now = new Date();
    const idRutaUnico = `${chainId}-${now.toTimeString().slice(0, 8).replace(/:/g, "")}`;
    const geoHash = pedidosCadena[0].geoHash;
    const color = pedidosCadena[0].color;
    const tiempoEstimado = "—";
    const estado = "Sellada";
  
    const costosReales = pedidosCadena.map((p) => {
      try {
        const metodo = JSON.parse(p.metodo_entrega || "{}");
        return metodo.Delivery?.costoReal || 0;
      } catch (err) {
        console.warn("Error al parsear metodo_entrega:", err);
        return 0;
      }
    });
  
    const direcciones = pedidosCadena.map((p) => {
      try {
        const metodo = JSON.parse(p.metodo_entrega || '{}');
        const delivery = metodo?.Delivery || {};
        return {
          address: delivery.address || p.address || "Sin dirección",
          coordinates: {
            lat: delivery.latitud,
            lng: delivery.longitud,
          }
        };
      } catch (e) {
        return {
          address: p.address || "Sin dirección",
          coordinates: null
        };
      }
    });
  
    let tiendaSalida = { nombre: "Desconocida" };
    try {
      const metodo = JSON.parse(pedidosCadena[0].metodo_entrega || "{}");
      tiendaSalida = metodo?.Delivery?.tiendaSalida || tiendaSalida;
    } catch (e) {
      console.warn("⚠️ Error parseando metodo_entrega para tiendaSalida:", e);
    }
  
    // ✅ Calcular distancia real secuencial
    let distanciaTotalReal = 0;
    try {
      const puntosRuta = [
        `${tiendaSalida.lat},${tiendaSalida.lng}`,
        ...direcciones.map((d) => `${d.coordinates.lat},${d.coordinates.lng}`).slice(0, 3)
      ];
  
      const url = `http://localhost:3001/api/google/distancia-ruta?puntos=${encodeURIComponent(JSON.stringify(puntosRuta))}`;
      console.log("🌐 URL enviada al backend:", url);
  
      const res = await axios.get(url);
      const totalKm = res.data?.distancia_m / 1000;
      distanciaTotalReal = parseFloat(totalKm?.toFixed(2)) || 0.01;
      console.log("✅ Distancia total real (Google):", distanciaTotalReal, "km");
    } catch (e) {
      console.warn("❌ Error al calcular distancia real vía API:", e.message);
    }
  
    const payload = {
      id_ruta: idRutaUnico,
      repartidor: repartidorBase,
      id_repartidor: repartidorBase,
      estado,
      geoHash,
      color,
      tiempo_estimado: tiempoEstimado,
      costo_total: JSON.stringify(costosReales),
      distancia_total: distanciaTotalReal,
      numero_paradas: pedidosCadena.length,
      id_pedidos: JSON.stringify(pedidosCadena.map((p) => p.id_order)),
      direcciones: JSON.stringify(direcciones),
      express: 0,
      tienda_salida: JSON.stringify(tiendaSalida),
    };
  
    try {
      // 1. Crear la ruta
      await axios.post(`${process.env.REACT_APP_API_URL}/rutas`, payload);
      console.log(`✅ Ruta ${chainId} creada en la DB.`);
  
      // 2. Asignar ruta y actualizar pedidos
      await axios.patch(`${process.env.REACT_APP_API_URL}/registro_ventas/asignar_ruta`, {
        id_ruta: idRutaUnico,
        id_repartidor: repartidorBase,
        id_orders: pedidosCadena.map(p => p.id_order)
      });
      console.log("✅ Pedidos actualizados con ID de ruta y repartidor.");
  
      setSuccessMessage(`✅ Ruta ${chainId} enviada correctamente a la DB.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setRutasSelladas((prev) => [...prev, chainId]);
    } catch (err) {
      console.error("❌ Error en el proceso de push a DB:", err);
    }
  };
  const determinarEstadoCadena = (c) => {
    if (rutasSelladas.includes(c.id)) return "Sellada";
    const asignados = c.pedidos.filter(p => p.estado_entrega === "Asignado").length;
    const pendientes = c.pedidos.filter(p => p.estado_entrega === "Pendiente").length;
    const total = c.pedidos.length;
  
    if (asignados === total && total > 0) return "Activa";
    if (asignados >= 1 || pendientes >= 1) return "Potencial";
    return "Potencial"; // fallback para evitar cualquier otro estado
  };
  const handleAprobarCadena = (chainId, repartidor) => {
    if (!repartidor) {
      console.warn("❌ No se puede aprobar sin repartidor");
      return;
    }
  
    setOrders((prev) =>
      prev.map((p) =>
        p.geoHash === chainId && p.estado_entrega === "Pendiente"
          ? { ...p, estado_entrega: "Asignado", repartidor }
          : p
      )
    );
  };


  const chainsObj = orders.reduce((acc, order) => {
    if (["Entregado", "En Curso"].includes(order.estado_entrega)) {
      return acc;
    }
    // Usamos geoHash como ID de la cadena
    const chainId = order.geoHash;

    if (!acc[chainId]) {
      acc[chainId] = {
        id: chainId,
        geoHash: chainId,
        color: order.color,
        repartidor: order.repartidor || null,
        pedidos: [],
      };
    }

    acc[chainId].pedidos.push(order);

    // Si la cadena no tiene repartidor, le ponemos el del pedido
    if (!acc[chainId].repartidor && order.repartidor) {
      acc[chainId].repartidor = order.repartidor;
    }

    return acc;
  }, {});
  const allChains = Object.values(chainsObj);
  const filteredOrders = orders.filter((o) => {
    // Quitamos Entregado y En Curso
    if (["Entregado", "En Curso"].includes(o.estado_entrega)) return false;

    // Si no hay selectedChain, lo mostramos
    if (!selectedChain) return true;

    // Si hay selectedChain, mostramos solo si coincide su geoHash
    return o.geoHash === selectedChain;
  });
  const filteredChains = allChains.filter((c) => {
    if (!selectedChain) return true;
    return c.id === selectedChain;
  });
  const EMOJIS_REPARTIDORES = ["😎", "🤓", "🧐", "🤠", "🤖", "😇", "🔥", "🛵"];
  const getRandomEmoji = () =>
    EMOJIS_REPARTIDORES[Math.floor(Math.random() * EMOJIS_REPARTIDORES.length)];


  return (
    <div className="route-setter-layout">
      {successMessage && (
        <div className="success-toast">
          {successMessage}
        </div>
      )}
      <div className="row row1">
        <div className="title-col">
          <h1>🔗 DeliveryChain - Automático</h1>
        </div>
        <div className="input-col">
          <label>🧩 Filtrar por GeoHash:</label>
          <input
            type="text"
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            placeholder="Ej: ezd2v"
          />
        </div>
      </div>
      <div className="row row2">
        <h2>📦 Pedidos Activos</h2>
        <p style={{ fontSize: "0.9em", color: "#666" }}>
          Se muestran todos los pedidos no entregados/en curso.
          Puedes filtrar por GeoHash si deseas enfocarte en una zona.
        </p>

        <table className="orders-table">
          <thead>
            <tr>
              <th>ID Pedido</th>
              <th>Dirección</th>
              <th>Tiempo</th>
              <th>GeoHash</th>
              <th>Zona</th>
              <th>Estado</th>
              <th>Repartidor</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id_order}>
                <td>{o.id_order}</td>
                <td>{o.address}</td>
                <td>{o.timeLeft}</td>
                <td>{o.geoHash}</td>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      backgroundColor: o.color || "gray",
                    }}
                  />
                </td>
                <td>{o.estado_entrega}</td>
                <td>{o.repartidor || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row row3">
        <div className="chains-col">
          <h2>🔗 Cadenas de Entrega (Auto)</h2>
          <p style={{ fontSize: "0.9em", color: "#666" }}>
            Se generan automáticamente por <strong>geoHash</strong>. El operador puede
            asignar un repartidor y luego presionar <strong>Push</strong> para sellarlas.
          </p>

          <table className="orders-table">
            <thead>
              <tr>
                <th>ID Cadena</th>
                <th>GeoHash</th>
                <th>Zona</th>
                <th>Repartidor</th>
                <th>Pedidos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredChains.map((c) => {
                const estadoCad = determinarEstadoCadena(c);
                const sinRepartidor = !c.repartidor;
                return (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.geoHash}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          backgroundColor: c.color || "gray",
                        }}
                      />
                    </td>
                    <td>{c.repartidor || "—"}</td>
                    <td>{c.pedidos.length}</td>
                    <td>{estadoCad}</td>
                    <td>
                    {estadoCad !== "Sellada" ? (
                      <>
                        
                        <button
                          onClick={() => {
                            if (estadoCad === "Potencial") {
                              handleAprobarCadena(c.id, c.repartidor);
                            } else if (estadoCad === "Activa" && !rutasSelladas.includes(c.id)) {
                              handlePushToDB(c.id);
                            }
                          }}
                          disabled={estadoCad === "Potencial" && !c.repartidor}
                        >
                          {estadoCad === "Potencial" ? "✅ Aprobar" : "📤 Push"}
                        </button>
                    
                        <button
                          onClick={() => sinRepartidor && handleAsignarRepartidor(c.id)}
                          disabled={!sinRepartidor}
               
                        >
                          👤 Asignar
                        </button>

                        {/* Selector desplegable al asignar */}
                        {asignandoCadena === c.id && (
                          <div
                            style={{
                              marginTop: "5px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <select
                              value={repartidorSeleccionado}
                              onChange={(e) => setRepartidorSeleccionado(e.target.value)}
                            >
                              <option value="">Seleccionar</option>
                              {repartidoresActivos.map((r) => (
                                <option key={r.id_repartidor} value={r.id_repartidor}>
                                  {r.nombre}
                                </option>
                              ))}
                            </select>
                            <button onClick={confirmarAsignacion}>✔</button>
                          </div>
                        )}
                      </>
                    ) : (
                      "✅ Sellada"
                    )}
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 7.4.2 - Lista de Repartidores Activos */}
        <div className="drivers-col">
          <h3>🛵 Repartidores Activos</h3>
          <ul>
            {repartidoresActivos.map((r) => (
              <li key={r.id_repartidor}>
                ✅ {getRandomEmoji()} {r.nombre} ({r.id_repartidor})
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 7.5 - Espacio extra para logs o generatedRoutes */}
      <div style={{ display: "none" }}>
        {generatedRoutes.map((route, i) => (
          <pre key={i}>{JSON.stringify(route)}</pre>
        ))}
      </div>
    </div>
  );
};


function filterByMinTimeLeft(orders, minSeconds) {
  return orders.filter((o) => {
    const now = moment();
    const diff = moment(o.fechaYHoraPrometida).diff(now, "seconds");
    return diff > minSeconds;
  });
}
function sortChainsByLength(chainsObj) {
  return Object.values(chainsObj).sort(
    (a, b) => b.pedidos.length - a.pedidos.length
  );
}
function compactChainInfo(chain) {
  return chain.pedidos.map((p) => `#${p.id_order}[${p.estado_entrega}]`);
}
function generateChainReport(chain) {
  const items = chain.pedidos.map((p) => {
    return `Pedido: ${p.id_order}, Estado: ${p.estado_entrega}, Repartidor: ${p.repartidor || 'N/A'}`;
  }).join("\n");
  return `Cadena: ${chain.id}\n` +
         `GeoHash: ${chain.geoHash}\n` +
         `Num Pedidos: ${chain.pedidos.length}\n` +
         `Items:\n${items}\n`;
}
function logChainReport(chain) {
  const report = generateChainReport(chain);
  console.log(report);
}
function logAllChains(chainsObj) {
  Object.values(chainsObj).forEach((chain) => {
    logChainReport(chain);
  });
}


export default RouteSetter;


