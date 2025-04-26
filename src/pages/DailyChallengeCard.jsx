import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { _PizzaContext } from './_PizzaContext';
import Confetti from 'react-confetti';
import moment from 'moment';
import '../styles/DailyChallengeCard.css';

const DailyChallengeCard = ({ closeDailyChallenge, setCompra, compra }) => {
  const { sessionData } = useContext(_PizzaContext);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeBlocked, setIsTimeBlocked] = useState(false);
  const [nextAvailableDay, setNextAvailableDay] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [igUsername, setIgUsername] = useState('');
  const [igLink, setIgLink] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showParticipationForm, setShowParticipationForm] = useState(false);
  const [isParticipated, setIsParticipated] = useState(false);
  const [discount, setDiscount] = useState(null);
  const [isConfettiVisible, setIsConfettiVisible] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('Cargando Daily Challenge...');
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/daily-challenges`)
      .then((response) => {
        // 1. Filtra los retos activos y de tipo DailyChallenge
        const activeChallenges = response.data.filter(
          (challenge) =>
            challenge.Tipo_Oferta === 'DailyChallenge' &&
            challenge.Estado === 'Activa'
        );

        // 2. Determina el día actual sin acentos
        const currentDay = removeAccents(moment().format('dddd').toLowerCase());

        // 3. Busca los challenges que tengan este día en su Dias_Activos
        const challengesToday = activeChallenges.filter((challenge) => {
          const diasActivos = JSON.parse(challenge.Dias_Activos).map(removeAccents);
          return diasActivos.includes(currentDay);
        });

        if (challengesToday.length > 0) {
          // Tomamos el primero (o define tu propia lógica si hay varios)
          const challengeOfTheDay = challengesToday[0];
          setDailyChallenge(challengeOfTheDay);
        } else {
          console.log('No hay un Daily Challenge activo para el día de hoy.');
        }
      })
      .catch((error) => {
        console.error('Error al cargar la oferta Daily Challenge:', error);
      });
  }, []);
  useEffect(() => {
    if (dailyChallenge) {
      checkTimeAvailability(dailyChallenge);
      // checkExtraConditions(); // ← Si existiera lógica adicional
    }
  }, [dailyChallenge, sessionData]);
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev > 0) {
            const newValue = prev - 1;
            // Al llegar a 0, hacemos el reset (si corresponde)
            if (newValue === 0 && dailyChallenge?.Tipo_Cupon === 'permanente') {
              console.log(
                `Reseteando cupones para la oferta ${dailyChallenge.Oferta_Id}: Hora fin alcanzada.`
              );
              resetCoupons();
            }
            return newValue;
          }
          return 0;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, dailyChallenge]);

  

  const validateLink = (link) => link.includes('instagram.com');
  const removeAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  
  const calculateTimeLeft = (timeInSeconds) => {
    const duration = moment.duration(timeInSeconds, 'seconds');
    return {
      hours: Math.floor(duration.asHours()),
      minutes: duration.minutes(),
      seconds: duration.seconds(),
    };
  };
  const checkTimeAvailability = (challenge) => {
    if (!challenge) return;

    if (challenge.Estado !== 'Activa') {
      setIsTimeBlocked(true);
      setBlockReason('La oferta no está activa.');
      return;
    }

    const currentDay = removeAccents(moment().format('dddd').toLowerCase());
    const currentTime = moment();

    const horaInicio = moment(challenge.Hora_Inicio, 'HH:mm');
    const horaFin = moment(challenge.Hora_Fin, 'HH:mm');

    // Validar horario
    if (!horaInicio.isValid() || !horaFin.isValid()) {
      console.error('Formato de hora inválido para la oferta:', challenge);
      setIsTimeBlocked(true);
      setBlockReason('Error en los horarios configurados.');
      return;
    }

    // Días activos
    const diasActivos = JSON.parse(challenge.Dias_Activos).map(removeAccents);

    if (diasActivos.includes(currentDay)) {
      // Día sí activo:
      if (currentTime.isBefore(horaInicio)) {
        // Aún no empieza la oferta
        setTimeLeft(horaInicio.diff(currentTime, 'seconds'));
        setIsTimeBlocked(true);
        setBlockReason(`Disponible desde las ${challenge.Hora_Inicio}`);
      } else if (currentTime.isBetween(horaInicio, horaFin)) {
        // Está en horario
        setTimeLeft(horaFin.diff(currentTime, 'seconds'));
        setIsTimeBlocked(false);
        setBlockReason(`Disponible hasta las ${challenge.Hora_Fin}`);
      } else {
        // Ya pasó la hora fin
        if (challenge.Tipo_Cupon === 'permanente') {
          console.log(
            `Llamando a resetCoupons para oferta ${challenge.Oferta_Id}: Hora fin alcanzada.`
          );
          resetCoupons();
        }
        setIsTimeBlocked(true);
        calculateNextCycle(challenge);
      }
    } else {
      // Día no activo
      setIsTimeBlocked(true);
      calculateNextCycle(challenge);
    }
  };
  const calculateNextCycle = (challenge) => {
    const currentDayIndex = moment().day();
    const diasActivos = JSON.parse(challenge.Dias_Activos).map(removeAccents);

    let nextDayIndex = null;
    for (let i = 1; i <= 7; i++) {
      const checkDay = (currentDayIndex + i) % 7;
      const dayName = removeAccents(moment().day(checkDay).format('dddd').toLowerCase());
      if (diasActivos.includes(dayName)) {
        nextDayIndex = checkDay;
        break;
      }
    }

    if (nextDayIndex !== null) {
      const nextDay = moment()
        .day(nextDayIndex)
        .startOf('day')
        .set({
          hour: challenge.Hora_Inicio.split(':')[0],
          minute: challenge.Hora_Inicio.split(':')[1],
        });

      const formattedDayName = moment().day(nextDayIndex).format('dddd');
      const formattedDate = nextDay.format('DD/MM/YYYY');

      setNextAvailableDay(`${formattedDayName} ${formattedDate}`);
      setTimeLeft(nextDay.diff(moment(), 'seconds'));
      setBlockReason(
        `Disponible el próximo ${formattedDayName} a las ${challenge.Hora_Inicio}`
      );
    }
  };
  const resetCoupons = () => {
    if (!dailyChallenge) return;

    axios
      .patch(`${process.env.REACT_APP_API_URL}/api/offers/${dailyChallenge.Oferta_Id}/reset-coupons`, {
        Cupones_Disponibles: dailyChallenge.Cupones_Asignados,
      })
      .then((response) => {
        console.log('Respuesta del servidor al reset:', response.data);
        setDailyChallenge((prev) =>
          prev ? { ...prev, Cupones_Disponibles: prev.Cupones_Asignados } : prev
        );
        console.log(`Cupones reiniciados para la oferta ${dailyChallenge.Oferta_Id}.`);
      })
      .catch((error) => {
        console.error(
          `Error al reiniciar los cupones para la oferta ${dailyChallenge.Oferta_Id}:`,
          error
        );
      });
  };
  const renderTimeLeft = () => {
    if (!dailyChallenge) return '';

    // Sold out
    if (dailyChallenge.Cupones_Disponibles === 0) {
      return (
        <>
          Sold Out
          <br />
          🚫🚫🚫
        </>
      );
    }

    // Bloqueado por horario o día
    if (isTimeBlocked) {
      return blockReason;
    } else {
      // Mostrar cuenta regresiva
      const { hours, minutes, seconds } = calculateTimeLeft(timeLeft);
      return `Available until: ${hours}h ${minutes}m ${seconds}s`;
    }
  };
  const handleParticipation = () => {
    if (!igUsername || !igLink) {
      setErrorMessage('Por favor, completa todos los campos antes de participar.');
      return;
    }

    if (!validateLink(igLink)) {
      setErrorMessage('El enlace debe ser de Instagram. Verifícalo de nuevo.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const participationData = {
      ig_username: igUsername,
      post_link: igLink,
      daily_challenge_id: dailyChallenge.Oferta_Id,
      user_id: sessionData.id_cliente,
    };

    axios
      .post(
        `${process.env.REACT_APP_API_URL}/api/daily-challenge/${dailyChallenge.Oferta_Id}/participate`,
        participationData
      )
      .then((response) => {
        console.log('Participación registrada:', response.data);
        setIsParticipated(true);
        setShowParticipationForm(false);
      })
      .catch((error) => {
        console.error('Error al registrar la participación:', error);
        setErrorMessage('Error al enviar la participación. Intenta de nuevo.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };
  const handleClaimCouponWrapper = () => {
    if (!isParticipated) {
      setErrorMessage('No puedes reclamar el cupón sin haber participado.');
      return;
    }

    axios
      .patch(
        `${process.env.REACT_APP_API_URL}/api/daily-challenge/${dailyChallenge.Oferta_Id}/claim-coupon`,
        {
          ig_username: igUsername,
          post_link: igLink,
          user_id: sessionData.id_cliente,
        }
      )
      .then((response) => {
        const { discount } = response.data.coupon;
        console.log('Cupón reclamado con éxito:', discount);

        const nuevoCupon = {
          Oferta_Id: dailyChallenge.Oferta_Id,
          Descuento: discount / 100,
          Max_Amount: dailyChallenge.Max_Descuento_Percent,
          PrecioCupon: dailyChallenge.Precio_Cupon,
        };

        // Actualizar la compra global
        setCompra((prevCompra) => ({
          ...prevCompra,
          cupones: [...(prevCompra.cupones || []), nuevoCupon],
          total_descuentos:
            prevCompra.total_descuentos +
            prevCompra.total_sin_descuento * (discount / 100),
        }));

        setDiscount(discount);
        setIsConfettiVisible(true);
        setShowFinalModal(true);
      })
      .catch((error) => {
        console.error('Error al reclamar el cupón:', error);
        setErrorMessage('Error al reclamar el cupón. Intenta de nuevo.');
      });
  };
  const closeAllModals = () => {
    setShowFinalModal(false);
    setIsConfettiVisible(false);
    closeDailyChallenge();
  };


  return (
    <div className="daily-challenge-card">
      {/* Si no hay reto disponible para hoy */}
      {!dailyChallenge ? (
        <p style={{ textAlign: 'center' }}>
          No hay un Daily Challenge activo en este momento.
        </p>
      ) : (
        <>
          {/* Muestra la info del challenge si sí hay */}
          {!isParticipated ? (
            <>
              {dailyChallenge.Imagen && (
                <img
                  src={`${process.env.REACT_APP_API_URL}${dailyChallenge.Imagen}`}
                  alt="Challenge"
                  className="challenge-image"
                />
              )}
  
              <p>
                <strong>Link:</strong>{' '}
                {dailyChallenge.Instrucciones_Link ? (
                  <a
                    className='Instrucciones_Link'
                    href={dailyChallenge.Instrucciones_Link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {dailyChallenge.Instrucciones_Link}
                  </a>
                ) : (
                  'No disponible'
                )}
              </p>
  
              {/* Contenedor de detalles del challenge */}
              <div className="challenge-details">
                <p>
                  <strong>How it works:</strong> {dailyChallenge.Additional_Instructions}
                </p>
                <p>
                  <strong>Savings Range:</strong>{' '}
                  {dailyChallenge.Min_Descuento_Percent}% -{' '}
                  {dailyChallenge.Max_Descuento_Percent}%
                </p>
                <p>
                  <strong>Cupon_Id:</strong> {dailyChallenge.Codigo_Oferta}
                </p>
                <p>
                  <strong>Coupons Available:</strong>{' '}
                  {dailyChallenge.Cupones_Disponibles}
                </p>
                <p>
                  <strong>Price_cupon:</strong> 
                  {dailyChallenge.Precio_Cupon === 0 ? ' Today Free' : `${dailyChallenge.Precio_Cupon}€`}
                </p>
              </div>
  
              {/* Tiempo restante */}
              <p className="time-left">{renderTimeLeft()}</p>
  
              <button
                className="participate-button"
                onClick={() => setShowParticipationForm(!showParticipationForm)}
                disabled={
                  isTimeBlocked ||
                  (dailyChallenge && dailyChallenge.Cupones_Disponibles === 0)
                }
              >
                {showParticipationForm ? 'Hide Entry' : 'Take part'}
              </button>
  
              {/* Formulario de participación */}
              {showParticipationForm && (
                <div className="participation-form">
                  <ul className="participation-list">
                    <li>
                      <label className="input-label">
                        User:
                      </label>
                      <input
                        type="text"
                        value={igUsername}
                        onChange={(e) => setIgUsername(e.target.value)}
                        placeholder="Tu usuario de Instagram"
                        className="input-field"
                        required
                      />
                    </li>
                    <li>
                      <label className="input-label">
                        Post URL:
                      </label>
                      <input
                        type="text"
                        value={igLink}
                        onChange={(e) => setIgLink(e.target.value)}
                        placeholder="https://instagram.com/p/..."
                        className="input-field"
                        required
                      />
                    </li>
                  </ul>
                  <button
                    className="submit-participation-button"
                    onClick={handleParticipation}
                    disabled={isSubmitting}
                  >
                    Submit Entry
                  </button>
                </div>
              )}
              {errorMessage && <p className="error-message">{errorMessage}</p>}
            </>
          ) : (
            <div className="claim-coupon-container">
              ⚠️{' '}
              <button onClick={handleClaimCouponWrapper}>
               Claim Coupon
              </button>{' '}
              ⚠️
            </div>
          )}
  
          {showFinalModal && (
            <div className="modal">
              {isConfettiVisible && <Confetti />}
              <h2>Well done!</h2>
              <p>You've received a{discount}%</p>
              <button onClick={closeAllModals}>Exit </button>
            </div>
          )}
        </>
      )}
    </div>
  );
  
};

export default DailyChallengeCard;
