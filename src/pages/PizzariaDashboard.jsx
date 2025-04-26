import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';  
import { _PizzaContext } from './_PizzaContext';
import axios from 'axios';
import TimeAttendanceModal from "./TimeAttendanceModal";
import WarningModal from './WarningModal';
import ScheduledOrdersModal from './ScheduledOrdersModal';
import '../styles/PizzariaDashboard.css';
import moment from 'moment-timezone';  

const PizzariaDashboard = () => {
  const [currentDate, setCurrentDate] = useState(moment().tz('Europe/Madrid'));  
  const [isSuspending, setIsSuspending] = useState(false); 
  const [suspendOption, setSuspendOption] = useState('');
  const [remainingTime, setRemainingTime] = useState('');
  const [horarios, setHorarios] = useState([]); 
  const [pendingOrders, setPendingOrders] = useState(0);  
  const [previousOrders, setPreviousOrders] = useState(0); 
  const [audio] = useState(new Audio('/sounds/notification.mp3')); 
  const [nuevasRutasDisponibles, setNuevasRutasDisponibles] = useState(false);
  const [cantidadRutas, setCantidadRutas] = useState(0);
  const { isServiceSuspended, suspensionEndTime, setSuspensionState } = useContext(_PizzaContext);
  const [showTimeAttendanceModal, setShowTimeAttendanceModal] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [selectedUbicacion, setSelectedUbicacion] = useState(() =>
    localStorage.getItem('dash_selectedUbicacion') || null
  )
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [estado, setEstado] = useState(false); 
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState(null);
  const [warningActive, setWarningActive] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningsDashboard, setWarningsDashboard] = useState([]);
  const [scheduledOrders, setScheduledOrders] = useState([]);      
  const [showScheduledModal, setShowScheduledModal] = useState(false);
  const [selectedLatitud, setSelectedLatitud] = useState(null);
  const [selectedLongitud, setSelectedLongitud] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [rainProbability, setRainProbability] = useState(0);
  const [showWeatherModal, setShowWeatherModal] = useState(false);

  const navigate = useNavigate();  

  

  useEffect(() => {
    const fetchOrdersAndCalculateRoutes = async () => {
      try {
        const response = await axios.get("http://localhost:3001/registro_ventas");
        const registroVentas = response.data.data || [];
  
        // Filtrar pedidos relevantes para rutas
        const filteredOrders = registroVentas
          .filter((order) => {
            const metodoEntrega = JSON.parse(order.metodo_entrega || "{}");
            return (
              metodoEntrega.Delivery && // Solo considerar entregas
              !metodoEntrega.PickUp && // Excluir recogidas
              (order.estado_entrega === "Pendiente" || order.venta_procesada !== 1)
            );
          });
  
        console.log("Órdenes relevantes para rutas:", filteredOrders);
  
        // Calcular rutas potenciales
        const agrupables = filteredOrders.filter(
          (order) => order.estado_entrega === "Pendiente"
        );
        const rutasPotenciales = Math.floor(agrupables.length / 2);
  
        setCantidadRutas(rutasPotenciales);
        setNuevasRutasDisponibles(rutasPotenciales > 0);
  
        console.log("Rutas potenciales calculadas:", rutasPotenciales);
        console.log(
          nuevasRutasDisponibles
            ? "Hay nuevas rutas disponibles."
            : "No hay nuevas rutas disponibles."
        );
      } catch (error) {
        console.error(
          "Error al sincronizar las órdenes desde registro_ventas:",
          error
        );
      }
    };
  
    fetchOrdersAndCalculateRoutes(); // Ejecutar al montar el componente
  
    const interval = setInterval(fetchOrdersAndCalculateRoutes, 10000); // Verificar cada 10 segundos
  
    return () => clearInterval(interval); // Limpiar intervalo al desmontar
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(moment().tz('Europe/Madrid'));
    }, 1000); // Actualiza cada segundo

    return () => clearInterval(interval); // Limpia el intervalo al desmontar el componente
  }, []);
  useEffect(() => {
    if (showLocationModal) {
      console.log("⏳ Cargando empresas...");
      fetch('http://localhost:3001/api/info-empresa')
        .then(resp => resp.json())
        .then(data => {
          console.log("🏢 Empresas recibidas:", data);
          setUbicaciones(data);
  
          // 🔥 SOLO cambiar si no hay una selección previa
          if (!selectedUbicacion && data.length > 0) {
            const primeraUbicacion = data[0];
  
            setSelectedUbicacion(primeraUbicacion.id);
            setEstado(primeraUbicacion.estado === 'activo'); 
          }
        })
        .catch(err => console.error("❌ Error al obtener las empresas:", err));
    }
  }, [showLocationModal]);
  useEffect(() => {
    loadSuspensionState();
    loadHorarios();
    loadPendingOrders(); 
    const interval = setInterval(loadPendingOrders, 5000); // Polling cada 5 segundos

    return () => clearInterval(interval); // Limpiar el intervalo cuando se desmonta el componente
  }, []);  
  useEffect(() => {
    const fetchWarningsInBackground = async () => {
      console.log("🟡 [LOG] Consultando advertencias en segundo plano...");
  
      try {
        // 🚀 Consultamos los datos de inventario, reviews y advertencias descartadas
        const [inventoryRes, reviewsRes, dismissedWarningsRes] = await Promise.all([
          axios.get("http://localhost:3001/inventario"),
          axios.get("http://localhost:3001/api/reviews"),
          axios.get("http://localhost:3001/api/dismissed-warnings") // Nueva consulta a la BD
        ]);
  
        console.log("✅ [LOG] Respuesta completa de inventario:", inventoryRes.data);
        console.log("✅ [LOG] Respuesta completa de reviews:", reviewsRes.data);
        console.log("📂 [LOG] Advertencias previamente descartadas desde BD:", dismissedWarningsRes.data);
  
        if (!inventoryRes.data || !inventoryRes.data.data) {
          console.error("❌ [ERROR] Datos de inventario mal estructurados:", inventoryRes.data);
          return;
        }
  
        if (!reviewsRes.data) {
          console.error("❌ [ERROR] Datos de reviews mal estructurados:", reviewsRes.data);
          return;
        }
  
        // 🛠 Filtrar ingredientes inactivos
        console.log("🟡 [LOG] Ingredientes antes de filtrar:", inventoryRes.data.data);
        const ingredientesInactivos = inventoryRes.data.data
          .filter(ing => ing.estadoGEN === 1)
          .map(ing => ({
            id: `i-${ing.IDR}`,
            message: `⚠️ El producto ${ing.producto} está inactivo.`
          }));
  
        console.log("🟢 [LOG] Ingredientes inactivos detectados:", ingredientesInactivos);
  
        // 🛠 Filtrar reviews negativas
        console.log("🟡 [LOG] Reviews antes de filtrar:", reviewsRes.data);
        const reviewsNegativas = reviewsRes.data
          .filter(review => {
            const reviewDate = new Date(review.created_at);
            const now = new Date();
            const diffInHours = (now - reviewDate) / (1000 * 60 * 60); // Diferencia en horas
            return review.rating <= 2 && diffInHours <= 24;
          })
          .map(review => ({
            id: `r-${review.id}`,
            message: `⚠️ Review negativa de ${review.email} (⭐ ${review.rating})`
          }));
        
        console.log("🟢 [LOG] Reviews negativas detectadas (últimas 24 horas):", reviewsNegativas);
  
        // 🔥 Unificar todas las advertencias detectadas
        const allWarnings = [...ingredientesInactivos, ...reviewsNegativas];
        console.log("🔴 [LOG] Advertencias unificadas antes de filtrar vistas:", allWarnings);
  
        // 🔍 Extraer advertencias descartadas desde la base de datos
        const dismissedWarnings = dismissedWarningsRes.data
        .filter(warning => warning.warning_id !== undefined) // Asegura que no haya valores undefined
        .map(warning => String(warning.warning_id)); // Convertir a string por seguridad

      console.log("📂 [LOG] Advertencias descartadas en BD (corrigido):", dismissedWarnings);
  
        // 🚨 Filtrar advertencias ya descartadas en BD
        const newWarnings = allWarnings.filter(warning => 
          !dismissedWarnings.includes(String(warning.id))
        );
  
        console.log("🔎 [LOG] Advertencias nuevas (excluyendo vistas de BD):", newWarnings);
  
        setWarningsDashboard(newWarnings);
        setWarningActive(newWarnings.length > 0);
  
      } catch (error) {
        console.error("❌ [ERROR] al obtener advertencias en Dashboard:", error);
      }
    };
  
    fetchWarningsInBackground();
    const interval = setInterval(fetchWarningsInBackground, 15000);
  
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const fetchScheduledOrders = async () => {
      try {
        const response = await axios.get('http://localhost:3001/registro_ventas');
        const allOrders = response.data.data || [];
  
        // Filtrar los pedidos que:
        // - Tengan is_scheduled_order = 1
        // - Estén sin procesar (venta_procesada = 0)
        // - Sean para HOY (fechaYHoraPrometida empiece con YYYY-MM-DD actual)
        const today = moment().format('YYYY-MM-DD');
  
        const todayScheduled = allOrders.filter(order => {
          if (order.is_scheduled_order !== 1 || order.venta_procesada === 1) return false;
  
          const metodoEntrega = JSON.parse(order.metodo_entrega || '{}');
          const fechaPrometida = metodoEntrega.Delivery?.fechaYHoraPrometida ||
                                 metodoEntrega.PickUp?.fechaYHoraPrometida ||
                                 '';
          // Revisar si coincide con el día actual
          return fechaPrometida.startsWith(today);
        });
  
        setScheduledOrders(todayScheduled);
      } catch (error) {
        console.error('Error al obtener pedidos programados:', error);
      }
    };
  
    // Llamada inicial y cada 10-15 segundos
    fetchScheduledOrders();
    const interval = setInterval(fetchScheduledOrders, 15000);
  
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (selectedLatitud !== null && selectedLongitud !== null) {
      console.log("🌦️ Disparando clima desde efecto de coordenadas...");
      fetchWeatherData(selectedLatitud, selectedLongitud);
    }
  }, [selectedLatitud, selectedLongitud]);
  useEffect(() => {
    if (selectedUbicacion) {
      console.log("🔁 Cargando datos de empresa automáticamente con ID:", selectedUbicacion);
      fetch(`http://localhost:3001/api/info-empresa/${selectedUbicacion}`)
        .then(resp => resp.json())
        .then(response => {
          const empresa = response.data;
          if (!empresa) {
            console.error("❌ Empresa no encontrada:", response);
            return;
          }
  
          setEstado(empresa.estado === 'activo');
          setSelectedLatitud(empresa.ciudad_latitud);
          setSelectedLongitud(empresa.ciudad_longitud);
        })
        .catch(err => console.error("❌ Error al obtener datos de empresa:", err));
    }
  }, [selectedUbicacion]);
  useEffect(() => {
    console.log("⏳ [INIT] Cargando empresas al montar…");
    fetch("http://localhost:3001/api/info-empresa")
      .then((resp) => resp.json())
      .then((data) => {
        console.log("🏢 Empresas recibidas (init):", data);
        setUbicaciones(data);
  
        /* 1️⃣  ¿Hay algo guardado en localStorage?           */
        const storedId = localStorage.getItem("dash_selectedUbicacion");
  
        /* 2️⃣  Determinamos la ID que debe quedar seleccionada */
        let targetId = storedId || selectedUbicacion;
  
        if (!targetId && data.length > 0) {
          // Nada guardado → usamos la primera empresa
          targetId = String(data[0].id);
          localStorage.setItem("dash_selectedUbicacion", targetId);
        }
  
        if (!targetId) return; // aún no hay datos, salimos
  
        /* 3️⃣  Buscamos la empresa correspondiente           */
        const empresaSel = data.find((e) => String(e.id) === String(targetId));
        if (!empresaSel) {
          console.warn("⚠️ La empresa guardada no existe. Usando la primera.");
          if (data.length === 0) return;
          localStorage.removeItem("dash_selectedUbicacion");
          setSelectedUbicacion(String(data[0].id));
          setEstado(data[0].estado === "activo");
          setSelectedLatitud(data[0].ciudad_latitud);
          setSelectedLongitud(data[0].ciudad_longitud);
          return;
        }
  
        /* 4️⃣  Actualizamos estados si ha cambiado           */
        setSelectedUbicacion(String(empresaSel.id));
        setEstado(empresaSel.estado === "activo");
        setSelectedLatitud(empresaSel.ciudad_latitud);
        setSelectedLongitud(empresaSel.ciudad_longitud);
      })
      .catch((err) =>
        console.error("❌ Error al obtener las empresas (init):", err)
      );
  }, []);
  useEffect(() => {
    const savedUbic = localStorage.getItem('dash_selectedUbicacion');
    if (savedUbic) {
      setSelectedUbicacion(savedUbic);
    }
  }, []);
  
  const irAListaIngredientes = () => {
    navigate('/_Inicio/_InvIngDB/_ListaIngredientes');
  };
  const loadSuspensionState = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/pizzeria-settings');
      const { is_suspended, suspension_end_time } = response.data;
      
      if (is_suspended) {
        const endTime = moment(suspension_end_time);
        setSuspensionState(true, endTime);  
        calculateRemainingTime(endTime);    
      } else {
        setSuspensionState(false, null);    
      }
    } catch (error) {
      console.error('Error al obtener el estado de suspensión:', error);
    }
  };
  const loadHorarios = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/horarios');
      setHorarios(response.data);
    } catch (error) {
      console.error('Error al obtener los horarios:', error);
    }
  };
  const loadPendingOrders = async () => {
    try {
      const response = await axios.get('http://localhost:3001/registro_ventas');
      const pendingOrders = response.data.data.filter(order => order.venta_procesada === 0);
      setPendingOrders(pendingOrders.length); 

      // Si hay nuevas órdenes y el número ha cambiado, reproducir el sonido
      if (pendingOrders.length > previousOrders) {
        playNotificationSound();
      }
      
      // Guardar el número actual de órdenes para la comparación futura
      setPreviousOrders(pendingOrders.length);
    } catch (error) {
      console.error('Error al obtener las órdenes pendientes:', error);
    }
  };
  const playNotificationSound = () => {
    audio.play().catch((error) => {
      console.error('Error al reproducir el sonido de notificación:', error);
    });
  };
  const reanudarServicio = () => {
    console.log('Reanudando el servicio...');
    sendSuspensionStateToServer(false, null);  
  };
  const calculateRemainingTime = (endTime) => {
    const interval = setInterval(() => {
      const parsedEndTime = moment(endTime);  
      if (moment.isMoment(parsedEndTime) && parsedEndTime.isValid()) {  
        const now = moment().tz('Europe/Madrid');
        const diff = moment(parsedEndTime).diff(now, 'seconds');
  
        if (diff <= 0) {
          setSuspensionState(false, null);
          setRemainingTime('');
          reanudarServicio();  
          clearInterval(interval);  
        } else if (diff > 24 * 3600) {  
          setRemainingTime(`Volveremos el próximo ${parsedEndTime.format('dddd')} a las ${parsedEndTime.format('HH:mm')}`);
        } else {
          const duration = moment.duration(diff, 'seconds');
          const hours = Math.floor(duration.asHours());
          const minutes = Math.floor(duration.minutes());
          const seconds = Math.floor(duration.seconds());
          setRemainingTime(`${hours}h ${minutes}m ${seconds}s`);
        }
      } else {
        console.error('endTime no es un objeto Moment válido:', endTime);
      }
    }, 1000);
  
    return () => clearInterval(interval); 
  };
  const sendSuspensionStateToServer = async (isSuspended, endTime) => {
    try {
      const response = await axios.post('http://localhost:3001/api/pizzeria-settings', {
        is_suspended: isSuspended,
        suspension_end_time: endTime ? endTime.toISOString() : null
      });
      console.log('Respuesta del servidor:', response.data);
    } catch (error) {
      console.error('Error al enviar el estado de suspensión:', error);
    }
  };
  const handleSuspendService = () => {
    setIsSuspending(true);
  };
  const confirmSuspension = async () => {
    if (!suspendOption) {
      alert("Por favor, selecciona una opción de suspensión");
      return;
    }

    let endTime = null;
    if (suspendOption === '1min') {
      endTime = moment().tz('Europe/Madrid').add(1, 'minutes');  
    } else if (suspendOption === '30min') {
      endTime = moment().tz('Europe/Madrid').add(30, 'minutes');
    } else if (suspendOption === '60min') {
      endTime = moment().tz('Europe/Madrid').add(60, 'minutes');
    } else if (suspendOption === 'nextShift') {
      endTime = await calculateNextShift();  
    }

    setSuspensionState(true, endTime);
    console.log('Confirmando suspensión con hora de fin:', endTime);

    sendSuspensionStateToServer(true, endTime);

    calculateRemainingTime(endTime);

    setIsSuspending(false);
  };
  const calculateNextShift = async () => {
    const response = await axios.get('http://localhost:3001/api/horarios');
    const horariosDB = response.data; 
    
    const now = moment().tz('Europe/Madrid');
    let closestShift = null;
    let minDifference = Infinity; 

    horariosDB.forEach(horario => {
      const day = horario.Day.toLowerCase(); 
      const shiftStart = moment(`${now.format('YYYY-MM-DD')} ${horario.Hora_inicio}`, 'YYYY-MM-DD HH:mm').tz('Europe/Madrid');

      if (day !== now.format('dddd').toLowerCase()) {
        const nextDay = moment().day(day);
        if (nextDay.isBefore(now)) {
          nextDay.add(7, 'days');
        }
        const nextShiftStart = moment(`${nextDay.format('YYYY-MM-DD')} ${horario.Hora_inicio}`, 'YYYY-MM-DD HH:mm').tz('Europe/Madrid');
        const difference = nextShiftStart.diff(now, 'milliseconds');
        if (difference > 0 && difference < minDifference) {
          minDifference = difference;
          closestShift = nextShiftStart;
        }
      } else if (shiftStart.isAfter(now)) {
        const difference = shiftStart.diff(now, 'milliseconds');
        if (difference > 0 && difference < minDifference) {
          minDifference = difference;
          closestShift = shiftStart;
        }
      }
    });

    return closestShift;
  };
  const handleOpenTimeAttendanceModal = () => {
    setShowTimeAttendanceModal(true);
  };
  const handleCloseTimeAttendanceModal = () => {
    setShowTimeAttendanceModal(false);
  };
  const handleAuthentication = () => {
    setAuthenticated(true);
    setShowTimeAttendanceModal(false);
  };
  const handleSelectUbicacion = (event) => {
    const idSeleccionado = event.target.value;
  
    /* 1️⃣  Guardamos selección en estado + localStorage */
    setSelectedUbicacion(idSeleccionado);
    localStorage.setItem('dash_selectedUbicacion', idSeleccionado);
  
    console.log("📌 ID seleccionado:", idSeleccionado);
  
    /* 2️⃣  Traemos los datos de la empresa elegida */
    fetch(`http://localhost:3001/api/info-empresa/${idSeleccionado}`)
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
        return resp.json();
      })
      .then(response => {
        const empresa = response.data;
        if (!empresa) {
          console.error("❌ No se recibió información de la empresa:", response);
          return;
        }
  
        console.log("📌 Estado en DB:", empresa.estado);
        console.log("📍 Coordenadas:", empresa.ciudad_latitud, empresa.ciudad_longitud);
  
        /* 3️⃣  Actualizamos estado y coordenadas */
        setEstado(empresa.estado === 'activo');
        setSelectedLatitud(empresa.ciudad_latitud);
        setSelectedLongitud(empresa.ciudad_longitud);
      })
      .catch(err => console.error("❌ Error al obtener la empresa:", err));
  };
  const handleSaveLocation = () => {
    if (!selectedUbicacion) {
      console.error("❌ ID de ubicación no válido:", selectedUbicacion);
      return;
    }
  
    fetch(`http://localhost:3001/api/info-empresa/${selectedUbicacion}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: estado ? 'activo' : 'inactivo' })
    })
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
        return resp.json();
      })
      .then(responseData => {
        if (responseData.error) {
          console.error("❌ Error al actualizar la ubicación:", responseData.error);
          return;
        }
  
        console.log("✅ Ubicación actualizada:", responseData);
  
        /* 1️⃣  Cerramos modal */
        setShowLocationModal(false);
  
        /* 2️⃣  Persistimos la ubicación elegida */
        localStorage.setItem('dash_selectedUbicacion', selectedUbicacion);
      })
      .catch(err => console.error("❌ Error al actualizar la ubicación:", err));
  };
  const handleToggleEstado = () => {
    setEstado((prevEstado) => !prevEstado);
  };
  const handleVerifyPassword = async () => {
    try {
        const response = await fetch("http://localhost:3001/api/verificar-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: adminPassword })
        });

        const data = await response.json();

        if (data.success) {
            setShowPasswordModal(false);
            handleSuspendService();  // 🔥 Se ejecuta la suspensión si la contraseña es correcta
        } else {
            setPasswordError("Contraseña incorrecta");
        }
    } catch (error) {
        console.error("❌ Error en la autenticación:", error);
        setPasswordError("Error al verificar la contraseña");
    }
  };
  const handleOpenWarningModal = () => {
    setShowWarningModal(true);
  };
  const handleCloseWarningModal = () => {
    setShowWarningModal(false);
  };
  const handleConfirmWarnings = () => {
    console.log("✅ [LOG] Usuario confirmó las advertencias (sin localStorage).");
    setWarningsDashboard([]);
    setWarningActive(false);
    setShowWarningModal(false);
  };
  const fetchWeatherData = async (lat, lon) => {
    try {
      console.log("📡 Consultando clima para:", lat, lon);
      
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=7bce86c608f5e6da4ec8c8a3f60040e5&units=metric`
      );
  
      const data = response.data;
      console.log("🌦️ Datos climáticos recibidos:", data);
      
      setWeatherData(data);
      console.log("✅ Estado `weatherData` seteado:", data);
  
      if (data.rain || data.snow) {
        console.log("☔ Probabilidad alta de lluvia detectada.");
        setRainProbability(100);
      } else {
        setRainProbability(0);
      }
  
    } catch (error) {
      console.error("❌ Error al consultar el clima:", error);
    }
  };
  
  

  return (
    <div className="dashboard-container">
      <div className={`overlay ${isServiceSuspended ? 'active' : ''}`} />
      <div className="top-bar">
        <div className="icon-group">
        <div className="icon weather-icon" title="Clima" onClick={() => setShowWeatherModal(true)}>
          {rainProbability > 85 ? "🌧️" : "☀️"}
        </div>
          <div
            className={`icon calendar-icon ${
              scheduledOrders.length > 0 ? 'scheduled-active' : ''
            }`}
            title="Pedidos programados para hoy"
            onClick={() => setShowScheduledModal(true)}
          >
            📅
          </div>
          <div
          className={`icon warning-icon ${warningActive ? 'warning-active' : ''}`}
          onClick={() => setShowWarningModal(true)}
        >
          ⚠️
        </div>
          <div className="icon location-icon" 
            title="Location" 
            onClick={() => setShowLocationModal(true)}>
            🏠
          </div>
          <div 
            className="icon time-attendance-icon" 
            title="Marcaje de Horario"
            onClick={handleOpenTimeAttendanceModal}
          >
            🔃
          </div>
        </div>
      </div>
      {showScheduledModal && (
        <ScheduledOrdersModal
          orders={scheduledOrders}
          onClose={() => setShowScheduledModal(false)}
        />
      )}

  
      <div className="current-date">
      <h1>Pizzeria Dashboard</h1>
          <p>{currentDate.format('dddd, MMMM Do YYYY, HH:mm:ss')}</p>
      </div>
      <div className="dashboard-buttons">
        <div className="button-row">
          <button 
            className={`dashboard-button pedidos ${pendingOrders > 0 ? 'blinking' : ''}`}
            onClick={() => navigate('/view-order')}
            disabled={isServiceSuspended}
          >
            View orders {pendingOrders > 0 && `(${pendingOrders})`}
          </button>
          <button 
            className="dashboard-button ingredientes" 
            onClick={irAListaIngredientes} 
            disabled={isServiceSuspended}
          >
            Ingredient Management
          </button>
        </div>
        <div className="button-row">
          <button 
            onClick={() => navigate('/dashboard/drvco')} 
            className="dashboard-button datos-servicio"
          >
            Daily Reports
          </button>
  
          <button
            className={`dashboard-button route-setter ${nuevasRutasDisponibles ? 'blinking active-route' : ''}`}
            onClick={() => {
              console.log(`Navegando a RouteSetter. Rutas disponibles: ${cantidadRutas}`);
              navigate('/RouteSetter');
            }}
            disabled={isServiceSuspended} // 🔥 AHORA SOLO SE BLOQUEA SI EL SERVICIO ESTÁ SUSPENDIDO
            title={nuevasRutasDisponibles ? `Hay ${cantidadRutas} rutas nuevas por revisar` : 'Accede para gestionar repartidores'}
          >
            Route Setter
          </button>
        </div>
  
        <div className="suspender-servicio">
          {!isServiceSuspended ? (
              <button className="dashboard-button suspender" onClick={() => setShowPasswordModal(true)}>
                  Suspend Service
              </button>
          ) : (
              <button className="dashboard-button resume" onClick={() => {
                  setSuspensionState(false, null);
                  reanudarServicio();
              }}>
                  Resume Service
              </button>
          )}
      </div>
      {showPasswordModal && (
    <div className="modal-overlay">
        <div className="modal-content">
            <h2>🔒 Autenticación Requerida</h2>
            <p>Ingrese la contraseña del administrador para suspender el servicio.</p>

            <input
                type="password"
                placeholder="Contraseña"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
            />
            {passwordError && <p className="error-text">{passwordError}</p>}

            <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleVerifyPassword}>Confirmar</button>
            </div>
        </div>
    </div>
       )}
      </div>
  
      {showTimeAttendanceModal && (
        <div className="modal-overlay">
          <div className="modal-content time-attendance-modal">
          <TimeAttendanceModal 
          onClose={handleCloseTimeAttendanceModal} 
          onAuthenticate={handleAuthentication} 
        />
          </div>
        </div>
      )}
      {isSuspending && (
        <div className="suspension-confirmation">
          <p>¿Estás seguro de que quieres suspender el servicio?</p>
          <select onChange={(e) => setSuspendOption(e.target.value)} value={suspendOption}>
            <option value="">Selecciona una opción</option>
            <option value="1min">Suspender por 1 minuto (pruebas)</option>
            <option value="30min">Suspender por 30 minutos</option>
            <option value="60min">Suspender por 60 minutos</option>
            <option value="nextShift">Hasta la próxima jornada</option>
          </select>
          <button onClick={confirmSuspension}>Confirmar</button>
          <button onClick={() => setIsSuspending(false)}>Cancelar</button>
        </div>
      )}
      {showLocationModal && (
        <div className="modal-overlay">
          <div className="modal-content location-modal">
            <div className="modal-header">
              <h2>Seleccionar Ubicación Operativa</h2>
              <button className="close-button-ch" onClick={() => setShowLocationModal(false)}>Salir</button>
            </div>
            <div className="modal-body">
              <label htmlFor="ubicacionSelect">Elige la ubicación:</label>
              <select 
                id="ubicacionSelect" 
                value={selectedUbicacion || ''} 
                onChange={handleSelectUbicacion}
              >
                {ubicaciones.map((ubic) => (
                  <option key={ubic.id} value={ubic.id}>
                    {ubic.direccion} ({ubic.codigo_postal})
                  </option>
                ))}
              </select>
              <hr />
              <label className="switch-label">Estado:</label>
              <button
                className={`estado-button ${estado ? 'activo' : 'inactivo'}`}
                onClick={() => setEstado((prevEstado) => !prevEstado)} 
              >
                {estado ? 'Activo' : 'Inactivo'}
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowLocationModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveLocation}>Guardar</button>
            </div>
          </div>
        </div>
      )}
      {showWarningModal && (
        <div className="modal-overlay">
          <div className="modal-content warning-modal">
          <WarningModal
            warnings={warningsDashboard}
            onClose={handleCloseWarningModal}
            setWarningsDashboard={setWarningsDashboard}
            setWarningActive={setWarningActive}
          />
          </div>
        </div>
      )}
      {showScheduledModal && (
        <div className="modal-overlay">
          <div className="modal-content scheduled-modal">
            <ScheduledOrdersModal
              orders={scheduledOrders}
              onClose={() => setShowScheduledModal(false)}
            />
          </div>
        </div>
      )}
      {showWeatherModal && (
        <div className="modal-overlay">
          <div className="modal-content weather-modal">
            <div className="modal-header">
              <h2>🌦️ Clima Actual</h2>
              <button className="close-button-ch" onClick={() => setShowWeatherModal(false)}>
                Cerrar
              </button>
            </div>

            <div className="modal-body">
            {weatherData ? (
                <>
                  <p><strong>Ubicación:</strong> {weatherData.name}</p>
                  <p><strong>Temperatura:</strong> {Math.round(weatherData.main.temp)}°C</p>
                  <p><strong>Clima:</strong> {weatherData.weather[0].description}</p>
                  {rainProbability >= 85 && (
                    <p style={{ color: 'red' }}>⚠️ Alta probabilidad de lluvia</p>
                  )}
                </>
              ) : (
                <p>No hay datos climáticos disponibles.</p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowWeatherModal(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
};

export default PizzariaDashboard;