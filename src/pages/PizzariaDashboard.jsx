import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';  
import axios from 'axios';
import { _PizzaContext } from './_PizzaContext';
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
  const { isServiceSuspended, suspensionEndTime, setSuspensionState } = useContext(_PizzaContext);

  const navigate = useNavigate();  

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(moment().tz('Europe/Madrid'));
    }, 1000); // Actualiza cada segundo

    return () => clearInterval(interval); // Limpia el intervalo al desmontar el componente
  }, []);

  // Nueva función para redirigir al usuario a la página de gestión de ingredientes
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

  useEffect(() => {
    loadSuspensionState();
    loadHorarios();
    loadPendingOrders(); 
    const interval = setInterval(loadPendingOrders, 5000); // Polling cada 5 segundos

    return () => clearInterval(interval); // Limpiar el intervalo cuando se desmonta el componente
  }, []);  

  return (
    <div className="dashboard-container">
      <div className={`overlay ${isServiceSuspended ? 'active' : ''}`} /> {/* Añadido overlay */}
      <div className="top-bar">
        <div className="icon-group">
          <div className="icon weather-icon">🌤️</div>
          <div className="icon warning-icon">⚠️</div>
          <div className="icon calendar-icon">📅</div>
        </div>
        <div className="current-date">
          <p>{currentDate.format('dddd, MMMM Do YYYY, HH:mm:ss')}</p>
        </div>
      </div>
      
      {isServiceSuspended && (
        <div className="suspension-notice">
          <p>Servicio suspendido. {remainingTime}</p>
        </div>
      )}
      <h1>Pizzeria Dashboard</h1>
      <div className="dashboard-buttons">
        <div className="button-row">
          <button 
            className={`dashboard-button pedidos ${pendingOrders > 0 ? 'blinking' : ''}`}
            onClick={() => navigate('/view-order')}
            disabled={isServiceSuspended}
          >
            View orders {pendingOrders > 0 && `(${pendingOrders})`}
          </button>
          <button className="dashboard-button ingredientes" onClick={irAListaIngredientes} disabled={isServiceSuspended}>
            Ingredient Management
          </button>
        </div>
        <div className="button-row">
          <button className="dashboard-button datos-servicio" disabled={isServiceSuspended}>Daily Reports</button>
          <button
            className="dashboard-button route-setter"
            onClick={() => navigate('/RouteSetter')} // Navega al componente RouteSetter
            disabled={isServiceSuspended}
          >
            Route Setter
          </button>
        </div>
        <div className="suspender-servicio">
          {!isServiceSuspended ? (
            <button className="dashboard-button suspender" onClick={handleSuspendService}>Suspend Service</button>
          ) : (
            <button className="dashboard-button resume" onClick={() => {
              setSuspensionState(false, null);
              reanudarServicio();
            }}>Resume Service</button>
          )}
        </div>
      </div>
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
    </div>
  );
};

export default PizzariaDashboard;
