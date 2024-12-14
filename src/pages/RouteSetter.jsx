import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment-timezone";
import QRCode from "qrcode.react";
import "../styles/RouteSetter.css";

const RouteSetter = () => {
  const [orders, setOrders] = useState([]); 
  const [originalOrders, setOriginalOrders] = useState([]); 
  const [generatedRoutes, setGeneratedRoutes] = useState([]); 
  const [rutasDisponibles, setRutasDisponibles] = useState(false);
  const googleMapsApiKey = "AIzaSyAi1A8DDiBPGA_KQy2G47JVhFnt_QF0fN8";
  const coordinateCache = {}; 

  const fetchOrders = async () => {
    try {
        const response = await axios.get("http://localhost:3001/registro_ventas");
        const registroVentas = response.data.data || [];
        const filteredOrders = registroVentas
            .filter((order) => {
                const metodoEntrega = JSON.parse(order.metodo_entrega || "{}");
                return metodoEntrega.Delivery && order.estado_entrega === "Pendiente";
            })
            .map((order) => {
                const metodoEntrega = JSON.parse(order.metodo_entrega || "{}");
                const tiendaSalida = metodoEntrega.Delivery.tiendaSalida || {};
                const costoDelivery = metodoEntrega.Delivery.costoReal || 0;
                return {
                    id_order: order.id_order,
                    address: metodoEntrega.Delivery.address || "Sin dirección",
                    fechaYHoraPrometida: metodoEntrega.Delivery.fechaYHoraPrometida || null,
                    timeLeft: calculateTimeLeft(metodoEntrega.Delivery.fechaYHoraPrometida),
                    isExpress: metodoEntrega.Delivery.TicketExpress || false,
                    estadoEntrega: order.estado_entrega || "Sin estado",
                    enRuta: order.enRuta || false,
                    repartidorAsignado: order.id_repartidor && order.id_repartidor !== "null"
                  ? `Repartidor ${order.id_repartidor}`
                  : "No asignado",
                    puntoSalida: tiendaSalida.nombre_empresa || "Desconocido",
                    puntoSalidaCoordinates:
                        tiendaSalida.lat && tiendaSalida.lng
                            ? { lat: tiendaSalida.lat, lng: tiendaSalida.lng }
                            : null,
                    costoDelivery: parseFloat(costoDelivery.toFixed(2)), // Incluir costo del delivery y redondear
                };
            });
        setOrders(filteredOrders);
        setOriginalOrders(filteredOrders);
    } catch (error) {
        console.error("Error al sincronizar las órdenes desde registro_ventas:", error);
    }
  };
  const geocodeAddress = async (address) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${googleMapsApiKey}`
      );
      const results = response.data.results;
      if (results.length > 0) {
        const { lat, lng } = results[0].geometry.location;
        return { lat, lng };
      }
      console.warn(`No se encontraron coordenadas para la dirección: ${address}`);
      return null;
    } catch (error) {
      console.error("Error al geocodificar la dirección:", error);
      return null;
    }
  };
  const calculateHaversineDistance = (coord1, coord2) => {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const R = 6371;
    const dLat = toRadians(coord2.lat - coord1.lat);
    const dLng = toRadians(coord2.lng - coord1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(coord1.lat)) *
        Math.cos(toRadians(coord2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const fetchPrecioDelivery = async () => {
    try {
        const response = await axios.get("http://localhost:3001/delivery/price");
        if (response.data.success) {
            console.log("Precio por km obtenido:", response.data.precio);
            return response.data.precio;
        } else {
            console.error("Error al obtener precio por km:", response.data.message);
            return 0;
        }
    } catch (error) {
        console.error("Error en fetchPrecioDelivery:", error);
        return 0;
    }
  };
  const geocodeAddressWithCache = async (address) => {
    if (coordinateCache[address]) {
      console.log(`Coordenadas obtenidas del caché para: ${address}`);
      return coordinateCache[address];
    }
  
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`
      );
      const results = response.data.results;
      if (results.length > 0) {
        const { lat, lng } = results[0].geometry.location;
        const coords = { lat, lng };
        coordinateCache[address] = coords; // Guardar en caché
        console.log(`Coordenadas obtenidas de la API para: ${address}`, coords);
        return coords;
      } else {
        console.warn(`No se encontraron coordenadas para la dirección: ${address}`);
        coordinateCache[address] = null; // Guardar como null para evitar solicitudes futuras
        return null;
      }
    } catch (error) {
      console.error("Error al geocodificar la dirección:", error);
      coordinateCache[address] = null; // Guardar como null para evitar solicitudes futuras
      return null;
    }
  };
  const generateRoute = async () => {
    const precioPorKm = await fetchPrecioDelivery(); // Obtener el precio por km
    console.log("Precio por km:", precioPorKm);

    const pendingOrders = orders.filter(
        (order) => order.estadoEntrega === "Pendiente"
    );

    const groupedByPoint = {};
    pendingOrders.forEach((order) => {
        console.log("Procesando pedido para agrupación:", order);
        const puntoSalida = order.puntoSalida || "Default";
        if (!groupedByPoint[puntoSalida]) groupedByPoint[puntoSalida] = [];
        groupedByPoint[puntoSalida].push(order);
    });

    const rutas = [];
    for (const puntoSalida in groupedByPoint) {
        const pedidos = groupedByPoint[puntoSalida];

        const puntoSalidaCoordinates = pedidos[0]?.puntoSalidaCoordinates;
        if (!puntoSalidaCoordinates) {
            console.warn(`Punto de salida no definido para ${puntoSalida}.`);
            continue;
        }

        pedidos.sort((a, b) => {
            if (a.isExpress !== b.isExpress) return a.isExpress ? -1 : 1;
            return moment(a.fechaYHoraPrometida).diff(moment(b.fechaYHoraPrometida));
        });

        let currentRoute = [];
        let currentRoutes = [];

        for (let i = 0; i < pedidos.length; i++) {
            const pedido = pedidos[i];

            if (currentRoute.length === 0) {
                currentRoute.push(pedido);
            } else {
                const lastOrder = currentRoute[currentRoute.length - 1];
                const distanceToLast = calculateHaversineDistance(
                    lastOrder.puntoSalidaCoordinates,
                    pedido.puntoSalidaCoordinates
                );

                if (distanceToLast <= 3 && currentRoute.length < 3) {
                    currentRoute.push(pedido);
                } else {
                    if (currentRoute.length > 1) currentRoutes.push([...currentRoute]);
                    currentRoute = [pedido];
                }
            }
        }

        if (currentRoute.length > 1) {
            currentRoutes.push([...currentRoute]);
        }

        // Procesar cada ruta generada
        for (const ruta of currentRoutes) {
            const enrichedAddresses = await Promise.all(
                ruta.map(async (pedido) => {
                    const coordinates = await geocodeAddressWithCache(pedido.address);
                    return {
                        address: pedido.address,
                        coordinates,
                    };
                })
            );

            const costoTotalDelivery = ruta.reduce((total, pedido) => {
                return total + (pedido.costoDelivery || 0);
            }, 0);

            const tiemposEstimados = ruta.map((pedido) => {
                const timeLeft = pedido.timeLeft;
                if (timeLeft && timeLeft !== "Tiempo agotado") {
                    const match = timeLeft.match(/(\d+)h\s*(\d+)m\s*(\d+)s?/);
                    if (match) {
                        const [_, hours, minutes, seconds] = match.map(Number);
                        return hours * 3600 + minutes * 60 + seconds; // Convertir a segundos
                    }
                }
                return 0; // Usar 0 si no hay tiempo válido
            });

            const tiempoEstimadoEnSegundos =
                tiemposEstimados.length > 0
                    ? tiemposEstimados.reduce((total, tiempo) => total + tiempo, 0) / tiemposEstimados.length
                    : 0;

            const horas = Math.floor(tiempoEstimadoEnSegundos / 3600);
            const minutos = Math.floor((tiempoEstimadoEnSegundos % 3600) / 60);
            const segundos = Math.round(tiempoEstimadoEnSegundos % 60);

            const tiempoEstimadoFormateado =
                tiempoEstimadoEnSegundos === 0
                    ? "Tiempo Agotado"
                    : `${horas}h ${minutos}m ${segundos}s`;

            console.log("Tiempo estimado calculado:", tiempoEstimadoFormateado);

            const distanciaEnKm = parseFloat((costoTotalDelivery / precioPorKm).toFixed(2));

            const rutaFinal = {
                idRuta: `R${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                pedidos: ruta.map((pedido) => pedido.id_order),
                direcciones: enrichedAddresses,
                costoTotalDelivery: parseFloat(costoTotalDelivery.toFixed(2)),
                express: ruta.some((pedido) => pedido.isExpress),
                numeroDeParadas: ruta.length,
                repartidorAsignado: "No asignado",
                estado: "Pendiente",
                tiempoEstimado: tiempoEstimadoFormateado,
                distanciaEnKm: distanciaEnKm,
                tiendaSalida: {
                    nombre_empresa: puntoSalida,
                    coordenadas: puntoSalidaCoordinates,
                },
            };

            rutas.push(rutaFinal);
        }
    }

    console.log("Rutas generadas:", rutas);
    return rutas;
  };
  const formalizeRoute = (route) => {
    setGeneratedRoutes((prevRoutes) =>
      prevRoutes.map((r) =>
        r.idRuta === route.idRuta ? { ...r, estado: "Asignado" } : r
      )
    );
  };
  const handleGenerateRoute = async () => {
    console.log("Iniciando generación de rutas...");

    const rutas = await generateRoute();
    console.log("Rutas generadas:", rutas);

    if (!Array.isArray(rutas) || rutas.length === 0) {
        console.warn("No se generaron rutas válidas.");
        return;
    }

    const nuevasRutas = rutas.map((ruta) => ({
        ...ruta,
        idRuta: ruta.idRuta,
    }));

    console.log("Nuevas rutas procesadas:", nuevasRutas);

    setGeneratedRoutes((prevRoutes) => {
        const updatedRoutes = [...prevRoutes, ...nuevasRutas];
        console.log("Estado actualizado de generatedRoutes:", updatedRoutes);
        return updatedRoutes;
    });

    const pedidosUsados = nuevasRutas.flatMap((ruta) =>
        ruta.pedidos.map((pedido) => ({ pedidoId: pedido, idRuta: ruta.idRuta }))
    );

    setOrders((prevOrders) => {
        const updatedOrders = prevOrders.map((order) => {
            const rutaAsignada = pedidosUsados.find((p) => p.pedidoId === order.id_order);
            return rutaAsignada
                ? { ...order, enRuta: rutaAsignada.idRuta }
                : order;
        });
        console.log("Estado actualizado de orders:", updatedOrders);
        return updatedOrders;
    });

    try {
        const payload = pedidosUsados.map((p) => ({
            id_order: p.pedidoId,
            enRuta: p.idRuta,
        }));

        await axios.patch("http://localhost:3001/registro_ventas", { orders: payload });
        console.log("Actualización exitosa en la base de datos.");
    } catch (error) {
        console.error("Error al actualizar el estado enRuta en la base de datos:", error);
    }

    // NUEVA SECCIÓN: Enviar las rutas a la base de datos
    try {
        for (const ruta of nuevasRutas) {
            const rutaPayload = {
                id_ruta: ruta.idRuta,
                costo_total: ruta.costoTotalDelivery,
                distancia_total: ruta.distanciaEnKm,
                tiempo_estimado: ruta.tiempoEstimado,
                numero_paradas: ruta.numeroDeParadas,
                id_pedidos: JSON.stringify(ruta.pedidos),
                direcciones: JSON.stringify(ruta.direcciones),
                express: ruta.express,
                tienda_salida: JSON.stringify(ruta.tiendaSalida),
                estado: ruta.estado,
            };

            await axios.post("http://localhost:3001/rutas", rutaPayload);
            console.log(`Ruta ${ruta.idRuta} almacenada en la base de datos.`);
        }
    } catch (error) {
        console.error("Error al almacenar rutas en la base de datos:", error);
    }
  };
  const calculateTimeLeft = (fechaYHoraPrometida) => {
    if (!fechaYHoraPrometida) {
      console.error("Fecha y hora prometida no definida");
      return "Fecha inválida";
    }

    const deliveryTime = moment(fechaYHoraPrometida, "YYYY-MM-DD HH:mm", true); // Validación estricta
    if (!deliveryTime.isValid()) {
      console.error("Formato de fecha inválido:", fechaYHoraPrometida);
      return "Formato de fecha inválido";
    }

    const now = moment();
    const diff = deliveryTime.diff(now, "seconds");

    if (diff <= 0) return "Tiempo agotado";

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
  };
  const undoRoute = async (idRuta) => {
    const routeToUndo = generatedRoutes.find((route) => route.idRuta === idRuta);
  
    if (!routeToUndo) return;
  
    const pedidosRestaurados = routeToUndo.pedidos;
  
    // Actualizar estado local
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        pedidosRestaurados.includes(order.id_order)
          ? { ...order, enRuta: null } // Eliminar el ID Reparto
          : order
      )
    );
  
    setGeneratedRoutes((prevRoutes) =>
      prevRoutes.filter((route) => route.idRuta !== idRuta)
    );
  
    // Actualizar estado en la base de datos
    try {
      await axios.patch("http://localhost:3001/registro_ventas", {
        orders: pedidosRestaurados.map((id) => ({ id_order: id, enRuta: null })),
      });
      // console.log("Estado enRuta actualizado en la base de datos.");
    } catch (error) {
      console.error("Error al actualizar estado enRuta en la base de datos:", error);
    }
  };
  
  useEffect(() => {
    fetchOrders();
  }, []);
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get("http://localhost:3001/registro_ventas");
        const registroVentas = response.data.data || [];
    
        // Filtrar solo las órdenes de Delivery pendientes
        const filteredOrders = registroVentas
          .filter((order) => {
            const metodoEntrega = JSON.parse(order.metodo_entrega || "{}");
            return metodoEntrega.Delivery && order.estado_entrega === "Pendiente";
          })
          .map((order) => {
            const metodoEntrega = JSON.parse(order.metodo_entrega);
    
            return {
              id_order: order.id_order,
              address: metodoEntrega.Delivery.address || "Sin dirección",
              fechaYHoraPrometida: metodoEntrega.Delivery.fechaYHoraPrometida,
              timeLeft: calculateTimeLeft(metodoEntrega.Delivery.fechaYHoraPrometida),
              isExpress: metodoEntrega.Delivery.TicketExpress || false,
              estadoEntrega: order.estado_entrega,
              enRuta: order.enRuta || false,
              repartidorAsignado: order.id_repartidor && order.id_repartidor !== "null"
            ? `Repartidor ${order.id_repartidor}`
            : "No asignado",
            };
          });
    
        setOrders(filteredOrders); // Actualizar `orders`
        setOriginalOrders(filteredOrders); // Mantener referencia estática
        // console.log("Órdenes sincronizadas:", filteredOrders);
      } catch (error) {
        console.error("Error al sincronizar las órdenes desde registro_ventas:", error);
      }
    };

    fetchOrders();
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prevOrders) =>
        prevOrders.map((order) => ({
          ...order,
          timeLeft: calculateTimeLeft(order.fechaYHoraPrometida),
        }))
      );
    }, 1000);
  
    return () => clearInterval(interval); 
  }, []);
  useEffect(() => {
    fetchOrders(); 

    const interval = setInterval(() => {
      setOrders((prevOrders) =>
        originalOrders.map((order) => ({
          ...order,
          timeLeft: calculateTimeLeft(order.fechaYHoraPrometida), 
        }))
      );
    }, 1000); 

    return () => clearInterval(interval); // Limpiar el intervalo al desmontar
  }, [originalOrders]); 


return (
  <div className="route-setter-layout">
    <h1>Route Setter</h1>
    <div className="columns-container">
      {/* Columna Izquierda */}
      <div className="left-column">
        <div className="table-section">
        <table>
  <thead>
    <tr>
      <th>ID</th>
      <th>Dirección</th>
      <th>Tiempo Restante</th>
      <th>Express</th>
      <th>En Ruta</th>
      <th>Estado</th>
      <th>Repartidor Asignado</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody>
    {orders.map((order) => (
      <tr key={order.id_order} className={order.isExpress ? "express-row" : ""}>
        <td>{order.id_order}</td>
        <td>{order.address}</td>
        <td>{order.timeLeft}</td>
        <td>{order.isExpress ? "⭐" : "No"}</td>
        <td>{order.enRuta ? order.enRuta : "No"}</td> {/* Mostrar el ID Reparto si existe */}
        <td>{order.estadoEntrega}</td>
        <td>{order.repartidorAsignado}</td>
        <td>
          {order.estadoEntrega === "Pendiente" && !order.enRuta && (
            <button onClick={() => console.log("Asignar pedido", order.id_order)}>Asignar</button>
          )}
        </td>
      </tr>
    ))}
  </tbody>
</table>

        </div>
      </div>

      {/* Columna Derecha */}
      <div className="right-column">
        <div className="widget">
          <h3>Crear Ruta</h3>
          {rutasDisponibles && <p className="notification">¡Nueva ruta encontrada!</p>}
          <button onClick={handleGenerateRoute}>Generar Nueva Ruta</button>
        </div>

        {/* Tabla de Rutas Activas */}
        {generatedRoutes.length > 0 && (
          <div className="routes-container">
            <h3>Rutas Activas</h3>
            <table>
            <thead>
              <tr>
                <th>ID Ruta</th>
                <th>Pedidos</th>
                <th>QR Direcciones</th>
                <th>Express</th>
                <th>Paradas</th>
                <th>Repartidor Asignado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
            {generatedRoutes.map((route, index) => (
            <tr key={index}>
              <td>{route.idRuta}</td>
              <td>
                {Array.isArray(route.pedidos) ? route.pedidos.join(", ") : route.pedidos || "N/A"}
              </td>
              <td>
                {route.direcciones ? (
                  <QRCode value={Array.isArray(route.direcciones) ? route.direcciones.join(", ") : route.direcciones} size={64} />
                ) : (
                  "N/A"
                )}
              </td>
              <td>{route.express ? "Sí" : "No"}</td>
              <td>{route.numeroDeParadas}</td>
              <td>{route.repartidorAsignado || "Pendiente"}</td>
              <td>
                {route.estado === "Pendiente" ? (
                  <button onClick={() => formalizeRoute(route)}>Crear Ruta</button>
                ) : (
                  <button onClick={() => undoRoute(route.idRuta)}>Deshacer</button>
                )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

                </div>
              )}

        {/* Widget para Repartidores Activos */}
        <div className="widget">
          <h3>Repartidores Activos</h3>
          <p>Lista de repartidores aquí</p>
        </div>
      </div>
    </div>
  </div>
);

  
};

export default RouteSetter;
