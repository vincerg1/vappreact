import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { _PizzaContext } from './_PizzaContext';
import formularios from '../styles/formularios.css';

const InicioSesion = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // Para mostrar mensajes de error
  const { updateSessionData } = useContext(_PizzaContext);
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleRememberMeChange = () => {
    setRememberMe(!rememberMe);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');  // Limpiar cualquier error previo

    try {
      // Realizar la solicitud al servidor para iniciar sesión
      const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
        email: email,
        password: password
      });

      const {
        id_cliente,
        email: emailFromDB,
        phone,
        name,
        address_1,
        address_2,
        segmento,
        isbday,
        numeroDeCompras,
        Dias_Ucompra,
        Max_Amount,
        ticketPromedio,
        MontoTotalCompras,
        id_pizzaMasComprada,
        precio_pizzaMasComprada,
        size_pizzaMasComprada,
        ofertaMasUsada,
        diaMasComprado,
        diaDelMesMasComprado,
        horaMasComprada,
        nivelSatisfaccion
      } = loginResponse.data;

      // Calcular el ticket objetivo como el 110% del ticket promedio
      const ticketObjetivo = (ticketPromedio * 1.1).toFixed(2);  // Redondeado a dos decimales

      // Actualizar los datos de sesión en el contexto
      updateSessionData({
        id_cliente,
        email: emailFromDB,
        phone,
        name,
        address_1,
        address_2,
        segmento,
        isbday,
        numeroDeCompras,
        Dias_Ucompra,
        Max_Amount,
        ticketPromedio,
        ticketObjetivo,  // Incluimos el ticket objetivo calculado
        MontoTotalCompras,
        id_pizzaMasComprada,
        precio_pizzaMasComprada,
        size_pizzaMasComprada,
        ofertaMasUsada,
        diaMasComprado,
        diaDelMesMasComprado,
        horaMasComprada,
        nivelSatisfaccion
      });

      // Redirigir al cliente a la página de usuario
      navigate('/customer');
      
    } catch (error) {
      // Manejo de errores del backend
      if (error.response) {
        if (error.response.status === 403) {
          setErrorMessage('Tu cuenta está suspendida temporalmente.');
        } else if (error.response.status === 401) {
          setErrorMessage('Correo o contraseña incorrectos.');
        } else {
          setErrorMessage('Error en el servidor, por favor intenta de nuevo.');
        }
      }
    }
  };

  return (
    <div>
      <h2 className="isesion">Iniciar Sesión</h2>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>} {/* Mostrar mensaje de error */}
      <form className="Formulario" onSubmit={handleSubmit}>
        <div className="underline-input">
          <label htmlFor="email">Correo Electrónico</label>
          <div className="hidden-input">
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              required
            />
          </div>
        </div>
        <div className="underline-input">
          <label htmlFor="password">Contraseña</label>
          <div className="hidden-input"> 
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              required
            />
          </div>
        </div>
        <div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={handleRememberMeChange}
            />{' '}
            Recuérdame
          </label>
        </div>
        <button className="botonAcceso" type="submit">
          Iniciar Sesión
        </button>
        <div className='linkIS'>
            <p>¿No tienes cuenta? Resgistrate </p>
            <p>¿Olvidaste la Contraseña? Click Aqui </p>
        </div>
      </form>
    </div>
  );
};

export default InicioSesion;
