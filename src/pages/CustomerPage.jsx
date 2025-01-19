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
    const diasActivos = JSON.parse(offer.Dias_Activos).map(removeAccents);
  
    let nextDayIndex = null;
    for (let i = 1; i <= 7; i++) {
      const checkDay = (currentDayIndex + i) % 7;
      if (diasActivos.includes(removeAccents(moment().day(checkDay).format('dddd').toLowerCase()))) {
        nextDayIndex = checkDay;
        break;
      }
    }
  
    if (nextDayIndex !== null) {
      const nextDay = moment().day(nextDayIndex).startOf('day').set({
        hour: offer.Hora_Inicio.split(':')[0],
        minute: offer.Hora_Inicio.split(':')[1],
      });
  
      const formattedDay = moment().day(nextDayIndex).format('ddd');
      const formattedDate = nextDay.format('DD/MM/YYYY');
  
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
  
      setIsCouponApplied(true); // Activar el efecto Neón
      setTimeout(() => setIsCouponApplied(false), 3000); // Desactivar después de 3 segundos
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
        <div className="neon-glow">
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
              : `Today ${offer.Precio_Cupon || "n/a"}€`}
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
  const { sessionData } = useContext(_PizzaContext);
  const [offerMessage, setOfferMessage] = useState('');
  const [pizzaDiscountMessage, setPizzaDiscountMessage] = useState('');
  const [dailyChallengeInfo, setDailyChallengeInfo] = useState(null);

  const dayMap = {
    1: 'domingo',
    2: 'lunes',
    3: 'martes',
    4: 'miercoles',
    5: 'jueves',
    6: 'viernes',
    7: 'sabado'
  };

  const formatDiasActivos = (dias) => {
    if (dias.length === 1) return dias[0];
    return `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}`;
  };

  useEffect(() => {
    const fetchOffersForDay = async () => {
      try {
        if (sessionData.segmento && sessionData.diaMasComprado) {
          // console.log('Segmento del usuario:', sessionData.segmento);
          // console.log('Día más comprado (número):', sessionData.diaMasComprado);

          const response = await axios.get(`http://localhost:3001/ofertas/${sessionData.segmento}`);
          const offers = response.data.data;
          // console.log('Ofertas obtenidas:', offers);

          const diaMasCompradoNombre = dayMap[sessionData.diaMasComprado];
          // console.log('Día equivalente (nombre):', diaMasCompradoNombre);

          const matchingOffers = offers.filter(offer => {
            const diasActivos = JSON.parse(offer.Dias_Activos); 
            // console.log('Días activos en oferta:', diasActivos);
            return diasActivos.includes(diaMasCompradoNombre);
          });

          if (matchingOffers.length > 0) {
            const selectedOffer = matchingOffers.reduce((prev, current) => {
              return prev.Cupones_Asignados < current.Cupones_Asignados ? prev : current;
            });

            const horaInicio = selectedOffer.Hora_Inicio;
            const cuponesDisponibles = selectedOffer.Cupones_Asignados;
            // console.log('Oferta seleccionada:', selectedOffer);

            const message = `El próximo ${diaMasCompradoNombre} a partir de las ${horaInicio}, ${cuponesDisponibles} cupones disponibles para que lo disfrutes en tu día.`;
            setOfferMessage(message);
          } else {
            setOfferMessage('No hay ofertas disponibles para tu día más comprado.');
          }

          const maxDiscountOffer = offers.reduce((prev, current) => {
            return prev.Descuento_Percent > current.Descuento_Percent ? prev : current;
          });

          const diasActivos = JSON.parse(maxDiscountOffer.Dias_Activos);
          const allDays = [1, 2, 3, 4, 5, 6, 7].every(day => diasActivos.includes(dayMap[day]));

          const pizzaDiscountMessage = allDays
            ? `🎉 Disfruta hasta un ${maxDiscountOffer.Descuento_Percent}% de descuento en el cupón ${maxDiscountOffer.Codigo_Oferta} disponible Todos los días a partir de las ${maxDiscountOffer.Hora_Inicio}.`
            : `🎉 Disfruta hasta un ${maxDiscountOffer.Descuento_Percent}% de descuento en el cupón ${maxDiscountOffer.Codigo_Oferta} disponible los ${formatDiasActivos(diasActivos)} a partir de las ${maxDiscountOffer.Hora_Inicio}.`;

          setPizzaDiscountMessage(pizzaDiscountMessage);
        }
      } catch (error) {
        console.error('Error al obtener las ofertas:', error);
      }
    };

    if (sessionData.diaMasComprado) {
      fetchOffersForDay();
    }
  }, [sessionData.diaMasComprado, sessionData.segmento]);



  let satisfactionMessage = "⭐ Aún no tienes suficientes reseñas. ¡Deja tu reseña hoy!"; 

if (sessionData.nivelSatisfaccion > 0) {
  if (sessionData.nivelSatisfaccion < 3.0) {
    satisfactionMessage = "Tu opinión nos importa. ¡Ayúdanos a mejorar con tu reseña!";
  } else if (sessionData.nivelSatisfaccion >= 3.0 && sessionData.nivelSatisfaccion < 4.0) {
    satisfactionMessage = "Gracias por tu apoyo. ¿Dejarías otra reseña para seguir mejorando?";
  } else if (sessionData.nivelSatisfaccion >= 4.0) {
    satisfactionMessage = "¡Nos alegra que estés satisfecho! ¿Te animas a dejarnos otra reseña?";
  }

  if (sessionData.necesitaNuevaReview) {
    satisfactionMessage += " ¡Hace más de 5 días que no recibimos tu opinión!";
  }
}

  const ticketObjetivo = sessionData.ticketPromedio * 1.1;
  const diferenciaTicket = (ticketObjetivo - sessionData.ticketPromedio).toFixed(2);

  const ticketMessage = diferenciaTicket > 0
    ? `🎯 ¡Estás a solo ${diferenciaTicket} EUR de obtener beneficios adicionales! Aumenta ese monto en tu próxima compra y accede a más recompensas.`
    : `🎯 ¡Ya has alcanzado tu ticket objetivo! Sigue disfrutando de nuestras ofertas y beneficios.`;

  const dailyChallengeMessage = dailyChallengeInfo
    ? `🏆 ¡Participa en el Daily Challenge y gana hasta ${dailyChallengeInfo.max_discount}% de descuento! Quedan ${dailyChallengeInfo.assigned_coupons} cupones disponibles.`
    : `🏆 ¡No olvides participar en el Daily Challenge para ganar grandes descuentos y sorpresas!`;

  return (
    <div className="notification-ticker">
      <div className="ticker-text">
        <span>{satisfactionMessage}</span>
        <span>{pizzaDiscountMessage}</span> 
        <span>{offerMessage}</span>
        <span>{ticketMessage}</span> 
        <span>{dailyChallengeMessage}</span> 
      </div>
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

      const ofertaPizzaRara = offers.find((offer) => offer.Tipo_Oferta === 'Random Pizza');
      if (!ofertaPizzaRara) {
        setIsRandomPizzaEnabled(false);
        setRandomPizzaTooltip('Oferta no disponible actualmente.');
        return;
      }

      const currentTime = moment();
      const horaInicio = moment(ofertaPizzaRara.Hora_Inicio, 'HH:mm');
      const horaFin = moment(ofertaPizzaRara.Hora_Fin, 'HH:mm');

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
    };

    checkRandomPizzaAvailability();
  }, [offers]);
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axios.get("http://localhost:3001/ofertas");
        const allOffers = response.data.data;
  
        // Daily Challenge Logic
        const dailyChallengeOffer = allOffers.find(
          (offer) => offer.Tipo_Oferta === "DailyChallenge" && offer.Estado === "Activa"
        );
  
        if (dailyChallengeOffer) {
          setDailyChallenge(dailyChallengeOffer);
          setCuponesDailyChallenge(dailyChallengeOffer.Cupones_Disponibles || 0);
  
          const currentTime = moment();
          const startTime = moment(dailyChallengeOffer.Hora_Inicio, "HH:mm");
          const endTime = moment(dailyChallengeOffer.Hora_Fin, "HH:mm");
  
          if (dailyChallengeOffer.Cupones_Disponibles === 0) {
            setIsDailyChallengeEnabled(false);
            setDailyChallengeTooltip("Sold Out!");
          } else if (currentTime.isBefore(startTime)) {
            setIsDailyChallengeEnabled(false);
            setDailyChallengeTooltip(`Disponible a partir de las ${dailyChallengeOffer.Hora_Inicio}`);
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
          setIsDailyChallengeEnabled(false);
          setDailyChallengeTooltip("No hay retos disponibles actualmente.");
        }
  
        // Random Pizza Logic
        const randomPizzaOffer = allOffers.find(
          (offer) => offer.Tipo_Oferta === "Random Pizza"
        );
  
        if (randomPizzaOffer) {
          setCuponesDisponibles(randomPizzaOffer.Cupones_Disponibles || 0);
  
          const currentTime = moment();
          const startTime = moment(randomPizzaOffer.Hora_Inicio, "HH:mm");
          const endTime = moment(randomPizzaOffer.Hora_Fin, "HH:mm");
  
          if (randomPizzaOffer.Cupones_Disponibles === 0) {
            setIsRandomPizzaEnabled(false);
            setRandomPizzaTooltip("Sold Out!");
          } else if (currentTime.isBefore(startTime)) {
            setIsRandomPizzaEnabled(false);
            setRandomPizzaTooltip(`Disponible a partir de las ${randomPizzaOffer.Hora_Inicio}`);
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
    const currentDayIndex = moment().day();
    const diasActivos = JSON.parse(offer.Dias_Activos).map((day) =>
      removeDiacritics(day.toLowerCase())
    );

    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (currentDayIndex + i) % 7;
      const nextDay = moment().day(nextDayIndex).format('dddd').toLowerCase();
      if (diasActivos.includes(nextDay)) {
        const nextMoment = moment().day(nextDayIndex).startOf('day').set({
          hour: offer.Hora_Inicio.split(':')[0],
          minute: offer.Hora_Inicio.split(':')[1],
        });
        return nextMoment.format('ddd DD/MM/YY');
      }
    }
    return null;
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
          <div>

    </div>
        <div className={`customer-page ${isServiceSuspended ? 'blurred' : ''}`}>
        {renderSuspensionMessage()}
      </div>
      {sessionData ? (
        <>
         {renderSuspensionMessage()}
          <header className="customer-header">
            <h1>Hola de nuevo, {emailUsername}!</h1>
            {reviews.length > 0 && <p>⭐ Promedio de Satisfacción: {averageRating} / 5</p>}
          </header>

          <div className="content-container">
            {reviews.length > 0 && (
              <div className="reviews-container">
                <div className="reviews-slide">
                  <p>{reviews[currentReviewIndex].review}</p>
                  <p>⭐ {reviews[currentReviewIndex].rating} / 5</p>
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
                  className={`daily-challenge-button ${
                    !isDailyChallengeEnabled ? "button-disabled" : ""
                  }`}
                  onClick={handleDailyChallengeClick}
                  disabled={!isDailyChallengeEnabled}
                  data-tooltip-id="dailyChallengeTooltip"
                >
                  Daily Challenge
                  <span className="badge">{cuponesDailyChallenge}</span>
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
                  {cuponesDisponibles !== null && (
                    <span className="badge">
                      {cuponesDisponibles === 0 ? '0' : cuponesDisponibles}
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






