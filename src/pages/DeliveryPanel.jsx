import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { Bar } from 'react-chartjs-2';
import QRCode from 'qrcode.react';
import '../styles/DeliveryPanel.css'; 

const DeliveryPanel = () => {
    const [loggedIn, setLoggedIn] = useState(() => {
        const storedLoggedIn = localStorage.getItem('loggedIn');
        return storedLoggedIn ? JSON.parse(storedLoggedIn) : false;
    });
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [repartidor, setRepartidor] = useState(() => {
        const storedRepartidor = localStorage.getItem('repartidor');
        return storedRepartidor ? JSON.parse(storedRepartidor) : null;
    });
    const [pedidos, setPedidos] = useState([]);
    const [pedidosCompletados, setPedidosCompletados] = useState([]);
    const [showWallet, setShowWallet] = useState(false);
    const [montoPorCobrar, setMontoPorCobrar] = useState(0);
    const [montoPagado, setMontoPagado] = useState(0);
    const [wallet, setWallet] = useState([]);
    const [estadoBoton, setEstadoBoton] = useState("Consolidar");
    const [graficaData, setGraficaData] = useState([]);
    const [filtro, setFiltro] = useState('diario'); 
    const [rutas, setRutas] = useState([]);
    const [precioDelivery, setPrecioDelivery] = useState(0);
    const [estadosRuta, setEstadosRuta] = useState({});
  

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


    useEffect(() => {
        const interval = setInterval(() => {
            // console.log("Pedidos antes de actualizar:", pedidos);
    
            setPedidos(prevPedidos => {
                const actualizados = prevPedidos.map(pedido => {
                    const deliveryInfo = JSON.parse(pedido.metodo_entrega || "{}")?.Delivery;
    
                    if (!deliveryInfo || !deliveryInfo.fechaYHoraPrometida) {
                        console.error("Fecha y hora prometida no definida para el pedido:", pedido.id_order);
                    }                    
    
                    const tiempoRestante = calculateTimeLeft(deliveryInfo.fechaYHoraPrometida);
                    // console.log(`Tiempo restante para pedido ${pedido.id_order}:`, tiempoRestante);
    
                    return {
                        ...pedido,
                        tiempoRestante,
                    };
                });
    
                // console.log("Pedidos después de actualizar:", actualizados);
                return actualizados;
            });
        }, 1000);
    
        return () => clearInterval(interval); // Limpiar el intervalo al desmontar
    }, [pedidos]);    
    useEffect(() => {
        if (showWallet) {
            fetchWallet(filtro); // Cargar wallet con el filtro predeterminado
        }
    }, [showWallet]);
    useEffect(() => {
        if (loggedIn) {
            fetchPedidos();
            fetchWallet();
            fetchMontoWallet();
            fetchPrecioDelivery();
            fetchRutas();
        }
    }, [loggedIn, repartidor]);
    useEffect(() => {
        if (loggedIn) {
            fetchGraficaData();
        }
    }, [loggedIn]);


    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/repartidores/login', { username, password });
            if (response.data.success) {
                setRepartidor(response.data.repartidor);
                setLoggedIn(true);
                localStorage.setItem('loggedIn', JSON.stringify(true));
                localStorage.setItem('repartidor', JSON.stringify(response.data.repartidor));
            } else {
                alert('Credenciales incorrectas');
            }
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            alert('Error al iniciar sesión');
        }
    };
    if (!loggedIn) {
        return (
            <div>
                <h1>Inicio de Sesión Repartidor</h1>
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit">Iniciar Sesión</button>
                </form>
            </div>
        );
    }

    const handleLogout = () => {
        setLoggedIn(false);
        setRepartidor(null);
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('repartidor');
    };
    const fetchPedidos = async () => {
        try {
          const response = await axios.get("http://localhost:3001/registro_ventas");
          console.log("Respuesta completa de registro_ventas:", response.data);
    
          // Filtrar pedidos pendientes
          const pedidosPendientes = response.data.data.filter(
            (pedido) =>
              (pedido.estado_entrega === "Pendiente" ||
                pedido.estado_entrega === "Asignado") &&
              JSON.parse(pedido.metodo_entrega || "{}").Delivery &&
              !pedido.enRuta
          );
          console.log("Pedidos pendientes filtrados:", pedidosPendientes);
          setPedidos(pedidosPendientes);
    
          // Filtrar rutas activas
          const rutasActivas = response.data.data.filter((pedido) => pedido.enRuta);
          console.log("Rutas activas filtradas:", rutasActivas);
    
          // Reconstruir las rutas completas
          const rutasAgrupadas = rutasActivas.reduce((acc, pedido) => {
            const rutaId = pedido.enRuta;
    
            if (!acc[rutaId]) {
              const deliveryInfo = JSON.parse(pedido.metodo_entrega || "{}").Delivery;
    
              acc[rutaId] = {
                idRuta: rutaId,
                pedidos: [],
                direcciones: [],
                estado: pedido.estado_entrega || "Pendiente",
                express: false, // Puedes calcular o traer esto si es necesario
                numeroDeParadas: 0,
                repartidorAsignado: pedido.id_repartidor
                  ? `Repartidor ${pedido.id_repartidor}`
                  : "No asignado",
                tiendaSalida: deliveryInfo?.tiendaSalida || {
                  nombre_empresa: "Desconocido",
                  direccion: "No definida",
                },
                totalDistancia: 0,
              };
            }
    
            // Agregar información de los pedidos a la ruta
            acc[rutaId].pedidos.push(pedido.id_order);
    
            // Agregar direcciones
            const deliveryInfo = JSON.parse(pedido.metodo_entrega || "{}").Delivery;
            if (deliveryInfo?.address) {
              acc[rutaId].direcciones.push(deliveryInfo.address);
            }
    
            // Calcular distancia total
            if (deliveryInfo?.costoReal) {
              acc[rutaId].totalDistancia += deliveryInfo.costoReal;
            } else {
              console.warn(
                `Información incompleta para calcular la distancia del pedido ${pedido.id_order}`
              );
            }
    
            acc[rutaId].numeroDeParadas += 1;
            return acc;
          }, {});
    
          console.log(
            "Rutas agrupadas reconstruidas antes de establecer estado:",
            Object.values(rutasAgrupadas)
          );
    
          setRutas(Object.values(rutasAgrupadas));
        } catch (error) {
          console.error("Error al cargar pedidos:", error);
        }
    };
    const fetchWallet = async (filtroSeleccionado = 'diario') => {
        if (!repartidor) return;
    
        try {
            const response = await axios.get(`http://localhost:3001/wallet/${repartidor.id_repartidor}?filtro=${filtroSeleccionado}`);
            if (response.data.success) {
                const walletData = response.data.data;
    
                // Actualizar el estado de la wallet
                setWallet(walletData);
    
                // Calcular el monto pagado basado en el filtro seleccionado
                const totalMontoPagado = walletData
                    .filter((entry) => entry.estado === "Pagado")
                    .reduce((acc, entry) => acc + entry.monto_pagado, 0);
    
                setMontoPagado(totalMontoPagado); // Actualizar el monto pagado según el filtro
    
                // console.log('Información de la wallet obtenida:', response.data.data);
            } else {
                console.error('Error al cargar la wallet');
            }
        } catch (error) {
            console.error('Error al obtener la información de la wallet:', error);
        }
    };
    const handleTakePedido = async (pedidoId) => {
        try {
            // Verificar si el pedido sigue disponible
            const checkResponse = await axios.get(`http://localhost:3001/registro_ventas/disponibilidad/${pedidoId}`);
            if (checkResponse.data.data.estado_entrega !== 'Pendiente' || checkResponse.data.data.enRuta) {
                alert('El pedido ya fue tomado por otro repartidor o está en una ruta');
                fetchPedidos(); // Actualizar la lista de pedidos
                return;
            }

            // Tomar el pedido si está disponible
            const response = await axios.patch(`http://localhost:3001/registro_ventas/tomar_pedido/${pedidoId}`, {
                estado_entrega: 'Asignado',
                id_repartidor: repartidor.id_repartidor
            });

            if (response.data.success) {
                setPedidos(prevPedidos => prevPedidos.map(pedido => 
                    pedido.id_order === pedidoId ? { ...pedido, estado_entrega: 'Asignado', id_repartidor: repartidor.id_repartidor } : pedido
                ));
                alert('Pedido tomado con éxito');
            } else {
                alert('El pedido ya fue tomado por otro repartidor');
            }
        } catch (error) {
            console.error('Error al tomar el pedido:', error);
            alert('Error al tomar el pedido');
        }
    };
    const handleCompletePedido = async (pedidoId) => {
        try {
            const pedido = pedidos.find(p => p.id_order === pedidoId);
            const deliveryInfo = JSON.parse(pedido.metodo_entrega).Delivery;
            const costoDelivery = deliveryInfo.costoReal;

            await axios.patch(`http://localhost:3001/registro_ventas/finalizar_pedido/${pedidoId}`, {
                estado_entrega: 'Entregado'
            });

            await axios.post('http://localhost:3001/wallet/guardar_precio_delivery', {
                id_order: pedidoId,
                id_repartidor: repartidor.id_repartidor,
                monto_por_cobrar: costoDelivery
            });

            setPedidos(prevPedidos => prevPedidos.filter(pedido => pedido.id_order !== pedidoId));
            setMontoPorCobrar(prevMonto => prevMonto + costoDelivery);
            fetchPedidos();
            alert('Pedido entregado con éxito');
        } catch (error) {
            console.error('Error al finalizar el pedido:', error);
            alert('Error al finalizar el pedido');
        }
    };
    const toggleWallet = () => {
        setShowWallet(!showWallet);
    };
    const handleConsolidar = async () => {
        try {
            const totalPorCobrar = wallet
                .filter((entry) => entry.estado === 'Por Cobrar')
                .reduce((acc, entry) => acc + entry.monto_por_cobrar, 0);
    
            if (totalPorCobrar > 0) {
                await axios.patch(`http://localhost:3001/wallet/consolidar/${repartidor.id_repartidor}`);
                await fetchMontoWallet();  
                await fetchWallet();       
                await fetchPedidos();      
    
                // console.log('Consolidación completada exitosamente');
            } else {
                console.warn('No hay montos por cobrar para consolidar.');
            }
        } catch (error) {
            console.error('Error al consolidar la wallet:', error);
        }
    };
    const handlePagoConfirmado = async () => {
        try {
            const response = await axios.patch(`http://localhost:3001/wallet/pago/${repartidor.id_repartidor}`);
            
            if (response.data.success) {
                await fetchMontoWallet(); 
                await fetchWallet();
            } else {
                console.error('Error al confirmar el pago:', response.data.message);
            }
        } catch (error) {
            console.error('Error al confirmar el pago:', error);
        }
    }; 
    const fetchMontoWallet = async () => {
        if (!repartidor) return;
    
        try {
            // Llamar al endpoint que trae toda la información de la wallet del repartidor
            const response = await axios.get(`http://localhost:3001/wallet/${repartidor.id_repartidor}`);
            if (response.data.success) {
                const walletData = response.data.data;
    
                // Calcular el monto por cobrar y el monto pagado según el estado de los pedidos
                let totalMontoPorCobrar = 0;
                let totalMontoPagado = 0;
    
                walletData.forEach((wallet) => {
                    if (wallet.estado === 'Consolidado') {
                        totalMontoPorCobrar += wallet.monto_por_cobrar;
                    } else if (wallet.estado === 'Pagado') {
                        totalMontoPagado += wallet.monto_pagado;
                    }
                });
    
                // Actualizar el estado con los valores calculados
                setMontoPorCobrar(totalMontoPorCobrar);
                setMontoPagado(totalMontoPagado);
            } else {
                console.error('Error al obtener los montos de la wallet:', response.data.message);
            }
        } catch (error) {
            console.error('Error al obtener los montos de la wallet:', error);
        }
    };
    const handleFiltroChange = (nuevoFiltro) => {
        setFiltro(nuevoFiltro);
        fetchWallet(nuevoFiltro); // Actualizar la wallet con el nuevo filtro
    };
    const fetchGraficaData = async () => {
        if (!repartidor) return;
    
        try {
            const response = await axios.get(`http://localhost:3001/wallet/${repartidor.id_repartidor}`);
            if (response.data.success) {
                const walletData = response.data.data;
    
                // Crear un mapa para agrupar los pedidos por día
                const groupedData = {};
                walletData.forEach(entry => {
                    const fecha = moment(entry.fecha_consolidacion).format("YYYY-MM-DD");
                    groupedData[fecha] = (groupedData[fecha] || 0) + 1;
                });
    
                // Generar los últimos 7 días como etiquetas
                const last7Days = Array.from({ length: 7 }, (_, i) =>
                    moment().subtract(6 - i, "days").format("YYYY-MM-DD")
                );
    
                // Asegurarse de que cada día tenga un valor (incluso si es 0)
                const labels = last7Days.map(day => day);
                const data = last7Days.map(day => groupedData[day] || 0);
    
                // Actualizar el estado del gráfico
                setGraficaData({ labels, data });
            } else {
                console.error("Error al cargar los datos de la wallet");
            }
        } catch (error) {
            console.error("Error al obtener la información de la wallet:", error);
        }
    };
    const handleTakeRuta = async (ruta) => {
        try {
            // Validar si todos los pedidos de la ruta están disponibles
            const pedidosNoDisponibles = [];
            for (let pedidoId of ruta.pedidos) {
                const checkResponse = await axios.get(`http://localhost:3001/registro_ventas/disponibilidad/${pedidoId}`);
                const { estado_entrega, enRuta } = checkResponse.data.data;
    
                if (estado_entrega !== 'Pendiente' || enRuta) {
                    pedidosNoDisponibles.push(pedidoId);
                }
            }
    
            // Si hay pedidos no disponibles, mostrar un mensaje de error y detener el proceso
            if (pedidosNoDisponibles.length > 0) {
                alert(`No se puede tomar la ruta. Los siguientes pedidos ya están asignados o en otra ruta: ${pedidosNoDisponibles.join(', ')}`);
                fetchPedidos(); // Actualizar la lista de pedidos en caso de cambios
                return;
            }
    
            // Tomar todos los pedidos de la ruta si están disponibles
            for (let pedidoId of ruta.pedidos) {
                await axios.patch(`http://localhost:3001/registro_ventas/tomar_pedido/${pedidoId}`, {
                    estado_entrega: 'Asignado',
                    id_repartidor: repartidor.id_repartidor,
                    enRuta: ruta.idRuta
                });
            }

            fetchPedidos();
            alert('Ruta tomada con éxito y actualizada en las órdenes pendientes.');
        } catch (error) {
            console.error('Error al tomar la ruta:', error);
            alert('Error al tomar la ruta. Verifica el servidor y los datos.');
        }
    };     
    const handleCompleteRuta = async (ruta) => {
        try {
            for (let pedidoId of ruta.pedidos) {
                const pedido = pedidos.find(p => p.id_order === pedidoId);
                const deliveryInfo = JSON.parse(pedido.metodo_entrega).Delivery;
                const costoDelivery = deliveryInfo.costoReal;

                await axios.patch(`http://localhost:3001/registro_ventas/finalizar_pedido/${pedidoId}`, {
                    estado_entrega: 'Entregado'
                });

                await axios.post('http://localhost:3001/wallet/guardar_precio_delivery', {
                    id_order: pedidoId,
                    id_repartidor: repartidor.id_repartidor,
                    monto_por_cobrar: costoDelivery
                });
            }
            fetchPedidos();
            alert('Ruta completada con éxito');
        } catch (error) {
            console.error('Error al finalizar la ruta:', error);
            alert('Error al finalizar la ruta');
        }
    };
    const fetchPrecioDelivery = async () => {
        try {
            const response = await axios.get('http://localhost:3001/delivery/price');
            // console.log('Respuesta del backend para precio del delivery:', response.data); // Agrega este log para verificar la respuesta
            if (response.data.success) {
                setPrecioDelivery(response.data.precio); // Cambia data.data a data
            } else {
                console.error('Error al cargar el precio de delivery:', response.data.message);
            }
        } catch (error) {
            console.error('Error al obtener el precio de delivery:', error);
        }
    };
    const generateRouteLink = (ruta) => {
        if (!ruta || !ruta.tiendaSalida || !ruta.tiendaSalida.coordenadas || !ruta.direcciones) {
            console.warn("Datos incompletos para generar la ruta:", ruta);
            return "#"; // Enlace vacío si faltan datos
        }
    
        const tiendaSalidaCoords = ruta.tiendaSalida.coordenadas;
        console.log(`Punto de salida (coordenadas): lat: ${tiendaSalidaCoords.lat}, lng: ${tiendaSalidaCoords.lng}`);
    
        const paradasCoords = ruta.direcciones
            .map((direccionObj, index) => {
                const { coordenadas } = direccionObj;
                if (!coordenadas || !coordenadas.lat || !coordenadas.lng) {
                    console.warn(`Coordenadas de la parada ${index + 1} no disponibles:`, direccionObj);
                    return null;
                }
                console.log(`Parada ${index + 1} (coordenadas): lat: ${coordenadas.lat}, lng: ${coordenadas.lng}`);
                return `${coordenadas.lat},${coordenadas.lng}`;
            })
            .filter(Boolean); // Filtrar valores nulos
    
        if (paradasCoords.length === 0) {
            console.warn("No se encontraron paradas válidas para la ruta:", ruta.idRuta);
            return "#"; // Enlace vacío si no hay paradas
        }
    
        const baseUrl = "https://www.google.com/maps/dir/";
        const tiendaCoords = `${tiendaSalidaCoords.lat},${tiendaSalidaCoords.lng}`;
        return `${baseUrl}${tiendaCoords}/${paradasCoords.join("/")}`;
    };
    
    
    
    
    const fetchRutas = async () => {
        try {
            const response = await axios.get("http://localhost:3001/rutas");
            if (response.data.success) {
                const rutas = response.data.data.map((ruta) => ({
                    ...ruta,
                    tiendaSalida: JSON.parse(ruta.tienda_salida), // Deserializar tiendaSalida
                    id_pedidos: JSON.parse(ruta.id_pedidos), // Deserializar pedidos
                    direcciones: JSON.parse(ruta.direcciones), // Deserializar direcciones
                }));
                console.log("Rutas obtenidas:", rutas);
                setRutas(rutas); // Actualizar el estado de rutas en el Delivery Panel
            } else {
                console.error("Error al obtener rutas:", response.data.message);
            }
        } catch (error) {
            console.error("Error al cargar rutas:", error);
        }
    };
    const geocodeAddress = async (address) => {
        try {
            const apiKey = "";
            const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
                params: {
                    address,
                    key: apiKey,
                },
            });
    
            if (response.data.status === "OK") {
                const location = response.data.results[0].geometry.location;
                return {
                    lat: location.lat,
                    lng: location.lng,
                };
            } else {
                console.error(`Error al geocodificar la dirección: ${address}`, response.data);
                return null;
            }
        } catch (error) {
            console.error("Error en la función geocodeAddress:", error);
            return null;
        }
    };
    
    

    
    return (
        <div>
          <h2>Bienvenido, {repartidor.nombre}</h2>
          <div className="buttons-container">
            <button onClick={handleLogout}>Cerrar Sesión</button>
            <button onClick={toggleWallet}>
              {showWallet ? 'Ocultar Wallet' : 'Ver Wallet'}
            </button>
            <div className="precio-delivery-info">
              <h3>Delivery: {precioDelivery ? `${precioDelivery.toFixed(2)} € / km` : 'Cargando...'}</h3>
            </div>
          </div>
      
          {/* Wallet Modal */}
          {showWallet && (
            <div className="wallet-modal">
        {showWallet && (
            <div className="wallet-modal">
              <div className="wallet-columns">
                {/* Columna 1: Pedidos Completados */}
                <div className="wallet-column">
                  <h3>Pedidos Completados</h3>
                  <select value={filtro} onChange={(e) => handleFiltroChange(e.target.value)}>
                    <option value="diario">Diario</option>
                    <option value="mensual">Mensual</option>
                    <option value="historico">Histórico</option>
                  </select>
                  <div className="pedidos-completados-scroll">
                    <table style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>ID Pedido</th>
                          <th>Fecha</th>
                          <th>Monto (Delivery)</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wallet
                          .sort((a, b) => new Date(b.fecha_consolidacion) - new Date(a.fecha_consolidacion))
                          .map((walletItem) => (
                            <tr key={walletItem.id_order}>
                              <td>{walletItem.id_order}</td>
                              <td>{moment(walletItem.fecha_consolidacion).format("YYYY-MM-DD HH:mm")}</td>
                              <td>
                                {walletItem.estado === "Pagado"
                                  ? walletItem.monto_pagado?.toFixed(2)
                                  : walletItem.monto_por_cobrar?.toFixed(2)}{' '}
                                €
                              </td>
                              <td>{walletItem.estado}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
      
                {/* Columna 2: Gráfico de Pedidos */}
                <div className="wallet-column">
                  <div className="chart-container">
                    <Bar
                      data={{
                        labels: graficaData.labels,
                        datasets: [
                          {
                            label: "Pedidos Diarios",
                            data: graficaData.data,
                            backgroundColor: "rgba(75, 192, 192, 0.6)",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            ticks: { autoSkip: false },
                          },
                        },
                      }}
                    />
                  </div>
                  <button
                    className="wallet-column2-button"
                    onClick={async () => {
                      if (estadoBoton === "Consolidar") {
                        await handleConsolidar();
                        setEstadoBoton("Confirmar Pago");
                      } else if (estadoBoton === "Confirmar Pago") {
                        await handlePagoConfirmado();
                        setEstadoBoton("Pagado");
                      }
                    }}
                    disabled={estadoBoton === "Pagado"}
                  >
                    {estadoBoton}
                  </button>
                </div>
      
                {/* Columna 3: Resumen Financiero */}
                <div className="wallet-column">
                  <div className="financial-container">
                    <div className="financial-item">
                      <h3>Por Cobrar</h3>
                      <p>{montoPorCobrar.toFixed(2)} €</p>
                    </div>
                    <div className="financial-item">
                      <h3>Pagado</h3>
                      <p>{montoPagado.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
      
            </div>
          )}
      
          {/* Tabla de Pedidos Pendientes */}
          <h3>Pedidos Pendientes</h3>

          <table>
            <thead>
                <tr>
                <th>#</th>
                <th>Tipo</th>
                <th>ID Pedido</th>
                <th>Dirección</th>
                <th>Tiempo Restante</th>
                <th>Costo Delivery</th>
                <th>Distancia (km)</th>
                <th>Tienda de Salida</th>
                <th>Estado</th>
                <th>Repartidor Asignado</th>
                <th>Ver Ruta</th>
                <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {/* Pedidos Individuales */}
                {pedidos.map((pedido, index) => {
                const deliveryInfo = JSON.parse(pedido.metodo_entrega || "{}")?.Delivery;
                console.log(`Procesando pedido ${pedido.id_order}:`, deliveryInfo);
                const costoDelivery = deliveryInfo?.costoReal
                    ? deliveryInfo.costoReal.toFixed(2)
                    : "N/A";

                const distancia = deliveryInfo?.costoReal
                    ? (deliveryInfo.costoReal / precioDelivery).toFixed(2)
                    : "N/A";

                const repartidorAsignado =
                    pedido.id_repartidor === repartidor?.id_repartidor
                    ? "Tú"
                    : `Repartidor ${pedido.id_repartidor}`;

                    const routeLink = generateRouteLink({
                        tiendaSalida: deliveryInfo?.tiendaSalida,
                        pedidos: [pedido.id_order],
                    });

                return (
                    <tr key={pedido.id_order}>
                    <td>{index + 1}</td>
                    <td>Single</td>
                    <td>{pedido.id_order}</td>
                    <td>{deliveryInfo?.address || "N/A"}</td>
                    <td>{pedido.tiempoRestante || "Calculando..."}</td>
                    <td>{costoDelivery} €</td>
                    <td>{distancia} km</td>
                    <td>
                        {deliveryInfo?.tiendaSalida?.nombre_empresa
                        ? `${deliveryInfo.tiendaSalida.nombre_empresa} - ${deliveryInfo.tiendaSalida.direccion}`
                        : "N/A"}
                    </td>
                    <td>{pedido.estado_entrega}</td>
                    <td>
                        {pedido.estado_entrega === "Asignado"
                        ? repartidorAsignado
                        : "No asignado"}
                    </td>
                    <td>
                        <a href={routeLink} target="_blank" rel="noopener noreferrer">
                        Ver Ruta
                        </a>
                    </td>
                    <td>
                        {pedido.estado_entrega === "Pendiente" && (
                        <button onClick={() => handleTakePedido(pedido.id_order)}>
                            Tomar Pedido
                        </button>
                        )}
                        {pedido.estado_entrega === "Asignado" && (
                        <button onClick={() => handleCompletePedido(pedido.id_order)}>
                            Confirmar Entrega
                        </button>
                        )}
                    </td>
                    </tr>
                );
                })}

                {/* Rutas */}
                {rutas.map((ruta, index) => {
    const routeLink = generateRouteLink(ruta);
    const coordenadasTienda = ruta.tiendaSalida?.coordenadas;
    const tiendaLat = coordenadasTienda?.lat || "Coordenadas no disponibles";
    const tiendaLng = coordenadasTienda?.lng || "Coordenadas no disponibles";
    
    return (
        <tr key={ruta.idRuta}>
            <td>{index + 1}</td>
            <td>Route</td>
            <td>{Array.isArray(ruta.id_pedidos) ? ruta.id_pedidos.join(", ") : "Sin pedidos"}</td>
            <td>
                {Array.isArray(ruta.direcciones) ? (
                    ruta.direcciones.map((direccion, idx) => <div key={idx}>{direccion}</div>)
                ) : (
                    "Sin direcciones"
                )}
            </td>
            <td>{ruta.tiempo_estimado || "Calculando..."}</td>
            <td>{(ruta.costo_total || 0).toFixed(2)} €</td>
            <td>{(ruta.distancia_total || 0).toFixed(2)} km</td>
            <td>
                {ruta.tiendaSalida?.nombre_empresa
                    ? `${ruta.tiendaSalida.nombre_empresa} (${tiendaLat}, ${tiendaLng})`
                    : "Desconocido"}
            </td>
            <td>{ruta.estado}</td>
            <td>{ruta.repartidorAsignado || "No asignado"}</td>
            <td>
                <a href={routeLink} target="_blank" rel="noopener noreferrer">
                    Ver Ruta
                </a>
            </td>
            <td>
                {ruta.estado === "Pendiente" && (
                    <button onClick={() => handleTakeRuta(ruta)}>Tomar Ruta</button>
                )}
                {ruta.estado === "Asignado" && (
                    <button onClick={() => handleCompleteRuta(ruta)}>
                        Confirmar Entrega
                    </button>
                )}
            </td>
        </tr>
    );
                })}



            </tbody>
          </table>
        </div>
      );
};

export default DeliveryPanel;
