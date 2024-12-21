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
    const [fetchPedidosEnRuta, setPedidosEnRuta] = useState({});
    const [estado, setEstado] = useState('Inactivo');
    const [loading, setLoading] = useState(false);
    const [puedeActivar, setPuedeActivar] = useState(false);
    const [mensajeHorario, setMensajeHorario] = useState('');



    const calculateTimeLeft = (fechaYHoraPrometida) => {
        if (!fechaYHoraPrometida) {
            console.warn("Fecha de entrega no definida o inválida:", fechaYHoraPrometida);
            return "Datos insuficientes";
        }
    
        const deliveryTime = moment(fechaYHoraPrometida, "YYYY-MM-DD HH:mm", true);
        if (!deliveryTime.isValid()) {
            console.warn("Formato de fecha inválido:", fechaYHoraPrometida);
            return "Fecha inválida";
        }
    
        const diff = deliveryTime.diff(moment(), "seconds");
        if (diff <= 0) return "Tiempo agotado";
    
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
    
        return `${hours}h ${minutes}m ${seconds}s`;
    };
    const normalizarTexto = (texto) => {
        return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };
    const traducirDia = (diaIngles) => {
        const dias = {
            monday: 'lunes',
            tuesday: 'martes',
            wednesday: 'miercoles',
            thursday: 'jueves',
            friday: 'viernes',
            saturday: 'sabado',
            sunday: 'domingo'
        };
        const diaTraducido = dias[diaIngles.toLowerCase()] || diaIngles;
        return normalizarTexto(diaTraducido); // Normalizar el día traducido
    };

    useEffect(() => {
        const verificarHorario = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/repartidores/${repartidor.id_repartidor}/estado-horario`);
                setPuedeActivar(response.data.puedeActivar);
                setMensajeHorario(response.data.mensaje.replace(response.data.mensaje.match(/\(.*?\)/g), `(${traducirDia(moment().format('dddd'))})`));
            } catch (error) {
                console.error('Error al verificar horario:', error);
            }
        };
    
        verificarHorario();
    }, [repartidor]);
    useEffect(() => {
        const fetchEstado = async () => {
            if (!repartidor || !repartidor.id_repartidor) {
                console.warn('No hay información del repartidor logueado');
                return;
            }
    
            try {
                const response = await axios.get(`http://localhost:3001/repartidores/${repartidor.id_repartidor}`);
                console.log('Estado recuperado del backend:', response.data.estado); // Log para verificar el estado
                setEstado(response.data.estado); // Sincroniza el estado local con la base de datos
            } catch (error) {
                console.error('Error al obtener el estado del repartidor:', error);
            }
        };
    
        fetchEstado();
    }, [repartidor]);
    useEffect(() => {
        const interval = setInterval(() => {
            setPedidos((prevPedidos) =>
                prevPedidos.map((pedido) => {
                    const deliveryInfo = JSON.parse(pedido.metodo_entrega || "{}")?.Delivery;
                    return {
                        ...pedido,
                        tiempoRestante: calculateTimeLeft(deliveryInfo?.fechaYHoraPrometida),
                    };
                })
            );
        }, 1000);
    
        return () => clearInterval(interval);
    }, []); 
    useEffect(() => {
        if (showWallet) {
            fetchWallet(filtro); // Cargar wallet con el filtro predeterminado
        }
    }, [showWallet]);
    useEffect(() => {
        const loadData = async () => {
            try {
                await Promise.all([fetchPedidos(), fetchRutas()]);
            } catch (error) {
                console.error("Error al cargar pedidos y rutas:", error);
            }
        };
    
        if (loggedIn) {
            loadData();
            fetchWallet();
            fetchMontoWallet();
            fetchPrecioDelivery();
            fetchGraficaData();
        }
    }, [loggedIn, repartidor]);    
    useEffect(() => {
        if (loggedIn) {
            fetchGraficaData();
        }
    }, [loggedIn]);
    useEffect(() => {
        const fetchPedidosEnRuta = async () => {
            try {
                const response = await axios.get("http://localhost:3001/registro_ventas");
                const pedidosEnRuta = response.data.data.filter(
                    (pedido) => pedido.enRuta && pedido.estado_entrega === "Pendiente"
                );
    
                // console.log("Pedidos en ruta y pendientes encontrados:", pedidosEnRuta);
    
                const detallesPedidos = pedidosEnRuta.map((pedido) => {
                    const metodoEntrega = JSON.parse(pedido.metodo_entrega || "{}")?.Delivery;
    
                    if (!metodoEntrega || !metodoEntrega.fechaYHoraPrometida) {
                        console.warn(`Pedido ${pedido.id_order} tiene datos insuficientes en metodo_entrega`);
                        return {
                            id_order: pedido.id_order,
                            fechaYHoraPrometida: "Datos insuficientes",
                            tiempoRestante: "N/A",
                        };
                    }
    
                    const fechaYHoraPrometida = metodoEntrega.fechaYHoraPrometida;
                    const ahora = moment();
                    const fechaPrometida = moment(fechaYHoraPrometida, "YYYY-MM-DD HH:mm");
    
                    if (!fechaPrometida.isValid()) {
                        console.warn(`Pedido ${pedido.id_order} tiene una fecha inválida: ${fechaYHoraPrometida}`);
                        return {
                            id_order: pedido.id_order,
                            fechaYHoraPrometida,
                            tiempoRestante: "Fecha inválida",
                        };
                    }
    
                    const diferenciaSegundos = fechaPrometida.diff(ahora, "seconds");
                    const horas = Math.floor(diferenciaSegundos / 3600);
                    const minutos = Math.floor((diferenciaSegundos % 3600) / 60);
                    const segundos = diferenciaSegundos % 60;
    
                    const tiempoRestante =
                        diferenciaSegundos <= 0 ? "Tiempo agotado" : `${horas}h ${minutos}m ${segundos}s`;
    
                    return {
                        id_order: pedido.id_order,
                        id_ruta: pedido.enRuta,
                        fechaYHoraPrometida,
                        tiempoRestante,
                        tiempoRestanteSegundos: diferenciaSegundos > 0 ? diferenciaSegundos : 0, // Aseguramos valores positivos
                    };
                });
    
                // console.log("Detalles de pedidos con tiempo restante calculado:", detallesPedidos);
    
                // Calcular promedio de tiempo restante en segundos
                const tiemposSegundos = detallesPedidos
                    .map((pedido) => pedido.tiempoRestanteSegundos)
                    .filter((segundos) => segundos > 0);
    
                let tiempoPromedioGeneral = "Tiempo agotado";
    
                if (tiemposSegundos.length > 0) {
                    const promedioSegundos =
                        tiemposSegundos.reduce((sum, segundos) => sum + segundos, 0) / tiemposSegundos.length;
    
                    const horas = Math.floor(promedioSegundos / 3600);
                    const minutos = Math.floor((promedioSegundos % 3600) / 60);
                    const segundos = Math.floor(promedioSegundos % 60);
    
                    tiempoPromedioGeneral = `${horas}h ${minutos}m ${segundos}s`;
                }
    
                // Actualizar el estado `pedidosEnRuta` con los tiempos calculados
                setPedidosEnRuta({
                    detallesPedidos,
                    tiempoPromedioGeneral,
                });
    
                // console.log("Tiempo promedio general para la tabla:", tiempoPromedioGeneral);
            } catch (error) {
                console.error("Error al cargar pedidos en ruta:", error);
            }
        };
    
        fetchPedidosEnRuta(); 
    
       
        const interval = setInterval(() => {
            fetchPedidosEnRuta(); 
        }, 1000);
    
        return () => clearInterval(interval); 
    }, []);

    const toggleEstado = async () => {
        setLoading(true);
        const nuevoEstado = estado === 'Activo' ? 'Inactivo' : 'Activo';
        const diaActual = traducirDia(moment().format('dddd'));
        
        console.log('Día enviado al servidor:', diaActual); // <-- Agregar este log
        
        try {
            const response = await axios.patch(
                `http://localhost:3001/repartidores/${repartidor.id_repartidor}/estado`, 
                { estado: nuevoEstado, diaActual }
            );
            console.log('Respuesta del servidor:', response.data);
            
            if (response.data.success) {
                setEstado(nuevoEstado);
            } else {
                console.warn('No se pudo cambiar el estado:', response.data.message);
            }
        } catch (error) {
            console.error('Error al cambiar el estado:', error);
        } finally {
            setLoading(false);
        }
    };
    
    
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/repartidores/login', { username, password });
            if (response.data.success) {
                const repartidorData = response.data.repartidor;
                setRepartidor(repartidorData);
                setLoggedIn(true);
    
                // Almacenar tanto el objeto repartidor como el id_repartidor
                localStorage.setItem('loggedIn', JSON.stringify(true));
                localStorage.setItem('repartidor', JSON.stringify(repartidorData));
                localStorage.setItem('repartidorId', repartidorData.id_repartidor); // Almacenar id_repartidor
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
    
            const pedidosPendientes = response.data.data.filter(
                (pedido) =>
                    (pedido.estado_entrega === "Pendiente" || pedido.estado_entrega === "Asignado") &&
                    JSON.parse(pedido.metodo_entrega || "{}").Delivery &&
                    !JSON.parse(pedido.metodo_entrega || "{}").PickUp &&
                    !pedido.enRuta
            );
            console.log("Pedidos pendientes filtrados:", pedidosPendientes);
    
            setPedidos(pedidosPendientes); // Actualizar solo los pedidos individuales pendientes
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
    const handleTakeRuta = async (enRuta) => {
        try {
            // Validar la disponibilidad de los pedidos en la ruta
            const checkResponse = await axios.get(`http://localhost:3001/registro_ventas/ruta_disponibilidad/${enRuta}`);
            const pedidosNoDisponibles = checkResponse.data.filter(pedido => pedido.estado_entrega !== "Pendiente");
    
            if (pedidosNoDisponibles.length > 0) {
                alert(`No se puede tomar la ruta. Hay pedidos no disponibles: ${pedidosNoDisponibles.map(p => p.id_order).join(', ')}`);
                return;
            }
    
            // Actualizar el estado de entrega de todos los pedidos en la ruta
            const response = await axios.patch(`http://localhost:3001/registro_ventas/tomar_ruta/${enRuta}`, {
                estado_entrega: 'Asignado',
                id_repartidor: repartidor.id_repartidor
            });
    
            if (response.data.success) {
                // Forzar actualización de rutas y pedidos
                await Promise.all([fetchRutas(), fetchPedidos()]);
    
                alert(`Ruta ${enRuta} tomada con éxito`);
            } else {
                alert('Error al tomar la ruta. Inténtalo nuevamente.');
            }
        } catch (error) {
            console.error('Error al tomar la ruta:', error);
            alert('Error al tomar la ruta.');
        }
    };
    const handleCompletePedido = async (pedidoId) => {
        console.log("Valor recibido en handleCompletePedido:", pedidoId);
    
        try {
            const pedido = pedidos.find(p => p.id_order === pedidoId);
            console.log("Pedido encontrado:", pedido);
    
            if (!pedido) {
                console.error("No se encontró el pedido. Verifica el valor de pedidoId.");
                return;
            }
            if (!pedido?.venta_procesada || pedido.venta_procesada !== 1) {
                alert("No se puede confirmar la entrega. La venta aún no está procesada.");
                console.warn("La venta aún no está procesada:", pedidoId);
                return;
            }
    
            const deliveryInfo = JSON.parse(pedido.metodo_entrega).Delivery;
            const costoDelivery = deliveryInfo.costoReal;
    
            console.log("Cargando patch para finalizar pedido con ID:", pedidoId);
    
            try {
                const response = await axios.patch(`http://localhost:3001/registro_ventas/finalizar_pedido/${pedidoId}`, {
                    estado_entrega: "Entregado",
                });
                console.log("Respuesta del servidor:", response.data);
                console.log("Patch exitoso para pedido:", pedidoId);
            } catch (error) {
                console.error('Error en la petición PATCH:', error.response || error.message);
            }
            // POST a la wallet
            await axios.post('http://localhost:3001/wallet/guardar_precio_delivery', {
                id_order: pedidoId,
                id_repartidor: repartidor.id_repartidor,
                monto_por_cobrar: costoDelivery
            });
    
            console.log("Post exitoso para wallet con ID:", pedidoId);
    
            // Actualizar estados
            setPedidos(prevPedidos => prevPedidos.filter(pedido => pedido.id_order !== pedidoId));
            setMontoPorCobrar(prevMonto => prevMonto + costoDelivery);
            fetchPedidos();
            alert('Pedido entregado con éxito');
        } catch (error) {
            console.error('Error al finalizar el pedido:', error);
            alert('Error al finalizar el pedido');
        }
    };
    const handleCompleteRuta = async (enRuta) => {
        try {
            // Obtener la ruta seleccionada
            const rutaSeleccionada = rutas.find((ruta) => ruta.id_ruta === enRuta);
    
            // Verificar si la ruta está procesada (ventaProcesada)
            if (!rutaSeleccionada?.ventaProcesada) {
                alert("No se puede confirmar la entrega. La ruta aún no está procesada.");
                return;
            }
    
            // Tomar el costo total de la ruta
            const costoTotalDelivery = rutaSeleccionada.costo_total || 0;
    
            // Actualizar el estado de entrega a "Entregado" en la base de datos
            await axios.patch(`http://localhost:3001/registro_ventas/finalizar_ruta/${enRuta}`, {
                estado_entrega: "Entregado",
            });
    
            // Guardar el precio total del delivery en la wallet
            await axios.post("http://localhost:3001/wallet/guardar_precio_delivery", {
                id_order: enRuta, // Usamos el id_ruta como identificador en la wallet
                id_repartidor: repartidor.id_repartidor,
                monto_por_cobrar: costoTotalDelivery,
            });
    
            // Actualizar las rutas y remover las rutas entregadas del estado local
            await fetchRutas();
            setRutas((prevRutas) => prevRutas.filter((ruta) => ruta.id_ruta !== enRuta));
    
            // Actualizar el monto por cobrar localmente
            setMontoPorCobrar((prevMonto) => prevMonto + costoTotalDelivery);
    
            alert(`Ruta ${enRuta} finalizada con éxito.`);
        } catch (error) {
            console.error("Error al finalizar la ruta:", error);
            alert("Error al finalizar la ruta.");
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
            return "#";
        }
    
        const tiendaSalidaCoords = ruta.tiendaSalida.coordenadas;
        const paradasCoords = ruta.direcciones
            .map((direccionObj) => direccionObj.coordinates && `${direccionObj.coordinates.lat},${direccionObj.coordinates.lng}`)
            .filter(Boolean);
    
        if (paradasCoords.length === 0) {
            console.warn("No se encontraron paradas válidas para la ruta:", ruta.id_ruta);
            return "#";
        }
    
        const baseUrl = "https://www.google.com/maps/dir/";
        const tiendaCoords = `${tiendaSalidaCoords.lat},${tiendaSalidaCoords.lng}`;
        return `${baseUrl}${tiendaCoords}/${paradasCoords.join("/")}`;
    };
    const generateSingleLink = (deliveryInfo) => {
        if (!deliveryInfo || !deliveryInfo.address || !deliveryInfo.tiendaSalida?.lat || !deliveryInfo.tiendaSalida?.lng) {
            console.warn("Datos incompletos para generar la ruta del pedido individual:", deliveryInfo);
            return "#";
        }
    
        const baseUrl = "https://www.google.com/maps/dir/";
        const tiendaCoords = `${deliveryInfo.tiendaSalida.lat},${deliveryInfo.tiendaSalida.lng}`;
        const encodedDestination = encodeURIComponent(deliveryInfo.address);
    
        return `${baseUrl}${tiendaCoords}/${encodedDestination}`;
    };
    const fetchRutas = async () => {
        try {
            const [rutasResponse, pedidosResponse] = await Promise.all([
                axios.get("http://localhost:3001/rutas"),
                axios.get("http://localhost:3001/registro_ventas"),
            ]);
    
            if (rutasResponse.data.success && pedidosResponse.data.message === "success") {
                const pedidos = pedidosResponse.data.data; // Lista completa de pedidos
                const rutas = rutasResponse.data.data
                    .map((ruta) => {
                        let tiendaSalida, direcciones, idPedidos, costoTotal;
    
                        // Parse tiendaSalida
                        try {
                            tiendaSalida = JSON.parse(ruta.tienda_salida || "{}");
                        } catch {
                            tiendaSalida = { nombre_empresa: "Desconocido", direccion: "No definida" };
                        }
    
                        // Parse direcciones
                        try {
                            direcciones = JSON.parse(ruta.direcciones || "[]").map((direccion) => ({
                                address: direccion?.address || "Sin dirección",
                                coordinates: direccion?.coordinates || null,
                            }));
                        } catch {
                            direcciones = [];
                        }
    
                        // Parse id_pedidos
                        try {
                            idPedidos = JSON.parse(ruta.id_pedidos || "[]");
                            if (!Array.isArray(idPedidos)) {
                                console.warn(`Formato inesperado en id_pedidos de la ruta ${ruta.id_ruta}:`, ruta.id_pedidos);
                                idPedidos = [];
                            }
                        } catch (error) {
                            console.warn(`Error al procesar id_pedidos en ruta ${ruta.id_ruta}:`, error);
                            idPedidos = [];
                        }
    
                        // Obtener pedidos asociados a esta ruta
                        const pedidosDeRuta = pedidos.filter((pedido) => pedido.enRuta === ruta.id_ruta);
    
                        // Calcular el estado general de la ruta
                        const estadoRuta = (() => {
                            if (pedidosDeRuta.length === 0) {
                                return "Sin Pedidos";
                            }
    
                            const estadosPedidos = pedidosDeRuta.map((pedido) => pedido.estado_entrega);
    
                            if (estadosPedidos.every((estado) => estado === "Entregado")) {
                                return "Entregado";
                            }
    
                            if (estadosPedidos.some((estado) => estado === "Asignado")) {
                                return "Asignado";
                            }
    
                            if (estadosPedidos.every((estado) => estado === "Pendiente")) {
                                return "Pendiente";
                            }
    
                            return "Estado Desconocido";
                        })();
    
                        // Consolidar información del repartidor asignado
                        const idRepartidorAsignado = pedidosDeRuta.find((pedido) => pedido.id_repartidor)?.id_repartidor || null;
    
                        // Validar si todos los pedidos de la ruta están procesados
                        const ventaProcesada = pedidosDeRuta.every((pedido) => pedido.venta_procesada === 1);
    
                        // Agregar el costo_total de la ruta
                        costoTotal = ruta.costo_total || 0;
    
                        // Log para depuración
                        console.log(`Ruta procesada: ${ruta.id_ruta}`, {
                            idPedidos,
                            direcciones,
                            tiendaSalida,
                            estadoRuta,
                            idRepartidorAsignado,
                            ventaProcesada,
                            costoTotal,
                        });
    
                        return {
                            ...ruta,
                            tiendaSalida,
                            id_pedidos: idPedidos,
                            direcciones,
                            tiempo_estimado: ruta.tiempo_estimado || "Calculando...",
                            estadoRuta,
                            idRepartidorAsignado,
                            ventaProcesada,
                            costo_total: costoTotal, // Agregar costo_total
                        };
                    })
                    .filter((ruta) => ruta.estadoRuta !== "Entregado"); // Filtrar rutas entregadas
    
                console.log("Rutas obtenidas y procesadas:", rutas);
                setRutas(rutas); // Actualizar el estado con las rutas procesadas
            } else {
                console.error("Error al obtener rutas o pedidos:", rutasResponse.data.message, pedidosResponse.data.message);
            }
        } catch (error) {
            console.error("Error al cargar rutas:", error);
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

            {/* Botón/Interruptor con apariencia unificada */}
            <div
            className={`delivery-button ${estado === 'Activo' ? 'activo' : 'inactivo'}`}
            onClick={puedeActivar ? toggleEstado : null}
            role="button"
            style={{ cursor: puedeActivar ? 'pointer' : 'not-allowed', opacity: puedeActivar ? 1 : 0.5 }}
                >
                    {estado}
                </div>
                <p>{!puedeActivar && mensajeHorario}</p>
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
    const routeLink = generateSingleLink(deliveryInfo);
    

    return (
        <tr key={pedido.id_order}>
            <td>{index + 1}</td>
            <td>Single</td>
            <td>{pedido.id_order}</td>
            <td>{deliveryInfo?.address || "Sin dirección"}</td>
            <td>{pedido.tiempoRestante || "Calculando..."}</td>
            <td>{deliveryInfo?.costoReal ? `${deliveryInfo.costoReal.toFixed(2)} €` : "N/A"}</td>
            <td>{deliveryInfo?.costoReal ? `${(deliveryInfo.costoReal / precioDelivery).toFixed(2)} km` : "N/A"}</td>
            <td>
                {deliveryInfo?.tiendaSalida?.nombre_empresa || "Desconocida"}
            </td>
            <td>{pedido.estado_entrega}</td>
            <td>
                {pedido.id_repartidor
                    ? pedido.id_repartidor === repartidor?.id_repartidor
                        ? "Tú"
                        : `Repartidor ${pedido.id_repartidor}`
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



    return (
        <tr key={ruta.id_ruta}>
            <td>{index + 1}</td>
            <td>Route</td>
            <td>
                {Array.isArray(ruta.id_pedidos) && ruta.id_pedidos.length > 0
                    ? ruta.id_pedidos.join(", ")
                    : "Sin pedidos"}
            </td>
            <td>
                {ruta.direcciones.map((direccion, idx) => (
                    <li key={idx}>{direccion.address || "Sin dirección"}</li>
                ))}
            </td>
            <td>
                {fetchPedidosEnRuta?.id_ruta === ruta.idRuta
                    ? fetchPedidosEnRuta.tiempoPromedioGeneral || "Calculando..."
                    : "N/A"}
            </td>
            <td>{(ruta.costo_total || 0).toFixed(2)} €</td>
            <td>
                {ruta.distancia_total
                    ? `${ruta.distancia_total.toFixed(2)} km`
                    : "Calculando..."}
            </td>
            <td>{ruta.tiendaSalida?.nombre_empresa || "Desconocida"}</td>
            <td>
                <strong>{ruta.estadoRuta}</strong>
            </td>
            <td>
                {ruta.idRepartidorAsignado
                    ? ruta.idRepartidorAsignado === repartidor?.id_repartidor
                        ? "Tú"
                        : `Repartidor ${ruta.idRepartidorAsignado}`
                    : "No asignado"}
            </td>
            <td>
                <a href={routeLink} target="_blank" rel="noopener noreferrer">
                    Ver Ruta
                </a>
            </td>
            <td>
            {ruta.id_pedidos && ruta.id_pedidos.length > 0 ? (
                ruta.estadoRuta === "Asignado" ? (
                    <button onClick={() => handleCompleteRuta(ruta.id_ruta)}>
                        Confirmar Entrega
                    </button>
                ) : ruta.estadoRuta === "Pendiente" ? (
                    <button onClick={() => handleTakeRuta(ruta.id_ruta)}>
                        Tomar Ruta
                    </button>
                ) : (
                    "Acción no disponible"
                )
            ) : (
                "Sin Pedidos"
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
