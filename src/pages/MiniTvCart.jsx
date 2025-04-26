import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import '../styles/FloatingCart.css';
import { _PizzaContext } from './_PizzaContext';

const MiniTvCart = ({ isReadyToPay, compraFinalizada }) => {
  const { sessionData } = useContext(_PizzaContext);
  const [infoEmpresa, setInfoEmpresa] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loopInterval, setLoopInterval] = useState(null);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/info-empresa`)
      .then((response) => {
        const empresaActiva = response.data.find(e => e.estado === 'activo');
        if (empresaActiva) setInfoEmpresa(empresaActiva);
      })
      .catch((error) => {
        console.error("Error al cargar datos de la empresa:", error);
      });
  }, []);

  useEffect(() => {
    if (!isReadyToPay && !compraFinalizada) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % 2);
      }, 5000);
      setLoopInterval(interval);
      return () => clearInterval(interval);
    } else {
      clearInterval(loopInterval);
      setCurrentStep(0);
    }
  }, [isReadyToPay, compraFinalizada]);

  const getUsername = () => {
    const { name, email } = sessionData || {};
    return name?.trim() ? name : email?.split("@")[0] || "Cliente";
  };

  const renderContent = () => {
    if (!sessionData || !infoEmpresa) return null;

    const username = getUsername();
    const empresa = infoEmpresa.nombre_empresa || "nuestra pizzería";
    const telefono = infoEmpresa.telefono_contacto || "";
    const correo = infoEmpresa.correo_contacto || "";

    if (compraFinalizada) {
      return (
        <p className="tv-message">
          ¡Gracias por tu compra!<br />
          Si necesitas algo, contáctanos al <strong>{telefono}</strong> o <strong>{correo}</strong>.
        </p>
      );
    }

    if (!isReadyToPay) {
      return currentStep === 0 ? (
        <img
          src={infoEmpresa.logo_url}
          alt="logo"
          className="tv-logo-full"
        />
      ) : (
        <p className="tv-message">
          Bienvenido a {empresa}.<br />
          {username}, Hoy es un gran día para =) 
        </p>
      );
    }

    return (
      <p className="tv-message pulse">
      Una pizza inolvidable está a un clic.<br />
      El horno está listo. ¿Y tú?<br />
      <strong>Haz que suceda.</strong>
    </p>
    );
  };

  return (
    <div className="mini-tv-cart">
      <div className="tv-screen">
        {renderContent()}
      </div>
    </div>
  );
};

export default MiniTvCart;
