import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { _PizzaContext } from './_PizzaContext';
import ReactFlow, { Background } from 'react-flow-renderer';
import '../styles/DeliveryPanel.css'; 
import CustomNode from './CustomNode';



const DeliveryPanel = () => {
  const { sessionData } = useContext(_PizzaContext);
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
  const [rutas, setRutas] = useState([]);
  const [fetchPedidosEnRuta, setPedidosEnRuta] = useState({});
  const [precioDelivery, setPrecioDelivery] = useState(0);
  const [showWallet, setShowWallet] = useState(false);
  const [wallet, setWallet] = useState([]);
  const [montoPorCobrar, setMontoPorCobrar] = useState(0);
  const [montoPagado, setMontoPagado] = useState(0);
  const [estadoBoton, setEstadoBoton] = useState('Consolidate');
  const [graficaData, setGraficaData] = useState([]); 
  const [filtro, setFiltro] = useState('diario');
  const [estado, setEstado] = useState(() => {
    const storedEstado = localStorage.getItem('estadoRepartidor');
    return storedEstado || 'Inactivo';
  });
  const [loading, setLoading] = useState(false);
  const [puedeActivar, setPuedeActivar] = useState(false);
  const [mensajeHorario, setMensajeHorario] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [mensajeSuspension, setMensajeSuspension] = useState('');
  const [showModalAviso, setShowModalAviso] = useState(false);
  const [mensajeAviso, setMensajeAviso] = useState('');
  const [modalMensaje, setModalMensaje] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [pedidoDetalleModal, setPedidoDetalleModal] = useState(null);
  const [todosLosPedidos, setTodosLosPedidos] = useState([]); 
  const [montoPagadoHoy, setMontoPagadoHoy] = useState(0);


  useEffect(() => {
    let startX = 0;
    let endX = 0;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };
    const handleTouchMove = (e) => {
      endX = e.touches[0].clientX;
    };
    const handleTouchEnd = () => {
      const diff = startX - endX;
      if (diff > 50) handleNext(); // swipe izquierda
      else if (diff < -50) handlePrev(); // swipe derecha
    };

    const container = carouselRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart);
      container.addEventListener('touchmove', handleTouchMove);
      container.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, []);
  useEffect(() => {
    if (repartidor) {
      verificarSuspension();
    }
  }, [repartidor]);
  useEffect(() => {
    if (repartidor) {
      verificarHorario();
    }
  }, [repartidor]);
  useEffect(() => {
    if (repartidor?.id_repartidor) {
      console.log('⏳ Repartidor encontrado, buscando estado...');
      fetchEstado(repartidor.id_repartidor);
    }
  }, [repartidor]);
  useEffect(() => {
    const interval = setInterval(() => {
      setPedidos((prev) =>
        prev.map((p) => {
          if (!p.metodo_entrega) return p;
  
          const deliveryInfo = JSON.parse(p.metodo_entrega)?.Delivery;
          const porcentajeConsumido = calcularPorcentajeConsumido(p);
  
          // console.log('==== PORCENTAJE ====');
          console.log('Pedido:', p.id_order);
          // console.log('Prometida:', deliveryInfo?.fechaYHoraPrometida);
          console.log('Porcentaje:', porcentajeConsumido);
  
          return {
            ...p,
            tiempoRestante: calculateTimeLeft(deliveryInfo?.fechaYHoraPrometida),
            porcentajeConsumido,
          };
        })
      );
    }, 1000);
  
    return () => clearInterval(interval);
  }, []);  
  useEffect(() => {
    if (loggedIn && repartidor) {
      loadDataInicial();
      fetchWallet();         // solo esta, ya incluye resumen
      fetchMontoPagadoHoy(); // si quieres mostrarlo por separado
    }
  }, [loggedIn, repartidor]);
  useEffect(() => {
    const fetchPedidosEnRuta = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/registro_ventas`);
        const pedidosEnRutaDatos = response.data.data.filter(
          (pedido) => pedido.enRuta && pedido.estado_entrega === 'Pendiente'
        );

        // Construir detalles
        const detallesPedidos = pedidosEnRutaDatos.map((pedido) => {
          const metodoEntrega = JSON.parse(pedido.metodo_entrega || '{}')?.Delivery;
          if (!metodoEntrega || !metodoEntrega.fechaYHoraPrometida) {
            return {
              id_order: pedido.id_order,
              fechaYHoraPrometida: 'Datos insuficientes',
              tiempoRestante: 'N/A',
            };
          }

          const fechaYHoraPrometida = metodoEntrega.fechaYHoraPrometida;
          const ahora = moment();
          const fechaPrometida = moment(fechaYHoraPrometida, 'YYYY-MM-DD HH:mm');

          if (!fechaPrometida.isValid()) {
            return {
              id_order: pedido.id_order,
              fechaYHoraPrometida,
              tiempoRestante: 'Fecha inválida',
            };
          }

          const diferenciaSegundos = fechaPrometida.diff(ahora, 'seconds');
          const horas = Math.floor(diferenciaSegundos / 3600);
          const minutos = Math.floor((diferenciaSegundos % 3600) / 60);
          const segundos = diferenciaSegundos % 60;
          const tiempoRestante =
            diferenciaSegundos <= 0 ? 'Tiempo agotado' : `${horas}h ${minutos}m ${segundos}s`;

          return {
            id_order: pedido.id_order,
            id_ruta: pedido.enRuta,
            fechaYHoraPrometida,
            tiempoRestante,
            tiempoRestanteSegundos: diferenciaSegundos > 0 ? diferenciaSegundos : 0,
          };
        });

        // Promedio
        const tiemposSegundos = detallesPedidos
          .map((p) => p.tiempoRestanteSegundos)
          .filter((seg) => seg > 0);

        let tiempoPromedioGeneral = 'Tiempo agotado';
        if (tiemposSegundos.length > 0) {
          const promedioSegundos = tiemposSegundos.reduce((sum, seg) => sum + seg, 0) / tiemposSegundos.length;
          const horas = Math.floor(promedioSegundos / 3600);
          const minutos = Math.floor((promedioSegundos % 3600) / 60);
          const segundos = Math.floor(promedioSegundos % 60);
          tiempoPromedioGeneral = `${horas}h ${minutos}m ${segundos}s`;
        }

        setPedidosEnRuta({
          detallesPedidos,
          tiempoPromedioGeneral,
        });
      } catch (error) {
        console.error('Error al cargar pedidos en ruta:', error);
      }
    };

    fetchPedidosEnRuta();
    const interval = setInterval(() => {
      fetchPedidosEnRuta();
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const verificarHorario = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/repartidores/${repartidor.id_repartidor}/estado-horario`
        );
        setPuedeActivar(response.data.puedeActivar);
      } catch (error) {
        console.error('Error al verificar horario:', error);
      }
    };
  
    if (repartidor) {
      verificarHorario();
    }
  }, [repartidor]);
  useEffect(() => {
    // Solo lo guardamos si realmente hay un valor
    if (estado) {
      localStorage.setItem('estadoRepartidor', estado);
    }
  }, [estado]);
  useEffect(() => {
    if (!rutas || rutas.length === 0) return;
  
    const interval = setInterval(() => {
      rutas.forEach(async (ruta) => {
        if (!ruta?.id_ruta) {
          console.warn('❌ Ruta sin id_ruta válida:', ruta);
          return;
        }
  
        const porcentaje = await calcularPorcentajeRuta(ruta.id_ruta);
        setRutas((prev) =>
          prev.map((r) =>
            r.id_ruta === ruta.id_ruta
              ? { ...r, porcentajeConsumidoRuta: porcentaje }
              : r
          )
        );
      });
    }, 1000);
  
    return () => clearInterval(interval);
  }, [rutas]);
  
  
  
  
  
  
  
  
  


  const calculateTimeLeft = (fechaYHoraPrometida) => {
    if (!fechaYHoraPrometida) {
      console.warn('Fecha de entrega no definida o inválida:', fechaYHoraPrometida);
      return 'Datos insuficientes';
    }

    const deliveryTime = moment(fechaYHoraPrometida, 'YYYY-MM-DD HH:mm', true);
    if (!deliveryTime.isValid()) {
      console.warn('Formato de fecha inválido:', fechaYHoraPrometida);
      return 'Fecha inválida';
    }

    const diff = deliveryTime.diff(moment(), 'seconds');
    if (diff <= 0) return 'Tiempo agotado';

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
      sunday: 'domingo',
    };
    const diaTraducido = dias[diaIngles.toLowerCase()] || diaIngles;
    return normalizarTexto(diaTraducido);
  };
  const verificarSuspension = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/repartidores/${repartidor.id_repartidor}`);
      const repartidorData = response.data;

      if (repartidorData.suspension_status) {
        const ahora = moment();
        const fechaFinSuspension = moment(repartidorData.suspension_end_date);

        if (ahora.isAfter(fechaFinSuspension)) {
          // Quitar suspensión
          const updateResponse = await axios.patch(
            `${process.env.REACT_APP_API_URL}/repartidores/${repartidor.id_repartidor}/estado`,
            {
              estado: 'Activo',
              suspension_status: false,
            }
          );
          if (updateResponse.data.success) {
            console.log('La suspensión ha sido levantada automáticamente.');
            setEstado('Activo');
          } else {
            console.error('Error al levantar la suspensión automáticamente.');
          }
        } else {
          // Sigue suspendido
          console.log(`Cuenta suspendida hasta ${fechaFinSuspension.format('YYYY-MM-DD HH:mm')}`);
          setEstado('Inactivo');
        }
      }
    } catch (error) {
      console.error('Error al verificar la suspensión:', error);
    }
  };
  const verificarHorario = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/repartidores/${repartidor.id_repartidor}/estado-horario`
      );
      setPuedeActivar(response.data.puedeActivar);
      setMensajeHorario(
        response.data.mensaje.replace(
          response.data.mensaje.match(/\(.*?\)/g),
          `(${traducirDia(moment().format('dddd'))})`
        )
      );
    } catch (error) {
      console.error('Error al verificar horario:', error);
    }
  };
  const fetchEstado = async (idOptional) => {
    const id = idOptional || repartidor?.id_repartidor;
    if (!id) {
      console.warn('⚠️ No se encontró un ID de repartidor válido para fetchEstado');
      return;
    }
    try {
      console.log(`🔍 Buscando estado del repartidor con ID: ${id}`);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/repartidores/${id}`);
  
      // ✅ Asegúrate de acceder correctamente al estado
      const estadoActual = response.data?.data?.estado;
      console.log('✅ Estado del repartidor recibido:', estadoActual);
  
      if (estadoActual) {
        setEstado(estadoActual);
        localStorage.setItem('estadoRepartidor', estadoActual);
      } else {
        console.warn('⚠️ No se encontró el campo "estado" en la respuesta del backend.');
      }
    } catch (error) {
      console.error('❌ Error al obtener el estado del repartidor:', error);
    }
  };
  const loadDataInicial = async () => {
    try {
      await Promise.all([fetchPedidos(), fetchRutas()]);
      fetchWallet();
      fetchMontoWallet();
      fetchPrecioDelivery();
      fetchGraficaData();
    } catch (error) {
      console.error('Error al cargar pedidos y rutas:', error);
    }
  };
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/repartidores/login`, {
        username,
        password,
      });
  
      if (response.data.success) {
        const repartidorData = response.data.repartidor;
        setRepartidor(repartidorData);
        setLoggedIn(true);
  
        localStorage.setItem('loggedIn', JSON.stringify(true));
        localStorage.setItem('repartidor', JSON.stringify(repartidorData));
        localStorage.setItem('repartidorId', repartidorData.id_repartidor);
  
        // ✅ Obtener el estado correctamente desde el campo 'data'
        const estadoResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/repartidores/${repartidorData.id_repartidor}`
        );
        const estadoActual = estadoResponse.data.data.estado;
        console.log("✅ Estado actualizado correctamente:", estadoActual);
        setEstado(estadoActual);
        localStorage.setItem('estadoRepartidor', estadoActual);
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    
      if (error.response && error.response.status === 403) {
        setMensajeSuspension(error.response.data.error);
        setShowSuspensionModal(true);
      }
       else if (error.response && error.response.status === 401) {
        setModalMensaje('Credenciales incorrectas. Por favor, revisa tu usuario o contraseña.');
        setMostrarModal(true);
      } else {
        setModalMensaje('Error al iniciar sesión. Por favor, intenta nuevamente.');
        setMostrarModal(true);
      }
  };
  };
  const handleLogout = () => {
    setLoggedIn(false);
    setRepartidor(null);
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('repartidor');
    // También podrías limpiar el estadoRepartidor si lo deseas:
    localStorage.removeItem('estadoRepartidor');
    setEstado('Inactivo'); 
  };
  const fetchPedidos = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/registro_ventas`);
      const todos = response.data.data || [];
  
      // Guardamos TODOS los pedidos sin filtrar para búsquedas posteriores
      setTodosLosPedidos(todos);
  
      // Filtramos solo los pendientes que no están en ruta (individuales)
      const pedidosPendientes = todos
        .filter(
          (pedido) =>
            (pedido.estado_entrega === 'Pendiente' || pedido.estado_entrega === 'Asignado') &&
            JSON.parse(pedido.metodo_entrega || '{}').Delivery &&
            !JSON.parse(pedido.metodo_entrega || '{}').PickUp &&
            !pedido.enRuta
        )
        .sort((a, b) => {
          const deliveryA = JSON.parse(a.metodo_entrega || '{}').Delivery || {};
          const deliveryB = JSON.parse(b.metodo_entrega || '{}').Delivery || {};
          if (deliveryA.TicketExpress && !deliveryB.TicketExpress) return -1;
          if (deliveryB.TicketExpress && !deliveryA.TicketExpress) return 1;
          return a.id_order - b.id_order;
        });
  
      // Calculamos distancia para los pedidos individuales
      const pedidosConDistancia = await Promise.all(
        pedidosPendientes.map(async (pedido) => {
          try {
            const metodo = JSON.parse(pedido.metodo_entrega || '{}');
            const delivery = metodo?.Delivery;
  
            if (
              !delivery ||
              !delivery.latitud ||
              !delivery.longitud ||
              !delivery.tiendaSalida?.lat ||
              !delivery.tiendaSalida?.lng
            ) {
              console.warn(`⚠️ Pedido ${pedido.id_order} omitido por coordenadas incompletas`);
              return pedido;
            }
  
            const origen = `${delivery.tiendaSalida.lat},${delivery.tiendaSalida.lng}`;
            const destino = `${delivery.latitud},${delivery.longitud}`;
  
            const resp = await axios.get(`${process.env.REACT_APP_API_URL}/api/google/distancia-single`, {
              params: {
                origen,
                destino,
                tiendaNombre: delivery.tiendaSalida.nombre_empresa || "Tienda"
              }
            });
  
            const metros = resp.data.distancia_m;
            const km = metros / 1000;
            const costoCalculado = parseFloat((km * 0.75).toFixed(2));
  
            console.log(`✅ Pedido ${pedido.id_order}`, {
              origen,
              destino,
              textoDistancia: resp.data.texto_distancia,
              textoDuracion: resp.data.texto_duracion,
              km,
              costoCalculado
            });
  
            return {
              ...pedido,
              distanciaGoogleKM: km,
              textoDistancia: resp.data.texto_distancia,
              duracionGoogle: resp.data.texto_duracion,
              costoCalculado,
            };
          } catch (err) {
            console.error(`❌ Error procesando pedido ${pedido.id_order}:`, err.message);
            return pedido;
          }
        })
      );
  
      // Finalmente guardamos solo los que se muestran
      setPedidos(pedidosConDistancia);
  
    } catch (error) {
      console.error('❌ Error general al cargar pedidos:', error.message);
    }
  };
  const fetchRutas = async () => {
    try {
      const [rutasResponse, pedidosResponse] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/rutas`),
        axios.get(`${process.env.REACT_APP_API_URL}/registro_ventas`),
      ]);
  
      if (rutasResponse.data.success && pedidosResponse.data.message === 'success') {
        const listaPedidos = pedidosResponse.data.data;
        const rutasRaw = rutasResponse.data.data;
  
        // console.log('📦 Rutas recibidas desde backend:', rutasRaw);
        // console.log('🧾 Pedidos recibidos desde backend:', listaPedidos);
  
        const rutasList = rutasRaw
          .map((ruta) => {
            let tiendaSalida, direcciones, idPedidos, costoTotal;
  
            try {
              tiendaSalida = JSON.parse(ruta.tienda_salida || '{}');
            } catch {
              tiendaSalida = { nombre_empresa: 'Desconocido', direccion: 'No definida' };
            }
  
            try {
              direcciones = JSON.parse(ruta.direcciones || '[]').map((direccion) => ({
                address: direccion?.address || 'Sin dirección',
                coordinates: direccion?.coordinates || null,
              }));
            } catch {
              direcciones = [];
            }
  
            try {
              idPedidos = JSON.parse(ruta.id_pedidos || '[]');
              if (!Array.isArray(idPedidos)) {
                idPedidos = [];
              }
            } catch {
              idPedidos = [];
            }
  
            const pedidosDeRuta = listaPedidos.filter((p) => p.enRuta === ruta.id_ruta);
  
            const estadoRuta = (() => {
              if (pedidosDeRuta.length === 0) return 'Sin Pedidos';
              const estadosPedidos = pedidosDeRuta.map((p) => p.estado_entrega);
              if (estadosPedidos.every((est) => est === 'Entregado')) return 'Entregado';
              if (estadosPedidos.some((est) => est === 'Asignado')) return 'Asignado';
              if (estadosPedidos.every((est) => est === 'Pendiente')) return 'Pendiente';
              return 'Estado Desconocido';
            })();
  
            const idRepartidorAsignado =
              pedidosDeRuta.find((p) => p.id_repartidor)?.id_repartidor || null;
            const ventaProcesada = pedidosDeRuta.every((p) => p.venta_procesada === 1);
            costoTotal = ruta.costo_total || 0;
  
            // 🟡 Log por ruta individual
            console.log(`➡️ Ruta ${ruta.id_ruta} | fecha_creacion: ${ruta.fecha_creacion}`);
  
            return {
              ...ruta,
              tiendaSalida,
              id_pedidos: idPedidos,
              direcciones,
              tiempo_estimado: ruta.tiempo_estimado || 'Calculando...',
              estadoRuta,
              idRepartidorAsignado,
              ventaProcesada,
              costo_total: costoTotal,
              fecha_creacion: ruta.fecha_creacion, 
            };
          })
          .filter((r) => r.estadoRuta !== 'Entregado');
  
        console.log('✅ Lista final de rutas procesadas:', rutasList);
  
        setRutas(rutasList);
      } else {
        console.error('Error al obtener rutas o pedidos:', rutasResponse.data.message, pedidosResponse.data.message);
      }
    } catch (error) {
      console.error('❌ Error al cargar rutas:', error);
    }
  };
  const toggleEstado = async () => {
    setLoading(true);
    try {
      console.log('🔄 Cambiando estado del repartidor...');
      const repartidorResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/repartidores/${repartidor.id_repartidor}`
      );
      console.log('🧾 Datos actuales del repartidor:', repartidorResponse.data);
  
      const repartidorData = repartidorResponse.data.data;
  
      if (repartidorData.suspension_status) {
        const fechaFin = moment(repartidorData.suspension_end_date).format('YYYY-MM-DD HH:mm');
        setModalMensaje(`Tu cuenta está suspendida hasta ${fechaFin}.`);
        setMostrarModal(true);
        setEstado('Inactivo');
        localStorage.setItem('estadoRepartidor', 'Inactivo');
        return;
      }
  
      const nuevoEstado = estado === 'Activo' ? 'Inactivo' : 'Activo';
      console.log(`🚦 Enviando nuevo estado: ${nuevoEstado}`);
      const response = await axios.patch(
        `${process.env.REACT_APP_API_URL}/repartidores/${repartidor.id_repartidor}/estado`,
        { estado: nuevoEstado }
      );
      console.log('📩 PATCH respuesta:', response.data);
  
      if (response.data.success) {
        setEstado(nuevoEstado);
        localStorage.setItem('estadoRepartidor', nuevoEstado);
      } else {
        console.warn('⚠️ No se pudo cambiar el estado:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error al cambiar el estado:', error);
      setModalMensaje('Error al cambiar el estado. Por favor, verifica la conexión con el servidor.');
      setMostrarModal(true);
    } finally {
      setLoading(false);
    }
  };  
  const handleTakePedido = async (pedidoId) => {
    try {
      if (estado !== 'Activo') {
        setModalMensaje("Debes estar en estado 'Activo' para tomar un pedido.");
        setMostrarModal(true);
        return;
      }
      const checkResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/registro_ventas/disponibilidad/${pedidoId}`
      );
      if (
        checkResponse.data.data.estado_entrega !== 'Pendiente' ||
        checkResponse.data.data.enRuta
      ) {
        setModalMensaje('El pedido ya fue tomado por otro repartidor o está en una ruta');
        setMostrarModal(true);
        fetchPedidos();
        return;
      }
      // Tomar
      const response = await axios.patch(
        `${process.env.REACT_APP_API_URL}/registro_ventas/tomar_pedido/${pedidoId}`,
        {
          estado_entrega: 'Asignado',
          id_repartidor: repartidor.id_repartidor,
        }
      );
      if (response.data.success) {
        setPedidos((prev) =>
          prev.map((p) =>
            p.id_order === pedidoId
              ? { ...p, estado_entrega: 'Asignado', id_repartidor: repartidor.id_repartidor }
              : p
          )
        );
        setModalMensaje('Pedido tomado con éxito');
        setMostrarModal(true);
      } else {
        setModalMensaje('El pedido ya fue tomado por otro repartidor');
        setMostrarModal(true);
      }
    } catch (error) {
      console.error('Error al tomar el pedido:', error);
      setModalMensaje('Error al tomar el pedido');
      setMostrarModal(true);
    }
  };
  const handleCompletePedido = async (pedidoId) => {
    try {
      const pedido = pedidos.find((p) => p.id_order === pedidoId);
      if (!pedido) {
        console.error('No se encontró el pedido. Verifica el valor de pedidoId.');
        return;
      }
      if (!pedido?.venta_procesada || pedido.venta_procesada !== 1) {
        setModalMensaje('No se puede confirmar la entrega. La venta aún no está procesada.');
        setMostrarModal(true);
        return;
      }
      const deliveryInfo = JSON.parse(pedido.metodo_entrega).Delivery;
      const costoDelivery = deliveryInfo.costoReal;

      await axios.patch(`${process.env.REACT_APP_API_URL}/registro_ventas/finalizar_pedido/${pedidoId}`, {
        estado_entrega: 'Entregado',
      });
      // Enviar correo de confirmación
      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/notificaciones/pedido_entregado`, {
          id_order: pedidoId,
          email: sessionData.email,
        });
      } catch (err) {
        console.error('Error al enviar correo de confirmación de entrega:', err.response || err.message);
      }

      // POST a la wallet
      await axios.post(`${process.env.REACT_APP_API_URL}/wallet/guardar_precio_delivery`, {
        id_order: pedidoId,
        id_repartidor: repartidor.id_repartidor,
        monto_por_cobrar: costoDelivery,
      });

      setPedidos((prev) => prev.filter((p) => p.id_order !== pedidoId));
      setMontoPorCobrar((prevMonto) => prevMonto + costoDelivery);
      fetchPedidos(); // refrescar
      setModalMensaje('Pedido entregado con éxito');
      setMostrarModal(true);
    } catch (error) {
      console.error('Error al finalizar el pedido:', error);
      setModalMensaje('Error al finalizar el pedido');
      setMostrarModal(true);
    }
  };
  const validarRutaDisponible = (pedidosRuta = []) => {
    const estadosNoPermitidos = ['Entregado', 'Cancelado'];
    return !pedidosRuta.some((pedido) =>
      estadosNoPermitidos.includes(pedido.estado_entrega)
    );
  };
  
  const handleTakeRuta = async (enRuta) => {
  try {
    if (estado !== 'Activo') {
      setModalMensaje("Debes estar en estado 'Activo' para tomar una ruta.");
      setMostrarModal(true);
      return;
    }
    // Pedimos al backend los pedidos que pertenecen a esta ruta
    const checkResponse = await axios.get(
      `${process.env.REACT_APP_API_URL}/registro_ventas/ruta_disponibilidad/${enRuta}`
    );
    const pedidosRuta = checkResponse.data; 
    // Esto suponiendo que el backend retorna un array con los pedidos de la ruta

    // Validamos solo si hay pedidos "Entregado" o "Cancelado"
    if (!validarRutaDisponible(pedidosRuta)) {
      const pedidosBloqueantes = pedidosRuta
        .filter((p) => p.estado_entrega === 'Entregado' || p.estado_entrega === 'Cancelado')
        .map((p) => p.id_order);

      setModalMensaje(
        `No se puede tomar la ruta. Hay pedidos no disponibles: ${pedidosBloqueantes.join(', ')}`
      );
      setMostrarModal(true);
      return;
    }

    // Si llegamos aquí, significa que ninguno está en Entregado/Cancelado.
    // Ahora sí, llamamos nuestro PATCH para asignar la ruta
    // NOTA: Tu endpoint /tomar_ruta espera un "id_orders" (array) e "id_repartidor"
    const response = await axios.patch(
      `${process.env.REACT_APP_API_URL}/registro_ventas/tomar_ruta/${enRuta}`,
      {
        id_repartidor: repartidor.id_repartidor,
        id_orders: pedidosRuta.map((p) => p.id_order), // IDs a actualizar
      }
    );

    if (response.data.success) {
      await Promise.all([fetchRutas(), fetchPedidos()]);
      setModalMensaje(`Ruta ${enRuta} tomada con éxito`);
      setMostrarModal(true);
    } else {
      setModalMensaje('Error al tomar la ruta. Inténtalo nuevamente.');
      setMostrarModal(true);
    }
  } catch (error) {
    console.error('Error al tomar la ruta:', error);
    setModalMensaje('Error al tomar la ruta.');
    setMostrarModal(true);
  }
};

  const handleCompleteRuta = async (idRuta) => {
  try {
    const rutaSeleccionada = rutas.find((r) => r.id_ruta === idRuta);
    console.log("Ruta seleccionada:", rutaSeleccionada);
    
    // Verificamos si la ruta fue procesada previamente
    if (!rutaSeleccionada?.ventaProcesada) {
      setModalMensaje('No se puede confirmar la entrega. La ruta aún no está procesada.');
      setMostrarModal(true);
      return;
    }

    // Obtener el costo total para registrar en wallet
    let costoTotalDelivery = 0;
try {
  const costos = JSON.parse(rutaSeleccionada.costo_total);
  if (Array.isArray(costos)) {
    costoTotalDelivery = costos.reduce((sum, val) => sum + parseFloat(val || 0), 0);
  } else {
    costoTotalDelivery = parseFloat(costos) || 0;
  }
} catch (err) {
  console.error("❌ Error al parsear costo_total:", err, rutaSeleccionada.costo_total);
}
    console.log("Costo Total Delivery (calculado):", costoTotalDelivery);
    
    // Para testear, puedes forzar un valor fijo (descomenta la siguiente línea)
    // const costoTotalDelivery = 5; // Valor fijo para depurar

    // 1. Actualizamos estado de los pedidos a "Entregado"
    await axios.patch(`${process.env.REACT_APP_API_URL}/registro_ventas/finalizar_ruta/${idRuta}`, {
      estado_entrega: 'Entregado',
    });

    // 2. Registramos el monto a cobrar por delivery en la wallet
    const postResponse = await axios.post(`${process.env.REACT_APP_API_URL}/wallet/guardar_precio_delivery`, {
      id_order: idRuta,
      id_repartidor: repartidor.id_repartidor,
      monto_por_cobrar: costoTotalDelivery,
    });
    console.log("Respuesta del POST guardar_precio_delivery:", postResponse.data);

    // 3. Actualizamos las rutas visualmente en el Delivery Panel
    await fetchRutas(); // Refresca la tabla
    setRutas((prev) => prev.filter((r) => r.id_ruta !== idRuta));

    // 4. Sumamos el monto a cobrar total (útil si hay dashboard de pagos)
    setMontoPorCobrar((prev) => prev + costoTotalDelivery);

    // 5. Mostramos mensaje de confirmación
    setModalMensaje(`Ruta ${idRuta} finalizada con éxito.`);
    setMostrarModal(true);
    console.log("Ruta seleccionada:", rutaSeleccionada);
    console.log("Costo Total Delivery (calculado):", costoTotalDelivery);
  } catch (error) {
    console.error('❌ Error al finalizar la ruta:', error);
    setModalMensaje('Error al finalizar la ruta.');
    setMostrarModal(true);
  }
  };
  const toggleWallet = () => {
    setShowWallet(!showWallet);
  };
  const fetchWallet = async (filtroSeleccionado = 'diario') => {
    if (!repartidor) return;
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/wallet/${repartidor.id_repartidor}?filtro=${filtroSeleccionado}`
      );
      if (response.data.success) {
        const walletData = response.data.data;
        setWallet(walletData);
        // Calcular el monto pagado basado en el filtro seleccionado
        const totalMontoPagado = walletData
          .filter((entry) => entry.estado === 'Pagado')
          .reduce((acc, entry) => acc + entry.monto_pagado, 0);
        setMontoPagado(totalMontoPagado);
      } else {
        console.error('Error al cargar la wallet');
      }
    } catch (error) {
      console.error('Error al obtener la información de la wallet:', error);
    }
  };
  const fetchMontoWallet = async () => {
    if (!repartidor) return;
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/wallet/${repartidor.id_repartidor}/estado`);
      if (response.data.success) {
        const resumen = response.data.resumen;
        setMontoPorCobrar(resumen.PorCobrar || 0);
        setMontoPagado(resumen.Pagado || 0);
      }
    } catch (error) {
      console.error('Error al obtener el estado de la wallet:', error);
    }
  };
  const handleConsolidar = async () => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/wallet/consolidar/${repartidor.id_repartidor}`);
      fetchWallet();
      fetchMontoWallet();
      fetchMontoPagadoHoy();
    } catch (error) {
      console.error('Error al consolidar la wallet:', error);
    }
  };
  const handlePagoConfirmado = async () => {
    try {
      const response = await axios.patch(`${process.env.REACT_APP_API_URL}/wallet/pago/${repartidor.id_repartidor}`);
      if (response.data.success) {
        await fetchWallet();
        await fetchMontoPagadoHoy();
      } else {
        console.error('Error al confirmar el pago:', response.data.message);
      }
    } catch (error) {
      console.error('Error al confirmar el pago:', error);
    }
  };
  const handleFiltroChange = (nuevoFiltro) => {
    setFiltro(nuevoFiltro);
    fetchWallet(nuevoFiltro);
  };
  const fetchGraficaData = async () => {
    if (!repartidor) return;
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/wallet/${repartidor.id_repartidor}`);
      if (response.data.success) {
        const walletData = response.data.data;
        const groupedData = {};
        walletData.forEach((entry) => {
          const fecha = moment(entry.fecha_consolidacion).format('YYYY-MM-DD');
          groupedData[fecha] = (groupedData[fecha] || 0) + 1;
        });
        const last7Days = Array.from({ length: 7 }, (_, i) =>
          moment().subtract(6 - i, 'days').format('YYYY-MM-DD')
        );
        const labels = last7Days.map((day) => day);
        const data = last7Days.map((day) => groupedData[day] || 0);
        setGraficaData({ labels, data });
      } else {
        console.error('Error al cargar los datos de la wallet');
      }
    } catch (error) {
      console.error('Error al obtener la información de la wallet:', error);
    }
  };
  const fetchPrecioDelivery = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/delivery/price`);
      if (response.data.success) {
        setPrecioDelivery(response.data.precio);
      } else {
        console.error('Error al cargar el precio de delivery:', response.data.message);
      }
    } catch (error) {
      console.error('Error al obtener el precio de delivery:', error);
    }
  };
  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? pedidos.length - 1 : prevIndex - 1));
  };
  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === pedidos.length - 1 ? 0 : prevIndex + 1));
  };
  const generateSingleLink = (deliveryInfo) => {
    if (!deliveryInfo || !deliveryInfo.tiendaSalida?.lat || !deliveryInfo.tiendaSalida?.lng) {
        console.warn("Datos incompletos para generar la ruta del pedido individual:", deliveryInfo);
        return "#";
    }

    const baseUrl = "https://www.google.com/maps/dir/";
    const tiendaCoords = `${deliveryInfo.tiendaSalida.lat},${deliveryInfo.tiendaSalida.lng}`;

    let destino;

    if (typeof deliveryInfo.address === 'string') {
        destino = encodeURIComponent(deliveryInfo.address);
    } else if (
        typeof deliveryInfo.address === 'object' &&
        deliveryInfo.address.lat &&
        deliveryInfo.address.lng
    ) {
        destino = `${deliveryInfo.address.lat},${deliveryInfo.address.lng}`;
    } else {
        console.warn("Dirección de destino inválida en deliveryInfo:", deliveryInfo);
        return "#";
    }

    return `${baseUrl}${tiendaCoords}/${destino}`;
  };
  const generateRouteLink = (ruta) => {
    if (!ruta || !ruta.tiendaSalida || !ruta.direcciones) {
      console.warn("❌ Datos incompletos para generar la ruta:", ruta);
      return "#";
    }
  
    const tienda = ruta.tiendaSalida;
    const tiendaCoords = tienda.coordenadas 
      ? `${tienda.coordenadas.lat},${tienda.coordenadas.lng}`
      : tienda.lat && tienda.lng
      ? `${tienda.lat},${tienda.lng}`
      : null;
  
    if (!tiendaCoords) {
      console.warn("❌ Coordenadas de tienda no válidas:", tienda);
      return "#";
    }
  
    const paradas = ruta.direcciones
      .map((d) => {
        if (d.coordinates && d.coordinates.lat && d.coordinates.lng) {
          return `${d.coordinates.lat},${d.coordinates.lng}`;
        }
        return null;
      })
      .filter(Boolean);
  
    if (paradas.length === 0) {
      console.warn("❌ No hay paradas válidas en la ruta:", ruta);
      return "#";
    }
  
    const baseUrl = "https://www.google.com/maps/dir/";
    const fullPath = [tiendaCoords, ...paradas].join("/");
  
    return `${baseUrl}${fullPath}`;
  };  
  const canTakePedido = async (pedidoNuevo) => {
    if (!pedidoNuevo || !repartidor) return false;
  
    const pedidosAsignados = pedidos.filter(
      (p) =>
        p.estado_entrega === 'Asignado' &&
        p.id_repartidor === repartidor.id_repartidor
    );
  
    if (pedidosAsignados.length >= 3) return false;
    if (pedidosAsignados.length === 0) {
      // ✅ Si no hay otros pedidos asignados, calculamos igual la distancia para mostrarla
      const coordsNuevo = getCoordsFromPedido(pedidoNuevo);
      const coordsTienda = getCoordsFromPedido({ metodo_entrega: JSON.stringify({ Delivery: { address: pedidoNuevo?.tiendaSalida, ...pedidoNuevo?.tiendaSalida } }) });
  
      if (!coordsNuevo || !coordsTienda) return true;
  
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/google/distancia-single`, {
          params: {
            origen: `${coordsTienda.lat},${coordsTienda.lng}`,
            destino: `${coordsNuevo.lat},${coordsNuevo.lng}`,
            tiendaNombre: 'calculo-single'
          }
        });
  
        const metros = response.data.distancia_m;
        const km = metros / 1000;
  
        pedidoNuevo.distanciaRealKM = km; // 🔥 distancia real para mostrar
  
        return true;
      } catch (error) {
        console.error('❌ Error al calcular distancia (sin pedidos asignados):', error);
        return true; // aún así permitir
      }
    }
  
    const coordsNuevo = getCoordsFromPedido(pedidoNuevo);
    if (!coordsNuevo) return false;
  
    // 🤝 Comparar con todos los pedidos asignados
    return await Promise.all(
      pedidosAsignados.map(async (p) => {
        const coordsAsignado = getCoordsFromPedido(p);
        if (!coordsAsignado) return false;
  
        const origen = `${coordsAsignado.lat},${coordsAsignado.lng}`;
        const destino = `${coordsNuevo.lat},${coordsNuevo.lng}`;
  
        try {
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/google/distancia-single`, {
            params: {
              origen,
              destino,
              tiendaNombre: 'calculo-single'
            }
          });
  
          const metros = response.data.distancia_m;
          const km = metros / 1000;
  
          // 🔥 Guardar solo una vez (la primera)
          if (typeof pedidoNuevo.distanciaRealKM === 'undefined') {
            pedidoNuevo.distanciaRealKM = km;
          }
  
          return km <= 1;
        } catch (error) {
          console.error('❌ Error al calcular distancia real con Google:', error);
          return false;
        }
      })
    ).then((resultados) => resultados.every((r) => r === true));
  };
  const getCoordsFromPedido = (pedido) => {
  try {
    const metodo = JSON.parse(pedido.metodo_entrega || '{}')?.Delivery;
    if (!metodo) return null;

    const address = metodo.address;
    if (typeof address === 'object' && address.lat && address.lng) {
      return { lat: address.lat, lng: address.lng };
    }

    return null;
  } catch {
    return null;
  }
  };
  const abrirModalPedido = (pedidoId) => {
    console.log("🔍 [abrirModalPedido] Pedido ID recibido:", pedidoId);
  
    const coincidencias = todosLosPedidos.map(p => ({
      id: p.id_order,
      igualEstricto: p.id_order === pedidoId,
      igualConString: String(p.id_order) === String(pedidoId)
    }));
    console.log("📋 [abrirModalPedido] Comparaciones:", coincidencias);
  
    const pedido = todosLosPedidos.find((p) => String(p.id_order) === String(pedidoId));
    console.log("✅ [abrirModalPedido] Pedido encontrado:", pedido);
  
    if (pedido) {
      const metodo = JSON.parse(pedido.metodo_entrega || "{}")?.Delivery;
      const tiempoRestante =
        pedido.tiempoRestante || calculateTimeLeft(metodo?.fechaYHoraPrometida);
      const porcentajeConsumido =
        typeof pedido.porcentajeConsumido !== "undefined"
          ? pedido.porcentajeConsumido
          : calcularPorcentajeConsumido(pedido);
  
      const pedidoConExtras = {
        ...pedido,
        tiempoRestante,
        porcentajeConsumido,
      };
  
      console.log("🟢 Modal activado con tiempoRestante:", tiempoRestante);
      setPedidoDetalleModal(pedidoConExtras);
    } else {
      console.warn("⚠️ No se encontró el pedido con ID:", pedidoId);
    }
  };
  const generarElementosDeRuta = (id_pedidos = []) => {
    const nodes = [];
    const edges = [];

    id_pedidos.forEach((pedidoId, index) => {
      nodes.push({
        id: `pedido-${pedidoId}`,
        position: { x: 0, y: index * 80 },
        data: { index: `#${index + 1}`, pedidoId, onClick: abrirModalPedido },
        type: 'custom'
      });

      if (index > 0) {
        edges.push({
          id: `edge-${index}`,
          source: `pedido-${id_pedidos[index - 1]}`,
          target: `pedido-${pedidoId}`,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: 'arrowclosed' },
          style: { stroke: 'gray', strokeWidth: 2 },
        });
      }
    });

    return { nodes, edges };
  };
  const getCostoTotal = (costo) => {
    if (Array.isArray(costo)) {
      return costo.reduce((acc, val) => acc + parseFloat(val || 0), 0);
    }
    if (typeof costo === "string") {
      try {
        const parsed = JSON.parse(costo);
        if (Array.isArray(parsed)) {
          return parsed.reduce((acc, val) => acc + parseFloat(val || 0), 0);
        }
        return parseFloat(parsed);
      } catch {
        return parseFloat(costo) || 0;
      }
    }
    return parseFloat(costo) || 0;
  };
  const calcularPorcentajeConsumido = (pedido) => {
    try {
      const prometidaString = JSON.parse(pedido.metodo_entrega || '{}')?.Delivery?.fechaYHoraPrometida;
      const fechaPrometida = moment(prometidaString, 'YYYY-MM-DD HH:mm');
  
      if (!fechaPrometida.isValid()) return 0;
  
      // 👇 Duración fija del periodo, puedes cambiarlo (en minutos)
      const duracionFijaMinutos = 30;
  
      const fechaInicioEstimado = moment(fechaPrometida).subtract(duracionFijaMinutos, 'minutes');
      const fechaActual = moment();
      const totalSegundos = fechaPrometida.diff(fechaInicioEstimado, 'seconds');
      const restanteSegundos = fechaPrometida.diff(fechaActual, 'seconds');
      const porcentaje = 1 - (restanteSegundos / totalSegundos);
  
      return Math.min(Math.max(porcentaje, 0), 1);
    } catch (err) {
      console.error("Error al calcular porcentaje fijo:", err);
      return 0;
    }
  };
  const calcularPorcentajeRuta = async (id_ruta) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/rutas/${id_ruta}`);
      const ruta = response.data.data;
  
      if (!ruta?.fecha_creacion) {
        console.warn('⛔ No se encontró fecha_creacion para la ruta', id_ruta);
        return 0;
      }
  
      // Fijamos la hora de inicio en la fecha de creación
      const inicio = moment(ruta.fecha_creacion);
      // Hora prometida = inicio + 45 minutos
      const fin = inicio.clone().add(45, 'minutes');
      const ahora = moment();
  
      const total = fin.diff(inicio, 'seconds');
      const transcurrido = ahora.diff(inicio, 'seconds');
      const porcentaje = transcurrido / total;
      const resultado = Math.min(Math.max(porcentaje, 0), 1); // entre 0 y 1
  
      console.log(`📦 Ruta ${ruta.id_ruta}`);
      console.log(`🕒 Inicio: ${inicio.format()} | Fin: ${fin.format()} | Ahora: ${ahora.format()}`);
      console.log(`⏱️ Total: ${total}s | Transcurrido: ${transcurrido}s`);
      console.log(`📊 Porcentaje bruto: ${porcentaje} | Mostrado: ${(resultado * 100).toFixed(0)}%`);
  
      return resultado;
    } catch (err) {
      console.error('❌ Error al obtener ruta desde calcularPorcentajeRuta:', err);
      return 0;
    }
  };
  const fetchMontoPagadoHoy = async () => {
    if (!repartidor) return;
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/wallet/${repartidor.id_repartidor}/total-diario`
      );
      if (response.data.success) {
        setMontoPagadoHoy(response.data.totalPagadoHoy); 
      }
    } catch (error) {
      console.error('Error al obtener el monto pagado del día:', error);
    }
  };
  const fetchResumenWallet = async () => {
    if (!repartidor) return;
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/wallet/resumen/${repartidor.id_repartidor}`
      );
      if (response.data.success) {
        const { totalPorCobrar, totalConsolidado, totalPagado } = response.data.data;
        setMontoPorCobrar(totalPorCobrar); 
        setMontoPagado(totalPagado);
  
        // Si deseas manejar 'Consolidado' aparte,
        // podrías guardar en otro estado: setMontoConsolidado(totalConsolidado);
      }
    } catch (error) {
      console.error('Error al obtener el resumen de wallet:', error);
    }
  };
  
  
 const singlePending = pedidos.filter(p => !p.enRuta && p.estado_entrega === 'Pendiente').length;
 const routePending = pedidos.filter(p => p.enRuta && p.estado_entrega === 'Asignado').length;
 const assigned = pedidos.filter(p => p.estado_entrega === 'Asignado').length;
 function toCapitalCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

  if (!loggedIn) {
    return (
      <>
          {showSuspensionModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>🚫 Account Suspended</h2>
                <p>
                Your account has been suspended.<br />
                  <strong>{mensajeSuspension}</strong><br />
                  Please contact support.
                </p>
                <button onClick={() => setShowSuspensionModal(false)}>Accept</button>
              </div>
            </div>
          )}
          
  
        <div>
          <div className='login-wrapper'>
          <div className="login-container3">
            <h2 className="login-title">Driver Login</h2>
            <form onSubmit={handleLogin} className="form-login-dp">
              <label htmlFor="correo">Email:</label>
              <input
                type="text"
                placeholder="example@email.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <label htmlFor="contrasena">Password:</label>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit" className="login-button">
                Login
              </button>
            </form>
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Modales */}
      {showModalAviso && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>⛔ This order can’t be taken</h2>
            <p>{mensajeAviso}</p>
            <button onClick={() => setShowModalAviso(false)}>Got it</button>
          </div>
        </div>
      )}
  
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>📢 Notice</h2>
            <p>{modalMensaje}</p>
            <button onClick={() => setMostrarModal(false)}>Close</button>
          </div>
        </div>
      )}
  
      {pedidoDetalleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>📦 Order Summary  {pedidoDetalleModal.id_order}</h3>
            {console.log("📦 [MODAL] Tiempo restante mostrado:", pedidoDetalleModal?.tiempoRestante)}
            <p>
              <strong>Address:</strong>{" "}
              {JSON.parse(pedidoDetalleModal.metodo_entrega).Delivery?.address || "N/A"}
            </p>
            <p>
            <strong>Time Left:</strong>{" "}
              {pedidoDetalleModal?.tiempoRestante
                ? pedidoDetalleModal.tiempoRestante
                : "No disponible"}
            </p>
            <button onClick={() => setPedidoDetalleModal(null)}>Close</button>
          </div>
        </div>
      )}
  
      <div className="delivery-panel-container">
        {/* Header */}
        <div className="header-container">
          <button onClick={handleLogout} className="header-button">
           Log Out
          </button>
          <button onClick={toggleWallet} className="header-button">
            {showWallet ? "Ocultar Wallet" : "Ver Wallet"}
          </button>
          <div
            className={`estado-button ${estado === "Activo" ? "activo" : "inactivo"}`}
            onClick={puedeActivar ? toggleEstado : undefined}
            style={{
              cursor: puedeActivar ? "pointer" : "not-allowed",
              opacity: puedeActivar ? 1 : 0.5,
              userSelect: "none",
              minWidth: "80px",
              textAlign: "center"
            }}
          >
            {estado === "Activo" || estado === "Inactivo" ? estado : "..."}
          </div>
        </div>
  
        {!puedeActivar && mensajeHorario && (
          <p
            style={{
              fontSize: "13px",
              color: "#d32f2f",
              marginTop: "6px",
              textAlign: "center",
              maxWidth: "300px",
              lineHeight: 1.4
            }}
          >
            {mensajeHorario}
          </p>
        )}
  
        {/* Daily Summary */}
        <div className="daily-summary-wrapper">
          <div className="daily-summary-header" onClick={() => setShowSummary(!showSummary)}>
            <span role="img" aria-label="calendar">
              📅
            </span>
            <strong>Daily Summary</strong>
            <span className="arrow-icon">{showSummary ? "▲" : "▼"}</span>
          </div>
          {showSummary && (
            <div className="daily-summary-details">
              <p>
                <strong>Single Pending:</strong> {singlePending}
              </p>
              <p>
                <strong>Route Pending:</strong> {routePending}
              </p>
              <p>
                <strong>Assigned:</strong> {assigned}
              </p>
            </div>
          )}
        </div>
  
        {/* Carousel */}
        <div className="carousel-container">
          <div className="carousel-inner" ref={carouselRef}>
            {pedidos.length + rutas.length > 0 ? (
              [
                // Convertimos pedidos a { ...p, type: 'single' }
                ...pedidos
                  .filter((p) => !rutas.flatMap((r) => r.id_pedidos).includes(p.id_order))
                  .map((p) => ({ ...p, type: "single" })),
  
                // Las rutas a { ...r, type: 'route' }
                ...rutas.map((r) => ({ ...r, type: "route" }))
              ].map((item, idx) => {
                // Distinción single vs route
                const isRoute = item.type === "route";
                const status = isRoute ? item.estadoRuta : item.estado_entrega;
                // Por defecto, si no hay nada, 'Pendiente'
                const estadoEntrega = status || "Pendiente";
  
                // Este offset y style es para el "efecto carrusel"
                const offset = idx - currentIndex;
                const isCenter = offset === 0;
                const style = {
                  position: "absolute",
                  transform: `translateX(${offset * 100}%) scale(${isCenter ? 1 : 0.85})`,
                  opacity: isCenter ? 1 : 0.4,
                  zIndex: isCenter ? 2 : 1,
                  transition: "transform 0.5s ease, opacity 0.5s ease"
                };
  
                // Por si acaso
                const tiempoRestanteString = item.tiempoRestante || "Calculando...";
  
                // Para pedidos, determinamos si se puede tomar (3 pedidos max y dist < 1km)
                const puedeTomar = isRoute ? true : canTakePedido(item);
  
                // ===================
                //   CASO: PEDIDO
                // ===================
                if (!isRoute) {
                  // item.type === 'single'
                  const metodoEntrega =
                    JSON.parse(item.metodo_entrega || "{}")?.Delivery || {};
                  const costoDeliveryReal = metodoEntrega.costoReal || 0;
  
                  return (
                    <div
                      key={`single-${item.id_order}`}
                      className="carousel-card"
                      style={style}
                    >
                      {/* Barra de progreso (pedido) */}
                      <div className="progress-container">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${
                              Math.min(Math.max(item.porcentajeConsumido ?? 0, 0), 1) * 100
                            }%`
                          }}
                        >
                          <span className="progress-label">
                            {typeof item.porcentajeConsumido === "number"
                              ? `${(item.porcentajeConsumido * 100).toFixed(0)}%`
                              : "0%"}
                          </span>
                        </div>
                      </div>
  
                      <div className="header-card">
                        <div
                          className={`status-badge status-${estadoEntrega.toLowerCase()}`}
                        >
                          {estadoEntrega}
                        </div>
                      </div>
                      <div className="card-content">
                        <h4>Tipo: Single</h4>
                        {metodoEntrega.TicketExpress && (
                          <div className="ticket-express-badge">
                            <strong>** 💥🚀 Ticket Express</strong> (priority) ⚡🔥**
                          </div>
                        )}
                        <p>
                          <strong>Order ID:</strong> {item.id_order}
                        </p>
                        <p>
                          <strong>Address:</strong>{" "}
                          {metodoEntrega.address || "Sin dirección"}
                        </p>
                        <p>
                          <strong>Time Left:</strong> {tiempoRestanteString}
                        </p>
                        <p>
                          <strong>Delivery Fee:</strong> {costoDeliveryReal} €
                        </p>
                        <p>
                          <strong>Distance:</strong>{" "}
                          {item.distanciaGoogleKM
                            ? `${item.distanciaGoogleKM.toFixed(2)} km`
                            : "N/A"}
                        </p>
                        <p>
                          <strong>Store:</strong>{" "}
                          {metodoEntrega.tiendaSalida?.nombre_empresa || "Desconocida"}
                        </p>
                      </div>
  
                      <div className="actions-container">
                        <div className="main-actions">
                          <a
                            className="action-button"
                            href={generateSingleLink(metodoEntrega)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            See Route
                          </a>
  
                          {/* Si está pendiente, botón "Tomar Pedido" */}
                          {estadoEntrega === "Pendiente" && (
                            <button
                              className="action-button"
                              onClick={async () => {
                                const sePuede = await puedeTomar; // canTakePedido(item)
                                if (!sePuede) {
                                  setMensajeAviso(
                                    "Ya tienes 3 pedidos asignados o este pedido está demasiado lejos (más de 1 km)."
                                  );
                                  setShowModalAviso(true);
                                  return;
                                }
                                // Llamamos handleTakePedido en vez de handleTakeRuta
                                handleTakePedido(item.id_order);
                              }}
                              disabled={estado !== "Activo"}
                            >
                              Take Order
                            </button>
                          )}
  
                         
                          {estadoEntrega === "Asignado" && (
                            <button
                              className="action-button"
                              onClick={() => handleCompletePedido(item.id_order)}
                              disabled={estado !== "Activo"}
                            >
                              Mark as Delivered
                            </button>
                          )}
                        </div>
                        <div className="carousel-local-buttons">
                          <button onClick={handlePrev} className="mini-arrow">
                            &lt;
                          </button>
                          <button onClick={handleNext} className="mini-arrow">
                            &gt;
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // ===================
                  //    CASO: RUTA
                  // ===================
                  const { nodes, edges } = generarElementosDeRuta(item.id_pedidos);
                  const nodeTypes = { custom: CustomNode };
                  let tiendaSalida = "Desconocida";
  
                  try {
                    const metodo =
                      typeof item.metodo_entrega === "string"
                        ? JSON.parse(item.metodo_entrega)
                        : item.metodo_entrega;
                    tiendaSalida =
                      item.tiendaSalida?.nombre_empresa ||
                      metodo?.Delivery?.tiendaSalida?.nombre_empresa ||
                      "Desconocida";
                  } catch (e) {
                    tiendaSalida = "Desconocida";
                  }
  
                  return (
                    <div
                      key={`route-${item.id_ruta}`}
                      className="carousel-card"
                      style={style}
                    >
                      {/* Barra de progreso (ruta) */}
                      <div className="my-progress-container">
                        <div
                          className="my-progress-bar"
                          style={{
                            width: `${
                              Math.min(Math.max(item.porcentajeConsumidoRuta ?? 0, 0), 1) * 100
                            }%`
                          }}
                        >
                          <span className="my-progress-label">
                            {typeof item.porcentajeConsumidoRuta === "number"
                              ? `${(item.porcentajeConsumidoRuta * 100).toFixed(0)}%`
                              : "0%"}
                          </span>
                        </div>
                      </div>
  
                      <div className="header-card">
                        <div
                          className={`status-badge status-${estadoEntrega.toLowerCase()}`}
                        >
                          {estadoEntrega}
                        </div>
                      </div>
  
                      <div className="card-content">
                        <h4>Tipo: Route ({item.id_ruta})</h4>
                        <div
                          style={{
                            height: 280,
                            background: "#fff",
                            borderRadius: 8,
                            marginTop: 10
                          }}
                        >
                          <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            fitView
                            nodesDraggable={false}
                            zoomOnScroll={false}
                            panOnScroll={false}
                            style={{
                              width: "100%",
                              height: "280px",
                              background: "transparent"
                            }}
                          />
                        </div>
  
                        <div
                          className="resumen-ruta-global"
                          style={{
                            marginTop: "12px",
                            display: "flex",
                            justifyContent: "center",
                            flexWrap: "wrap",
                            gap: "10px",
                            lineHeight: 0.5
                          }}
                        >
                          <p>
                            <strong>Delivery:</strong>{" "}
                            {Number(getCostoTotal(item.costo_total)).toFixed(2)} €
                          </p>
                          <p>
                            <strong>KM Total:</strong>{" "}
                            {item.distancia_total
                              ? `${item.distancia_total.toFixed(2)} km`
                              : "N/A"}
                          </p>
                          <p>
                            <strong>Starting Point:</strong> {tiendaSalida}
                          </p>
                        </div>
                      </div>
  
                      <div className="actions-container">
                        <div className="main-actions">
                          <a
                            className="action-button"
                            href={generateRouteLink({
                              tiendaSalida: item.tiendaSalida,
                              direcciones: item.direcciones
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            See Route
                          </a>
                          {estadoEntrega === "Pendiente" && (
                            <button
                              className="action-button"
                              onClick={() => handleTakeRuta(item.id_ruta)}
                              disabled={estado !== "Activo"}
                            >
                              Start Route
                            </button>
                          )}
  
                          {estadoEntrega === "Asignado" && (
                            <button
                              className="action-button"
                              onClick={() => handleCompleteRuta (item.id_ruta)}
                              disabled={estado !== "Activo"}
                            >
                              Mark as Delivered
                            </button>
                          )}
                        </div>
  
                        <div className="carousel-local-buttons">
                          <button onClick={handlePrev} className="mini-arrow">
                            &lt;
                          </button>
                          <button onClick={handleNext} className="mini-arrow">
                            &gt;
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              })
            ) : (
              <div className="noOrdersYet">
                <h2 style={{ marginBottom: "0.5rem" }}>
                  Hi, {repartidor?.nombre?.split(" ")[0] || "Invitado"}
                </h2>
                <span style={{ fontSize: "80px" }}>🙇‍♂️</span>
                <p style={{ fontSize: "18px", marginTop: "10px" }}>
                  Chilling for now ~ no orders yet.
                </p>
              </div>
            )}
          </div>
  
          {/* Paginación */}
          {pedidos.filter((p) => !p.enRuta).length + rutas.length > 1 && (
            <div className="carousel-dots">
              {[...pedidos.filter((p) => !p.enRuta), ...rutas].map((_, i) => (
                <span
                  key={i}
                  className={`dot ${i === currentIndex ? "active" : ""}`}
                  onClick={() => setCurrentIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
  
        {/* Wallet */}
        {showWallet && (
          <div className="wallet-modal">
            <p>
              Pending: {montoPorCobrar.toFixed(2)} € | Paid (Today): {montoPagadoHoy.toFixed(2)} €
            </p>
            <button
              className="wallet-button"
              onClick={async () => {
                await handleConsolidar();
                await handlePagoConfirmado(); // Ambos en secuencia
              }}
            >
              Consolidar
            </button>
          </div>
        )}
      </div>
    </>
  );
  
  
};

export default DeliveryPanel;