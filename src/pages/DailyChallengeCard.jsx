import React, { useState, useContext } from 'react';
import axios from 'axios';
import { _PizzaContext } from './_PizzaContext';
import Confetti from 'react-confetti'; 

const DailyChallengeCard = ({ dailyChallenge, handleClaimCoupon, userCoupon, closeDailyChallenge, setCompra }) => {
  const { sessionData } = useContext(_PizzaContext); 
  const [igUsername, setIgUsername] = useState(''); 
  const [igLink, setIgLink] = useState(''); 
  const [errorMessage, setErrorMessage] = useState(''); 
  const [showParticipationForm, setShowParticipationForm] = useState(false); 
  const [isParticipated, setIsParticipated] = useState(false); 
  const [showAlert, setShowAlert] = useState(false); 
  const [showSuccessModal, setShowSuccessModal] = useState(false); 
  const [discount, setDiscount] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isCouponReady, setIsCouponReady] = useState(false); 
  const [isConfettiVisible, setIsConfettiVisible] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false); 

  if (!setCompra || typeof setCompra !== 'function') {
    console.error('setCompra no está definido o no es una función');
    return null;  // Evitamos continuar si no tenemos la función setCompra
  }

  const validateLink = (link) => {
    const regex = /^(https?:\/\/)?(www\.)?instagram\.com\/[A-Za-z0-9._]+(\/p\/[A-Za-z0-9-_]+\/?)?(\/)?(\?.*)?$/;
    return regex.test(link);
  };
  
  const validateUsername = (username) => {
    const regex = /^[a-zA-Z0-9._]{1,30}$/;
    return regex.test(username);
  };
  
  const handleParticipation = () => {
    if (!igUsername || !igLink) {
      setErrorMessage('Por favor, completa todos los campos antes de participar.');
      return;
    }
    if (!validateLink(igLink)) {
      setErrorMessage('El enlace no parece ser válido. Por favor, ingresa un enlace de Instagram válido.');
      return;
    }
    if (!validateUsername(igUsername)) {
      setErrorMessage('El nombre de usuario no parece ser válido. Por favor, ingresa un nombre de usuario correcto.');
      return;
    }
  
    setErrorMessage('');
    setIsSubmitting(true);
  
    const participationData = {
      ig_username: igUsername,
      post_link: igLink,
      daily_challenge_id: dailyChallenge.id,
      user_id: sessionData.id_cliente,
    };
  
    axios.post(`http://localhost:3001/api/daily-challenge/${dailyChallenge.id}/participate`, participationData)
      .then((response) => {
        console.log('Participación registrada:', response.data);
        setIsParticipated(true);
        setShowAlert(false);
        setShowParticipationForm(false);
        setIsCouponReady(true);
        setShowSuccessModal(true);
      })
      .catch((error) => {
        console.error('Error al enviar la participación:', error);
        setErrorMessage('Hubo un error al enviar la participación. Inténtalo de nuevo.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };
  

  const handleClaimCouponWrapper = () => {
    if (!isParticipated) {
      setShowAlert(true); 
      return;
    }

    axios.patch(`http://localhost:3001/api/daily-challenge/${dailyChallenge.id}/claim-coupon`, {
      ig_username: igUsername,
      post_link: igLink,
      user_id: sessionData.id_cliente, 
    })
      .then((response) => {
        const { discount } = response.data.coupon;
        console.log('Cupón asignado:', discount);
        setDiscount(discount); 
        setIsConfettiVisible(true); 
        setShowSuccessModal(false); 
        setShowFinalModal(true); 

        // Actualizar el estado de la compra con el cupón del Daily Challenge
        setCompra((prevCompra) => {
          const descuentoDecimal = discount / 100;
          const descuentoAplicado = prevCompra.total_sin_descuento * descuentoDecimal;

          // Crear el objeto del cupón del Daily Challenge para agregar al array
          const dailyChallengeCoupon = {
            tipo: 'DailyChallenge',
            descuento: descuentoDecimal,
            totalAplicado: descuentoAplicado,
          };

          return {
            ...prevCompra,
            DescuentosDailyChallenge: descuentoDecimal,  // Actualizar DescuentosDailyChallenge
            cupones: [...prevCompra.cupones, dailyChallengeCoupon], // Agregar el cupón al array de cupones
            total_a_pagar_con_descuentos: prevCompra.total_sin_descuento - descuentoAplicado,
          };
        });

        console.log('Cupón del Daily Challenge añadido a la compra:', discount);

      })
      .catch((error) => {
        console.error('Error al reclamar el cupón:', error);
        setErrorMessage('Lo sentimos, no hay cupones disponibles o hubo un error. Inténtalo más tarde.');
      });
  };

  const closeAllModals = () => {
    setShowFinalModal(false); 
    setIsConfettiVisible(false); 
    closeDailyChallenge(); 
  };

  return (
    <div className="daily-challenge-card">
      <h2>{dailyChallenge.comments}</h2>
      {dailyChallenge.img_url && (
        <img src={dailyChallenge.img_url} alt="Daily Challenge" className="challenge-image" />
      )}
      <p><strong>Link:</strong> <a href={dailyChallenge.link} target="_blank" rel="noopener noreferrer">{dailyChallenge.link}</a></p>
      <p><strong>Rango de Descuento:</strong> {dailyChallenge.min_discount}% - {dailyChallenge.max_discount}%</p>
      <p><strong>Cupones Disponibles:</strong> {dailyChallenge.assigned_coupons}</p>

      <button className="participate-button" onClick={() => setShowParticipationForm(!showParticipationForm)}>
        {showParticipationForm ? 'Ocultar Participación' : 'Participa'}
      </button>

      {showParticipationForm && (
        <div className="participation-form">
          <ul className="participation-list">
            <li>
              <label>
                Usuario:
                <input
                  type="text"
                  value={igUsername}
                  onChange={(e) => setIgUsername(e.target.value)}
                  placeholder="Tu usuario de Instagram"
                  required
                />
              </label>
            </li>
            <li>
              <label>
                Link de la Publicación:
                <input
                  type="text"
                  value={igLink}
                  onChange={(e) => setIgLink(e.target.value)}
                  placeholder="https://instagram.com/p/..."
                  required
                />
              </label>
            </li>
          </ul>
          <button className="submit-participation-button" onClick={handleParticipation} disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar Participación'}
          </button>
        </div>
      )}

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {showSuccessModal && (
        <div className="modal">
          <div className="modal-content">
            <h2 style={{ fontSize: '15px', fontStyle: 'italic', animation: 'none' }}>¡Participación Registrada con Éxito...!</h2> 
            <button
              className="claim-coupon-button flashing" 
              onClick={handleClaimCouponWrapper}
              style={{ fontSize: '18px', padding: '20px 20px' }} 
            >
              Reclamar Cupón
            </button>
          </div>
        </div>
      )}

      {showFinalModal && (
        <div className="modal">
          <div className="modal-content">
            {isConfettiVisible && <Confetti />}
            <h2>¡Felicidades!</h2>
            <p>Has obtenido un {discount}% de descuento en tu próxima compra.</p>
            <button onClick={closeAllModals}>Cerrar</button>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes flash {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          .flashing {
            animation: flash 1.5s infinite;
          }
        `}
      </style>
    </div>
  );
};

export default DailyChallengeCard;

