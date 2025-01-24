import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { _PizzaContext } from './_PizzaContext';
import ReviewForm from '../components/ReviewForm';
import DailyChallengeCard from '../pages/DailyChallengeCard';
import axios from 'axios';
import '../styles/CustomerPage.css';
import { Tooltip } from 'react-tooltip';
import moment from 'moment';
import 'moment/locale/es';
import PizzaCarousel from './PizzaCarousel';

const OfferCard = ({ offer, cuponesUsados = [], setCuponesUsados, setCompra, compra }) => {
  const { sessionData } = useContext(_PizzaContext);
  const [cuponesDisponibles, setCuponesDisponibles] = useState(offer.Cupones_Disponibles);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeBlocked, setIsTimeBlocked] = useState(false);
  const [nextAvailableDay, setNextAvailableDay] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState(''); 
  const [showNeonEffect, setShowNeonEffect] = useState(false); 
  const [isCouponApplied, setIsCouponApplied] = useState(false);


  useEffect(() => {
    checkExtraConditions();
    checkTimeAvailability(); 
  }, [offer, sessionData]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const calculateTimeLeft = (timeInSeconds) => {
    const duration = moment.duration(timeInSeconds, 'seconds');
    return {
      hours: Math.floor(duration.asHours()),
      minutes: Math.floor(duration.minutes()),
      seconds: Math.floor(duration.seconds()),
    };
  };
  const checkTimeAvailability = () => {
    let currentDay = moment().format('dddd').toLowerCase();
    const currentTime = moment();

    currentDay = removeAccents(currentDay);
    const horaInicio = moment(offer.Hora_Inicio, 'HH:mm');
    const horaFin = moment(offer.Hora_Fin, 'HH:mm');

    const diasActivos = JSON.parse(offer.Dias_Activos).map(removeAccents);

    if (diasActivos.includes(currentDay)) {
        if (currentTime.isBefore(horaInicio)) {
            // Antes de la hora inicio
            setTimeLeft(horaInicio.diff(currentTime, 'seconds'));
            setIsTimeBlocked(true);
            setBlockReason(
                <>
                    Disponible desde:
                    <br />
                    las {offer.Hora_Inicio} Hrs
                </>
            );
        } else if (currentTime.isBetween(horaInicio, horaFin)) {
            // Entre hora inicio y hora fin
            setTimeLeft(horaFin.diff(currentTime, 'seconds'));
            setIsTimeBlocked(false);
            setBlockReason(`Disponible hasta las ${offer.Hora_Fin}`);
        } else {
            // Después de la hora fin
            if (offer.Tipo_Cupon === "permanente") {
                resetCoupons(); // Llama al método para resetear los cupones
            }
            setIsTimeBlocked(true);
            calculateNextCycle();
        }
    } else {
        // Día no activo
        setIsTimeBlocked(true);
        calculateNextCycle();
    }
  };
  const resetCoupons = () => {
  axios
      .patch(`http://localhost:3001/api/offers/${offer.Oferta_Id}/reset-coupons`, {
          Cupones_Disponibles: offer.Cupones_Asignados,
      })
      .then(() => {
          setCuponesDisponibles(offer.Cupones_Asignados);
          console.log("Cupones disponibles reseteados correctamente.");
      })
      .catch((error) => {
          console.error("Error al resetear los cupones disponibles:", error);
      });
  };
  const calculateNextCycle = () => {
    const currentDayIndex = moment().day(); 
    const currentHour = moment().hour(); 
    const currentMinute = moment().minute(); 
    const diasActivos = JSON.parse(offer.Dias_Activos).map(removeAccents);
  
    let nextDayIndex = null;
   console.log(offer)
    // Iterar para encontrar el próximo día activo
    for (let i = 0; i < 7; i++) {
      const checkDay = (currentDayIndex + i) % 7;
      if (diasActivos.includes(removeAccents(moment().day(checkDay).format('dddd').toLowerCase()))) {
        nextDayIndex = checkDay;
  
        // Verificar si el día encontrado es hoy y ya pasó la Hora_Fin
        if (i === 0) {
          const [endHour, endMinute] = offer.Hora_Fin.split(':').map(Number);
          if (currentHour > endHour || (currentHour === endHour && currentMinute >= endMinute)) {
            continue; // Saltar al próximo día si la oferta ya terminó hoy
          }
        }
  
        break;
      }
    }
  
    if (nextDayIndex !== null) {
      // Calcular el momento exacto del próximo ciclo
      const nextDay = moment()
        .day(nextDayIndex)
        .startOf('day')
        .set({
          hour: offer.Hora_Inicio.split(':')[0],
          minute: offer.Hora_Inicio.split(':')[1],
        });
  
      // Si el día es hoy pero la hora ya pasó, ajustar al próximo día activo
      if (nextDay.isBefore(moment())) {
        nextDay.add(1, 'week'); // Avanzar una semana al próximo ciclo válido
      }
  
      const formattedDay = nextDay.format('ddd');
      const formattedDate = nextDay.format('DD/MM/YY');
  
      setNextAvailableDay(`${formattedDay} ${formattedDate}`);
      setTimeLeft(nextDay.diff(moment(), 'seconds'));
      setBlockReason(
        <>
          Disponible el próximo:
          <br />
          {formattedDay} {formattedDate}
        </>
      );
    }
  };
  const checkExtraConditions = () => {
    if (offer.Condiciones_Extras === "false" || !offer.Condiciones_Extras) {
      setIsBlocked(false);
      return;
    }

    const userTicketPromedio = parseFloat(sessionData?.ticketPromedio || 0);
    const requiredTicketPromedio = parseFloat(offer.Ticket_Promedio || 0);
    const userNumeroCompras = parseInt(sessionData?.numeroDeCompras || 0);
    const requiredNumeroCompras = parseInt(offer.Numero_Compras || 0);
    const userDiasUcompra = parseInt(sessionData?.Dias_Ucompra || 0);
    const requiredDiasUcompra = parseInt(offer.Dias_Ucompra || 0);

    let reason = ''; 

    if (userTicketPromedio < requiredTicketPromedio) {
      reason = `Bloqueado: El ticket promedio del usuario (${userTicketPromedio}) no cumple el requerido (${requiredTicketPromedio}).`;
      setBlockReason(reason);
      setIsBlocked(true);
      return;
    }

    if (userNumeroCompras < requiredNumeroCompras) {
      reason = `Bloqueado: El número de compras del usuario (${userNumeroCompras}) no cumple el requerido (${requiredNumeroCompras}).`;
      setBlockReason(reason);
      setIsBlocked(true);
      return;
    }

    if (userDiasUcompra < requiredDiasUcompra) {
      reason = `Bloqueado: Los días desde la última compra del usuario (${userDiasUcompra}) no cumplen el requerido (${requiredDiasUcompra}).`;
      setBlockReason(reason);
      setIsBlocked(true);
      return;
    }

    setBlockReason(''); 
    setIsBlocked(false);
  };
  const getRandomDiscount = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  const handleUseCoupon = async () => {
    const currentTime = moment();
    const horaInicio = moment(offer.Hora_Inicio, "HH:mm");
    const horaFin = moment(offer.Hora_Fin, "HH:mm");
  
    if (!currentTime.isBetween(horaInicio, horaFin)) {
      alert("El cupón solo está disponible dentro del horario permitido.");
      return;
    }
  
    if (cuponesUsados.length > 0) {
      alert("Solo puedes usar un cupón por sesión.");
      return;
    }
  
    const descuentoAleatorio = getRandomDiscount(
      offer.Min_Descuento_Percent,
      offer.Max_Descuento_Percent
    );
  
    try {
      const response = await axios.patch(
        `http://localhost:3001/api/offers/${offer.Oferta_Id}/use-coupon`
      );
  
      const updatedCuponesDisponibles = response.data.data.Cupones_Disponibles;
      setCuponesDisponibles(updatedCuponesDisponibles);
  
      const newCoupon = {
        Oferta_Id: offer.Oferta_Id,
        Descuento: descuentoAleatorio / 100,
        Max_Amount: offer.Max_Amount,
        PrecioCupon: offer.Precio_Cupon,
      };
  
      setCuponesUsados([...cuponesUsados, newCoupon]);
  
      setCompra((prevCompra) => ({
        ...prevCompra,
        cupones: [...(prevCompra.cupones || []), newCoupon],
      }));
  
      setIsCouponApplied(true);
      setTimeout(() => setIsCouponApplied(false), 1000); 
    } catch (error) {
      console.error("Error al utilizar el cupón:", error);
      alert(
        "No se pudo utilizar el cupón. Posiblemente ya no hay cupones disponibles."
      );
    }
  };
  const renderTimeLeft = () => {
    if (cuponesDisponibles === 0) {
        return (
            <>
                Sold Out
                <br />
                🚫🚫🚫
            </>
        );
    }
    
    if (isTimeBlocked) {
        // Mostrar mensaje según el estado de bloqueo
        if (blockReason) {
            return blockReason; // "Disponible desde" o "Disponible el próximo"
        }
    } else {
        // Si no está bloqueado, mostrar cuenta regresiva
        const { hours, minutes, seconds } = calculateTimeLeft(timeLeft);
        return (
            <>
                Disponible hasta:
                <br />
                {hours}h {minutes}m {seconds}s
            </>
        );
    }
    return '';
  };
  const renderDiscountRange = () => {
    if (offer.Min_Descuento_Percent && offer.Max_Descuento_Percent) {
      return `${offer.Min_Descuento_Percent}% - ${offer.Max_Descuento_Percent}% Descuento`;
    }
    return `${offer.Descuento_Percent}% Descuento`;
  };

  return (
    <div className="offer-card-container">
      {showNeonEffect && (
        <div className="neon-glow1">
          ¡Cupón Aplicado con Éxito!
        </div>
      )}
      {/* Resto del contenido */}
      <div
        className={`offer-card ${isBlocked ? "blocked" : "active"}`}
        style={{
          backgroundImage: `url(http://localhost:3001${offer.Imagen})`,
          backgroundSize: "500px 500px",
          backgroundPosition: "center",
        }}
      >
        <div className="offer-overlay"></div>
        <div className={`offer-content ${isBlocked ? "blurred" : ""}`}>
          <h3>{offer.Codigo_Oferta}</h3>
          <p>¡Quedan <strong>{cuponesDisponibles} </strong>Cupones!</p>
          <p>{renderDiscountRange()}</p>
          <p>
            Precio:
            {offer.Categoria_Cupon === "gratis"
              ? "Today Free"
              : `Today ${offer.Precio_Cupon || 0}€`}
          </p>
  
          <button
            className={`offer-button ${isCouponApplied ? "button-neon" : "button-default"}`}
            onClick={handleUseCoupon}
            disabled={isBlocked || isTimeBlocked || cuponesDisponibles === 0}
          >
            Usar Cupón
          </button>
  
          {!isBlocked && (
            <div className="expiration-info">
              <p className="time-left">{renderTimeLeft()}</p>
            </div>
          )}
  
          {isBlocked && (
            <div
              className="lock-icon"
              data-tooltip-id="tooltip"
              data-tooltip-content={blockReason || "Este cupón está bloqueado"}
            >
              <p>🔒</p>
            </div>
          )}
  
          <Tooltip
            id="tooltip"
            place="top"
            type="dark"
            effect="solid"
            className="custom-tooltip"
          />
        </div>
      </div>
    </div>
  );  
};
const OffersSection = ({ offers, cuponesUsados, setCuponesUsados, setCompra, compra }) => {
  const offersRef = useRef(null);

  let isDragging = false;
  let startX;
  let scrollLeft;

  const handleMouseDown = (e) => {
    isDragging = true;
    startX = e.pageX - offersRef.current.offsetLeft;
    scrollLeft = offersRef.current.scrollLeft;
  };

  const handleMouseLeaveOrUp = () => {
    isDragging = false;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - offersRef.current.offsetLeft;
    const walk = (x - startX) * 3; 
    offersRef.current.scrollLeft = scrollLeft - walk;
  };

 
  const filteredOffers = offers.filter(
    (offer) => offer.Tipo_Oferta === 'Normal' && offer.Estado === 'Activa'
  );
  

  return (
    <div
      className="offers-section"
      ref={offersRef}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeaveOrUp}
      onMouseUp={handleMouseLeaveOrUp}
      onMouseMove={handleMouseMove}
    >
      {filteredOffers.map((offer) => (
        <OfferCard
          key={offer.Oferta_Id}
          offer={offer}
          cuponesUsados={cuponesUsados}
          setCuponesUsados={setCuponesUsados}
          setCompra={setCompra}
          compra={compra}
        />
      ))}
    </div>
  );
};
const NotificationTicker = () => {
  const [incentiveMessage, setIncentiveMessage] = useState('');
  const [offerMessages, setOfferMessages] = useState('');
  const [closingMessage, setClosingMessage] = useState('');

  useEffect(() => {
    const fetchActiveIncentives = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/incentivos');
        const incentives = Array.isArray(response.data) ? response.data : [];
        const activeIncentives = incentives.filter((incentive) => incentive.activo === 1);

        if (activeIncentives.length > 0) {
          const messages = activeIncentives.map(
            (incentive) =>
              `🎁 Disfruta de un <span class="incentive-animated">${incentive.incentivo}</span> en compras mayores a ${incentive.TO_minimo} EUR.`
          );
          setIncentiveMessage(messages.join(' | '));
        } else {
          setIncentiveMessage('🎁 No hay incentivos activos en este momento.');
        }
      } catch (error) {
        console.error('Error al obtener incentivos:', error);
        setIncentiveMessage('⚠️ Hubo un problema al cargar los incentivos.');
      }
    };

    const fetchOffers = async () => {
      try {
        const response = await axios.get('http://localhost:3001/ofertas');
        const offers = Array.isArray(response.data.data) ? response.data.data : [];
        const activeOffers = offers.filter((offer) => offer.Estado === 'Activa');
        const messages = [];

        // DailyChallenge
        const dailyChallengeOffers = activeOffers.filter((offer) => offer.Tipo_Oferta === 'DailyChallenge');
        if (dailyChallengeOffers.length > 0) {
          const bestDailyChallenge = dailyChallengeOffers.reduce((prev, current) =>
            prev.Max_Descuento_Percent > current.Max_Descuento_Percent ? prev : current
          );
          messages.push(
            `🏆 Participa en el <span class="daily-challenge-animated">DailyChallenge</span> para obtener hasta un ${bestDailyChallenge.Max_Descuento_Percent}% de descuento!`
          );
        }

        // RandomPizza
        const randomPizzaOffers = activeOffers.filter((offer) => offer.Tipo_Oferta === 'Random Pizza');
        if (randomPizzaOffers.length > 0) {
          const bestRandomPizza = randomPizzaOffers.reduce((prev, current) =>
            prev.Max_Descuento_Percent > current.Max_Descuento_Percent ? prev : current
          );
          messages.push(
            `🍕 Anímate a crear una <span class="random-pizza-animated">Random Pizza</span> y obtén hasta un ${bestRandomPizza.Max_Descuento_Percent}% menos!`
          );
        }

        // Delivery Free Pass
        const deliveryOffers = activeOffers.filter((offer) => offer.Tipo_Oferta === 'Delivery Free Pass');
        if (deliveryOffers.length > 0) {
          messages.push(
            `🚚 Consigue un <span class="delivery-free-pass-animated">Delivery Free Pass</span> hoy mismo!`
          );
        }

        setOfferMessages(messages.join(' | '));
      } catch (error) {
        console.error('Error al obtener las ofertas:', error);
        setOfferMessages('⚠️ No se pudo cargar la información de las ofertas.');
      }
    };

    const fetchClosingTime = async () => {
      try {
        const dayMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const today = new Date().getDay();
        const dayName = dayMap[today];

        const response = await axios.get(`http://localhost:3001/api/horarios/${dayName}`);
        if (response.data.length > 0) {
          const { Hora_fin } = response.data[0];
          setClosingMessage(
            `⏰ Hoy cerramos a las ${Hora_fin} hrs. <span class="closing-time-animated">¡Haz tu pedido a tiempo!</span>`
          );
        } else {
          setClosingMessage('⚠️ No hay información de horarios para hoy.');
        }
      } catch (error) {
        console.error('Error al obtener el horario de cierre:', error);
        setClosingMessage('⚠️ Hubo un problema al cargar el horario de cierre.');
      }
    };

    fetchActiveIncentives();
    fetchOffers();
    fetchClosingTime();
  }, []);

  return (
    <div className="notification-ticker" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <marquee behavior="scroll" direction="left" scrollamount="10">
        <span dangerouslySetInnerHTML={{ __html: `${closingMessage} | ${incentiveMessage} | ${offerMessages}` }} />
      </marquee>
      <style>
        {`
          .closing-time-animated {
            animation: drop 1s ease-out;
            color: #d60404;
            font-weight: bold;
          }

          @keyframes drop {
            0% {
              transform: translateY(-100%);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }

       

          @keyframes color-change {
            0% {
              color: #d60404;
            }
            25% {
              color: #fa3939;
            }
            50% {
              color: #f2a6a0;
            }
            75% {
              color: #fa3939;
            }
            100% {
              color: #d60404;
            }
          }

          .random-pizza-animated {
            display: inline-block;
            animation: bounce 1.5s infinite;
            color: #d60404;
            font-weight: bold;
          }

          .daily-challenge-animated {
            display: inline-block;
            animation: fade 2s infinite;
            color: #d60404;
            font-weight: bold;
          }

 .incentive-animated {
  position: relative;
  font-weight: bold;
  color: #d60404;
  display: inline-block;
  animation: float 2s infinite ease-in-out;
}

.incentive-animated::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 2px;
  background: #d60404;
  bottom: -2px;
  left: 0;
  animation: slide-in-out 2s infinite ease-in-out;
}

@keyframes slide-in-out {
  0% {
    width: 0;
  }
  50% {
    width: 100%;
  }
  100% {
    width: 0;
  }
}

@keyframes float {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
  100% {
    transform: translateY(0);
  }
}



          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-10px);
            }
            60% {
              transform: translateY(-5px);
            }
          }

          @keyframes fade {
            0% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
            100% {
              opacity: 1;
            }
          }

          @keyframes pulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
};




const CustomerPage = (offer) => {
  const { sessionData, activePizzas, isServiceSuspended, suspensionEndTime, setSuspensionState } = useContext(_PizzaContext);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [showDailyChallenge, setShowDailyChallenge] = useState(false);
  const [userCoupon, setUserCoupon] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [offers, setOffers] = useState([]);
  const [loadingPizzas, setLoadingPizzas] = useState(true);
  const [hasCoupon, setHasCoupon] = useState(false);
  const [cuponesUsados, setCuponesUsados] = useState([]);
  const [selectedPizza, setSelectedPizza] = useState(null);
  const [cuponesDisponibles, setCuponesDisponibles] = useState(null);
  const [isRandomPizzaEnabled, setIsRandomPizzaEnabled] = useState(false);
  const [randomPizzaTooltip, setRandomPizzaTooltip] = useState('');
  const [cuponesRandomPizza, setCuponesRandomPizza] = useState(0);
  const [cuponesDailyChallenge, setCuponesDailyChallenge] = useState(0);
  const [dailyChallengeTooltip, setDailyChallengeTooltip] = useState("");
  const [isDailyChallengeEnabled, setIsDailyChallengeEnabled] = useState(false);
  const [compra, setCompra] = useState({
    id_orden: '',
    fecha: moment().format('YYYY-MM-DD'),
    hora: moment().format('HH:mm:ss'),
    id_cliente: sessionData?.id_cliente || '',
    DescuentosDailyChallenge: 0,
    cupones: [],
    venta: [],
    Delivery: { opcion: false, costo: 0 },
    total_sin_descuento: 0,
    total_descuentos: 0,
    origen: ''
  });
  const navigate = useNavigate();
  const renderSuspensionMessage = () => {
    if (isServiceSuspended && suspensionEndTime) {
      const endTimeMoment = moment(suspensionEndTime);
      const now = moment();
      const timeLeft = endTimeMoment.diff(now, 'seconds');

      const duration = moment.duration(timeLeft, 'seconds');
      const hours = Math.floor(duration.asHours());
      const minutes = Math.floor(duration.minutes());
      const seconds = Math.floor(duration.seconds());

      let message = `🚫 El servicio está suspendido`;

      if (now.isSame(endTimeMoment, 'day')) {
        message += ` hasta las ${endTimeMoment.format('HH:mm')}.`;
      } else {
        message += ` hasta el próximo ${endTimeMoment.format('dddd')} a las ${endTimeMoment.format('HH:mm')}.`;
      }

      return (
        <div className="suspension-modal">
          <div className="suspension-content">
            <h2>{message}</h2>
            <p>Tiempo restante: {hours}h {minutes}m {seconds}s</p>
          </div>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
  const checkSuspensionStatus = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/pizzeria-settings');
      const { is_suspended, suspension_end_time } = response.data;
      // console.log("Valores recibidos desde la API para verificar estado de suspensión:", is_suspended, suspension_end_time);

      // Actualizar el contexto con los datos del servidor
      setSuspensionState(is_suspended, suspension_end_time ? moment(suspension_end_time) : null);
    } catch (error) {
      console.error('Error al verificar el estado de suspensión:', error);
    }
  };

  checkSuspensionStatus();  // Llamar a la función al montar el componente

  const interval = setInterval(checkSuspensionStatus, 10000); // Verificar cada minuto por ejemplo
  return () => clearInterval(interval);  // Limpiar el intervalo cuando el componente se desmonte
  }, []);
  useEffect(() => {
    if (isServiceSuspended) {
      // console.log('🔴 El servicio está suspendido.');
    } else {
      // console.log('🟢 El servicio NO está suspendido.');
    }
  
    if (suspensionEndTime) {
      console.log(`⏰ El servicio está suspendido hasta: ${suspensionEndTime}`);
    }
  }, [isServiceSuspended, suspensionEndTime]);
  useEffect(() => {
    if (isServiceSuspended && suspensionEndTime) {
      const interval = setInterval(() => {
        // No necesitamos hacer nada aquí. El componente se actualizará automáticamente.
      }, 1000);
      return () => clearInterval(interval); // Limpiar el intervalo cuando el componente se desmonte
    }
  }, [isServiceSuspended, suspensionEndTime]);
  useEffect(() => {
    if (sessionData) {
       console.log('Datos de la sesión:', sessionData);
    }
  }, [sessionData]);
  useEffect(() => {
    // console.log('Estado de la compra actualizado:', compra);
  }, [compra]);
  useEffect(() => {
    axios
      .get('http://localhost:3001/api/reviews')
      .then((response) => {
        setReviews(response.data);
        if (response.data.length > 0) {
          const sumRatings = response.data.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating((sumRatings / response.data.length).toFixed(1));
        }
      })
      .catch((error) => {
        console.error('Error al obtener los reviews:', error);
      });
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentReviewIndex((prevIndex) => (prevIndex + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [reviews]);
  useEffect(() => {
    const obtenerOfertas = async () => {
      if (sessionData?.segmento) {
        try {
          const response = await axios.get(`http://localhost:3001/ofertas/${sessionData.segmento}`);
          const { data } = response.data;

          // console.log('Datos de las ofertas recibidas:', data);

          moment.locale('es');
          let currentDay = moment().format('dddd').toLowerCase();
          currentDay = removeDiacritics(currentDay);

          // console.log('Día actual formateado:', currentDay);

          const ofertasFiltradas = data.filter(({ Estado, Dias_Activos }) => {
            const diasActivos = JSON.parse(Dias_Activos);
            // console.log('Días activos de la oferta:', diasActivos);
            return Estado === 'Activa' && diasActivos.includes(currentDay);
          });

          if (ofertasFiltradas.length > 0) {
            setOffers(ofertasFiltradas);
            // console.log('Ofertas filtradas:', ofertasFiltradas);
          } else {
            setOffers([]);
          }
        } catch (error) {
          console.error('Error al obtener las ofertas:', error);
        }
      }
    };
    obtenerOfertas();
  }, [sessionData]);
  useEffect(() => {
    if (activePizzas.length > 0) {
      setLoadingPizzas(false);
    }
  }, [activePizzas]);
  useEffect(() => {
    const fetchCuponesDisponibles = async () => {
      try {
        const response = await axios.get('http://localhost:3001/ofertas');
  
        // Buscar oferta de Random Pizza
        const ofertaPizzaRara = response.data.data.find(
          (oferta) => oferta.Tipo_Oferta === 'Random Pizza'
        );
        if (ofertaPizzaRara) {
          setCuponesDisponibles(ofertaPizzaRara.Cupones_Disponibles);
        } else {
          setCuponesDisponibles(0); // En caso de que no haya una oferta activa
        }
  
        // Calcular la suma total de cupones para DailyChallenge activos
        const dailyChallengeCupones = response.data.data
          .filter(
            (oferta) =>
              oferta.Tipo_Oferta === 'DailyChallenge' && oferta.Estado === 'Activa'
          )
          .reduce((sum, oferta) => sum + (oferta.Cupones_Disponibles || 0), 0);
  
        setCuponesDailyChallenge(dailyChallengeCupones); // Actualizar el estado
      } catch (error) {
        console.error('Error al obtener la cantidad de cupones:', error);
      }
    };
    fetchCuponesDisponibles();
  }, []);
  useEffect(() => {
    const checkRandomPizzaAvailability = () => {
      if (!offers || offers.length === 0) return;
  
      // Filtrar únicamente las ofertas de tipo Random Pizza
      const randomPizzaOffers = offers.filter((offer) => offer.Tipo_Oferta === 'Random Pizza');
      if (randomPizzaOffers.length === 0) {
        setIsRandomPizzaEnabled(false);
        setRandomPizzaTooltip('No hay ofertas disponibles actualmente.');
        setCuponesRandomPizza(0); // Usar el estado específico
        return;
      }
  
      // Selecciona la primera oferta válida
      const ofertaPizzaRara = randomPizzaOffers[0];
      const currentTime = moment();
      const horaInicio = moment(ofertaPizzaRara.Hora_Inicio, 'HH:mm');
      const horaFin = moment(ofertaPizzaRara.Hora_Fin, 'HH:mm');
  
      // Validaciones
      if (ofertaPizzaRara.Cupones_Disponibles === 0 && currentTime.isBefore(horaFin)) {
        setIsRandomPizzaEnabled(false);
        setRandomPizzaTooltip('Sold Out!');
      } else if (currentTime.isBefore(horaInicio)) {
        setIsRandomPizzaEnabled(false);
        setRandomPizzaTooltip(`Disponible a partir de las ${ofertaPizzaRara.Hora_Inicio}`);
      } else if (currentTime.isAfter(horaFin)) {
        if (ofertaPizzaRara.Tipo_Cupon === 'permanente') {
          resetCoupons(ofertaPizzaRara);
        }
        const nextCycle = calculateNextCycle(ofertaPizzaRara);
        setIsRandomPizzaEnabled(false);
        setRandomPizzaTooltip(`Disponible el próximo ${nextCycle}`);
      } else {
        setIsRandomPizzaEnabled(true);
        setRandomPizzaTooltip('');
      }
  
      // Actualizar los cupones específicos para Random Pizza
      setCuponesRandomPizza(ofertaPizzaRara.Cupones_Disponibles || 0);
    };
  
    checkRandomPizzaAvailability();
  }, [offers]);
  
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axios.get("http://localhost:3001/ofertas");
        const allOffers = response.data.data;
  
        // Obtener el día actual en texto
        const currentDay = removeDiacritics(moment().format("dddd").toLowerCase());
        const currentTime = moment();
  
        // Ajustar la validación del día activo en Daily Challenge
        const dailyChallengeOffer = allOffers.find(
          (offer) =>
            offer.Tipo_Oferta === "DailyChallenge" &&
            offer.Estado === "Activa" &&
            JSON.parse(offer.Dias_Activos).map(removeDiacritics).includes(currentDay)
        );
  
        if (dailyChallengeOffer) {
          setDailyChallenge(dailyChallengeOffer);
          setCuponesDailyChallenge(dailyChallengeOffer.Cupones_Disponibles || 0);
  
          const startTime = moment(dailyChallengeOffer.Hora_Inicio, "HH:mm");
          const endTime = moment(dailyChallengeOffer.Hora_Fin, "HH:mm");
  
          if (dailyChallengeOffer.Cupones_Disponibles === 0) {
            setIsDailyChallengeEnabled(false);
            setDailyChallengeTooltip("Sold Out!");
          } else if (currentTime.isBefore(startTime)) {
            setIsDailyChallengeEnabled(false);
            setDailyChallengeTooltip(
              `Disponible a partir de las ${dailyChallengeOffer.Hora_Inicio}`
            );
          } else if (currentTime.isAfter(endTime)) {
            if (dailyChallengeOffer.Tipo_Cupon === "permanente") {
              resetCoupons(dailyChallengeOffer);
            }
            const nextCycle = calculateNextCycle(dailyChallengeOffer);
            setIsDailyChallengeEnabled(false);
            setDailyChallengeTooltip(`Disponible el próximo ${nextCycle}`);
          } else {
            setIsDailyChallengeEnabled(true);
            setDailyChallengeTooltip("");
          }
        } else {
          setDailyChallenge(null);
          setCuponesDailyChallenge(0);
          setIsDailyChallengeEnabled(false);
          setDailyChallengeTooltip("No hay retos disponibles actualmente.");
        }
  
        // Random Pizza Logic
        const randomPizzaOffer = allOffers.find(
          (offer) => offer.Tipo_Oferta === "Random Pizza"
        );
  
        if (randomPizzaOffer) {
          setCuponesDisponibles(randomPizzaOffer.Cupones_Disponibles || 0);
  
          const startTime = moment(randomPizzaOffer.Hora_Inicio, "HH:mm");
          const endTime = moment(randomPizzaOffer.Hora_Fin, "HH:mm");
  
          if (randomPizzaOffer.Cupones_Disponibles === 0) {
            setIsRandomPizzaEnabled(false);
            setRandomPizzaTooltip("Sold Out!");
          } else if (currentTime.isBefore(startTime)) {
            setIsRandomPizzaEnabled(false);
            setRandomPizzaTooltip(
              `Disponible a partir de las ${randomPizzaOffer.Hora_Inicio}`
            );
          } else if (currentTime.isAfter(endTime)) {
            if (randomPizzaOffer.Tipo_Cupon === "permanente") {
              resetCoupons(randomPizzaOffer);
            }
            const nextCycle = calculateNextCycle(randomPizzaOffer);
            setIsRandomPizzaEnabled(false);
            setRandomPizzaTooltip(`Disponible el próximo ${nextCycle}`);
          } else {
            setIsRandomPizzaEnabled(true);
            setRandomPizzaTooltip("");
          }
        } else {
          setIsRandomPizzaEnabled(false);
          setRandomPizzaTooltip("No hay ofertas disponibles actualmente.");
        }
  
        setOffers(allOffers);
      } catch (error) {
        console.error("Error al obtener las ofertas:", error);
      }
    };
  
    fetchOffers();
  }, []);
  
  

  
  const handlePizzaSelect = (pizza) => {
    setSelectedPizza(pizza); 
    navigate('/customerMenu', { 
      state: { 
        selectedPizza: pizza, 
        compra: compra // Pasar el estado completo de la compra
      } 
    }); 
  };
  const handleApplyCoupon = (offer) => {
    const descuentoAleatorio =
      offer.Min_Descuento_Percent === offer.Max_Descuento_Percent
        ? offer.Min_Descuento_Percent
        : Math.floor(
            Math.random() * (offer.Max_Descuento_Percent - offer.Min_Descuento_Percent + 1) +
            offer.Min_Descuento_Percent
          );
  
    const precioCupon = offer.Precio_Cupon || 0;
  
    setCompra((prevCompra) => {
      const descuentoDecimal = descuentoAleatorio / 100;
      const descuentoAplicado = Math.min(
        prevCompra.total_sin_descuento * descuentoDecimal,
        offer.Max_Amount
      );
  
      const nuevoCupon = {
        Oferta_Id: offer.Oferta_Id,
        Descuento: descuentoDecimal,
        Max_Amount: offer.Max_Amount,
        PrecioCupon: precioCupon,
        Tipo_Oferta: offer.Tipo_Oferta,
      };
  
      return {
        ...prevCompra,
        cupones: [...(prevCompra.cupones || []), nuevoCupon],
        total_descuentos: prevCompra.total_descuentos + descuentoAplicado + precioCupon,
      };
    });
  };
  const handleClaimCoupon = ({ igLink, igUsername }) => {
    if (!dailyChallenge || !sessionData || !sessionData.id_cliente) {
        console.error('❌ Error: Datos incompletos para reclamar el cupón.');
        setErrorMessage('Datos incompletos para reclamar el cupón.');
        return;
    }

    if (hasCoupon) {
        console.warn('⚠️ Advertencia: Solo puedes reclamar un cupón por compra.');
        setErrorMessage('Solo puedes reclamar un cupón por compra.');
        return;
    }

    console.log('ℹ️ Reclamando cupón del Daily Challenge:', dailyChallenge);
    console.log('🔗 Link de Instagram:', igLink);
    console.log('👤 Usuario de Instagram:', igUsername);

    const claimData = {
        ig_username: igUsername,
        post_link: igLink,
        user_id: sessionData.id_cliente,
    };

    axios
        .patch(`http://localhost:3001/api/daily-challenge/${dailyChallenge.Oferta_Id}/claim-coupon`, claimData)
        .then((response) => {
            const { discount } = response.data.coupon;

            const nuevoCupon = {
                Oferta_Id: dailyChallenge.Oferta_Id,
                Descuento: discount / 100,
                Max_Amount: dailyChallenge.Max_Descuento_Percent,
                PrecioCupon: 0, // Siempre 0 para Daily Challenge
                Tipo_Oferta: 'DailyChallenge',
            };

            console.log('✅ Cupón creado:', nuevoCupon);

            setCompra((prevCompra) => {
                const updatedCompra = {
                    ...prevCompra,
                    cupones: [...(prevCompra.cupones || []), nuevoCupon],
                    DescuentosDailyChallenge: discount / 100,
                    total_descuentos: prevCompra.total_descuentos + (prevCompra.total_sin_descuento * (discount / 100)),
                };
                console.log('🛒 Estado de compra actualizado:', updatedCompra);
                return updatedCompra;
            });

            setHasCoupon(true);
            closeDailyChallenge();
        })
        .catch((error) => {
            console.error('❌ Error al reclamar el cupón del Daily Challenge:', error);
            setErrorMessage('No se pudo reclamar el cupón.');
        });
  };
  const handleAddProductToCart = (product, cantidad, size, price) => {
    setCompra((prevCompra) => {
      const newProduct = {
        id_producto: product.id,
        cantidad,
        size,
        price,
        total: cantidad * price
      };

      const updatedVenta = [...prevCompra.venta, newProduct];
      const totalSinDescuento = updatedVenta.reduce((sum, item) => sum + item.total, 0);

      return {
        ...prevCompra,
        venta: updatedVenta,
        total_sin_descuento: totalSinDescuento,
        total_descuentos: totalSinDescuento * (1 - prevCompra.DescuentosCupon / 100)
      };
    });
  };
  const handleDailyChallengeClick = () => {
    setShowDailyChallenge(!showDailyChallenge);
  
    // Verificar si el Daily Challenge ya está cargado para evitar llamadas redundantes
    if (!dailyChallenge) {
      axios
        .get('http://localhost:3001/ofertas') // Llama a todas las ofertas
        .then((response) => {
          // Filtrar por Tipo_Oferta y Estado
          const challenges = response.data.data.filter(
            (offer) => offer.Tipo_Oferta === 'DailyChallenge' && offer.Estado === 'Activa'
          );
  
          if (challenges.length > 0) {
            // Seleccionar el primer DailyChallenge o aplicar lógica adicional si hay varios
            const challenge = challenges[0];
  
            // Adaptar la URL de la imagen si existe
            if (challenge.Imagen) {
              challenge.img_url = `http://localhost:3001${challenge.Imagen}`;
            }
  
            // Guardar el Daily Challenge en el estado
            setDailyChallenge(challenge);
          } else {
            console.warn('No Daily Challenge found with the specified criteria.');
            setDailyChallenge(null);
          }
        })
        .catch((error) => {
          console.error('Error fetching Daily Challenges:', error);
        });
    }
  };
  const handleContactButtonClick = () => {
    setShowContactInfo(!showContactInfo);
    if (!companyInfo) {
      axios.get('http://localhost:3001/api/info-empresa').then((response) => {
        const data = response.data;
        if (Array.isArray(data) && data.length > 0) {
          setCompanyInfo(data[0]); // Selecciona el primer registro (sede principal)
        }
      });
    }
  };
  const handleOrderNowClick = () => {
    // console.log('Finalizando compra:', compra);
    navigate('/order-now', { state: { compra } });
  };
  const calculateNextCycle = (offer) => {
    const currentDayIndex = moment().day(); // Día actual (0 = domingo, 6 = sábado)
    const currentTime = moment(); // Hora actual

    const diasActivos = JSON.parse(offer.Dias_Activos).map((day) =>
        removeDiacritics(day.toLowerCase())
    );



    // Revisar primero si el día actual es válido y estamos dentro del horario
    const currentDay = removeDiacritics(moment().format("dddd").toLowerCase());
    if (diasActivos.includes(currentDay)) {
        const startMoment = moment().set({
            hour: parseInt(offer.Hora_Inicio.split(":")[0], 10),
            minute: parseInt(offer.Hora_Inicio.split(":")[1], 10),
        });

        const endMoment = moment().set({
            hour: parseInt(offer.Hora_Fin.split(":")[0], 10),
            minute: parseInt(offer.Hora_Fin.split(":")[1], 10),
        });

        if (currentTime.isBefore(endMoment)) {
            console.log("Oferta activa hoy:", currentDay);
            return startMoment.format("ddd DD/MM/YY");
        }
    }

    // Iterar por los próximos días activos
    for (let i = 1; i <= 7; i++) {
        const nextDayIndex = (currentDayIndex + i) % 7;
        const nextDay = removeDiacritics(moment().day(nextDayIndex).format("dddd").toLowerCase());

      

        if (diasActivos.includes(nextDay)) {
            const nextMoment = moment()
                .add(i >= 7 ? 1 : 0, 'weeks') // Asegurarse de agregar una semana si ya pasamos el ciclo
                .day(nextDayIndex)
                .startOf("day")
                .set({
                    hour: parseInt(offer.Hora_Inicio.split(":")[0], 10),
                    minute: parseInt(offer.Hora_Inicio.split(":")[1], 10),
                });
            return nextMoment.format("ddd DD/MM/YY");
        }
    }

   
    return null; // No hay días activos en la semana
  };
  const resetCoupons = async (offer) => {
    try {
      await axios.patch(`http://localhost:3001/api/offers/${offer.Oferta_Id}/reset-coupons`, {
        Cupones_Disponibles: offer.Cupones_Asignados,
      });
      setCuponesDisponibles(offer.Cupones_Asignados);
      console.log('Cupones reseteados correctamente.');
    } catch (error) {
      console.error('Error al resetear los cupones:', error);
    }
  };

  
  const handleReviewButtonClick = () => setShowReviewForm(!showReviewForm);
  const handleCloseReviewForm = () => setShowReviewForm(false);
  const removeDiacritics = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const closeDailyChallenge = () => setShowDailyChallenge(false);
  const emailUsername = sessionData?.email.split('@')[0];

  return (
    <div className="customer-page">
        <div className={`customer-page ${isServiceSuspended ? 'blurred' : ''}`}>
        {renderSuspensionMessage()}
      </div>
      {sessionData ? (
        <>
         {renderSuspensionMessage()}
         <header 
          className="customer-header" 
          style={{ marginBottom: '20px' }}
        >
          <h1 style={{ margin: 0 }}>
            Hola de nuevo, {emailUsername}!
          </h1>
        </header>

          <div className="content-container">
            {reviews.length > 0 && (
           <div className="reviews-container">
              {/* Promedio de Satisfacción (fijo) */}
              <div 
                  className="satisfaction-rating" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '15px', 
                    cursor: 'pointer' 
                  }}
                  title={`Promedio de Satisfacción: ${averageRating} / 5`} 
                >
                  {[...Array(Math.floor(averageRating))].map((_, i) => (
                    <span 
                      key={`filled-star-${i}`} 
                      className="star filled-star" 
                      style={{ 
                        color: '#FFD700', 
                        fontSize: '2rem', 
                        marginRight: '2px', 
                        transition: 'transform 0.3s ease, text-shadow 0.3s ease',
                        textShadow: '0 0 5px #FFD700' 
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.3)';
                        e.target.style.textShadow = '0 0 5px #FFD700, 0 0 2px #FFA500';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.textShadow = '0 0 10px #FFD700';
                      }}
                    >
                      ★
                    </span>
                  ))}
                  {[...Array(5 - Math.floor(averageRating))].map((_, i) => (
                    <span 
                      key={`empty-star-${i}`} 
                      className="star empty-star" 
                      style={{ 
                        color: '#D3D3D3', 
                        fontSize: '2rem', 
                        marginRight: '2px', 
                        transition: 'transform 0.3s ease, text-shadow 0.3s ease', 
                        textShadow: 'none' 
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.2)';
                        e.target.style.textShadow = '0 0 10px #C0C0C0';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.textShadow = 'none';
                      }}
                    >
                      ☆
                    </span>
                    
                  ))}
              </div>
              {/* Comentarios (dinámicos en una línea) */}
              <div
                className="reviews-slide"
                style={{ textAlign: 'center', fontSize: '1rem', marginTop: '10px' }}
              >
                {reviews.length > 0 ? (
                  <p>
                    <span style={{ fontWeight: 'bold', color: '#333' }}>
                      {reviews[currentReviewIndex]?.email || 'Email no disponible'}
                    </span>{" "}
                    - {reviews[currentReviewIndex]?.review || 'Sin comentario disponible'} -{" "}
                    <span style={{ color: '#FFD700' }}>
                      ⭐ {reviews[currentReviewIndex]?.rating || '0'} / 5
                    </span>
                  </p>
                ) : (
                  <p>No hay comentarios disponibles.</p>
                )}
              </div>
           </div>
            )}

            <div className="buttons-container">
            <button 
                  onClick={handleContactButtonClick} 
                  className={showContactInfo ? 'go-back' : ''}
                >
                  {showContactInfo ? 'Go Back' : 'Contacts'}
                </button>
               <button 
                  onClick={handleReviewButtonClick} 
                  className={showReviewForm ? 'go-back' : ''}
                >
                  {showReviewForm ? 'Go Back' : 'Reviews'}
                </button>
               
                <button
                    onClick={handleDailyChallengeClick}
                    className={`${showDailyChallenge ? 'go-back' : 'daily-challenge-button'} ${
                      !isDailyChallengeEnabled ? 'button-disabled' : ''
                    }`}
                    disabled={!isDailyChallengeEnabled}
                    data-tooltip-id="dailyChallengeTooltip"
                  >
                    {showDailyChallenge ? 'Go Back' : 'Daily Challenge'}
                    {!showDailyChallenge && <span className="badge">{cuponesDailyChallenge}</span>}
                  </button>
                <Tooltip id="dailyChallengeTooltip" place="top" type="dark" effect="solid">
                  {dailyChallengeTooltip}
                </Tooltip>



                <button
                className={`create-random-pizza-button ${!isRandomPizzaEnabled ? 'button-disabled' : ''}`}
                onClick={() => navigate('/rare-pizza')}
                disabled={!isRandomPizzaEnabled}
                data-tooltip-id="randomPizzaTooltip"
              >
                MakeARandomPizza
                {cuponesRandomPizza !== null && ( // Usamos cuponesRandomPizza aquí
                  <span className="badge">
                    {cuponesRandomPizza === 0 ? '0' : cuponesRandomPizza}
                  </span>
                )}
              </button>
              <Tooltip id="randomPizzaTooltip" place="top" type="dark" effect="solid">
                {randomPizzaTooltip}
              </Tooltip>


           </div>

            {showReviewForm && (
              <div className="review-form-container">
                <ReviewForm onClose={handleCloseReviewForm} email={sessionData.email} />
              </div>
            )}
            
            {showDailyChallenge && dailyChallenge && (
              <div className="review-form-container">
          <DailyChallengeCard
            dailyChallenge={dailyChallenge}
            handleClaimCoupon={handleClaimCoupon}
            userCoupon={userCoupon}
            closeDailyChallenge={closeDailyChallenge}
            setCompra={setCompra}
            compra={compra}
          />
          </div>
            )}
            {showContactInfo && companyInfo && (
              <div className="review-form-container">
                <div className="contact-info">
                  <h3>Información de Contacto</h3>
                  <p><strong>Teléfono:</strong> {companyInfo.telefono_contacto}</p>
                  <p><strong>Correo:</strong> {companyInfo.correo_contacto}</p>
                </div>
              </div>
            )}
            <div className="offers-section">
              {offers.length > 0 ? (
                <OffersSection
                  offers={offers}
                  handleApplyCoupon={handleApplyCoupon}
                  cuponesUsados={cuponesUsados}
                  setCuponesUsados={setCuponesUsados}
                  setCompra={setCompra}
                  compra={compra}
                />
              ) : (
                <p>No hay ofertas disponibles en este momento.</p>
              )}
            </div>

            <NotificationTicker />

            {!loadingPizzas && 
            <PizzaCarousel 
            onPizzaSelect={handlePizzaSelect}
              />
            }

            <div className="order-now-button-container">
              <button onClick={handleOrderNowClick} className="order-now-button"> <span>Order Now</span></button>
            </div>
          </div>
        </>
      ) : (
        <div>No se pudo obtener la información de la sesión. Por favor, intenta iniciar sesión nuevamente.</div>
      )}
    </div>
  );
};

export default CustomerPage;






