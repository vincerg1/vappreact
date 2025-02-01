import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { _PizzaContext } from './_PizzaContext';
import FormIS from '../styles/FormIS.css';

const CLIENT_ID = '718859045648-ac01g0oqu3pdd87tc84n195harhp5t57.apps.googleusercontent.com';

const InicioSesion = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { updateSessionData } = useContext(_PizzaContext);
  const [registerTermsAccepted, setRegisterTermsAccepted] = useState(false); 
  const [activeTab, setActiveTab] = useState('login');
  const handleEmailChange = (e) => setEmail(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  const navigate = useNavigate();

  const handleLoginOrRememberMe = async (e) => {
    e.preventDefault();
    setErrorMessage('');
  
    try {
      if (email && password) {
        console.log('Attempting login with email and password:', email); // Log para confirmar que se intenta iniciar sesión
  
        // Intentar iniciar sesión con email y contraseña
        const { data } = await axios.post('http://localhost:3001/api/auth/login', { email, password });
        console.log('Data received from backend:', data); // Verifica los datos que llegan del backend
  
        const { id_cliente, email: emailFromDB, ticketPromedio, ...rest } = data;
        const ticketObjetivo = (ticketPromedio * 1.1).toFixed(2);
  
        updateSessionData({
          id_cliente,
          email: emailFromDB,
          ticketPromedio,
          ticketObjetivo,
          ...rest,
        });
  
        console.log('Session data after update:', {
          id_cliente,
          email: emailFromDB,
          ticketPromedio,
          ticketObjetivo,
          ...rest,
        }); // Confirma que se actualizó correctamente el contexto
  
        navigate('/customer');
      } else if (email && !password) {
        console.log('Attempting Remember Me with email:', email); // Verifica el intento de recordar contraseña
  
        // Intentar "Remember Me" con solo email
        const { data } = await axios.post('http://localhost:3001/api/auth/remember-me', { email });
        console.log('Password loaded from backend:', data.password); // Verifica la contraseña cargada
  
        setPassword(data.password); // Rellenar automáticamente la contraseña
        alert('Credentials loaded. Press the button again to log in.');
      } else {
        setErrorMessage('Please enter your email.');
      }
    } catch (error) {
      console.error('Error during login:', error); // Muestra el error completo en la consola
  
      const status = error.response?.status;
      if (status === 403) {
        setErrorMessage('Your account is temporarily suspended.');
      } else if (status === 401 || status === 404) {
        setErrorMessage('Verify your registered email in your inbox.');
      } else {
        setErrorMessage('Server error. Please try again later.');
      }
    }
  };  
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      await axios.post('http://localhost:3001/agregar_cliente', { email, password });
      alert('Registration successful! Please log in.');
      setActiveTab('login');
      setEmail('');
      setPassword('');
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          setErrorMessage('This email is already registered. Please use another email.');
        } else if (error.response.status === 500) {
          setErrorMessage('Server error. Please try again later.');
        } else {
          setErrorMessage('Unexpected error. Please try again.');
        }
      } else {
        setErrorMessage('Network error. Please check your connection.');
      }
      console.error('Error registering user:', error);
    }
  };
  const handleGoogleSuccess = async (credentialResponse) => {
    const { credential } = credentialResponse;
    try {
      const { data } = await axios.post('http://localhost:3001/api/auth/google-login', {
        token: credential,
      });

      const { id_cliente, email, ticketPromedio, ...rest } = data;
      const ticketObjetivo = (ticketPromedio * 1.1).toFixed(2);

      updateSessionData({
        id_cliente,
        email,
        ticketPromedio,
        ticketObjetivo,
        ...rest,
      });

      navigate('/customer');
    } catch (error) {
      setErrorMessage('Google login failed. Please try again.');
    }
  };
  const handleGoogleFailure = () => {
    setErrorMessage('Google login failed. Please try again.');
  };
  
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="FormIS-Container">
        {activeTab === 'login' && (
          <form className="FormIS-login" onSubmit={handleLoginOrRememberMe}>
            <div className="FormIS-form-header">
              <button
                type="button"
                className={`FormIS-form-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Log In
              </button>
              <button
                type="button"
                className={`FormIS-form-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                Register
              </button>
            </div>
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
            <div className="FormIS-underline-input">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                placeholder="Enter your email"
                onChange={handleEmailChange}
                required
              />
            </div>
            <div className="FormIS-underline-input">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                placeholder="Enter your password"
                onChange={handlePasswordChange}
              />
            </div>
  
            {/* El botón depende únicamente del estado de Login */}
            <button 
              className="FormIS-botonAcceso" 
              type="submit" 
              title={password ? "" : "Ingresa tu correo electrónico para recordar tus credenciales"}
            >
              {password ? 'Log In' : 'Remember Me'}
            </button>
  
            <div style={{ marginTop: '20px' }}>
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleFailure} />
            </div>
          </form>
        )}
  
        {activeTab === 'register' && (
          <form className="FormIS-register" onSubmit={handleRegister}>
            <div className="FormIS-form-header">
              <button
                type="button"
                className={`FormIS-form-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Log In
              </button>
              <button
                type="button"
                className={`FormIS-form-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                Register
              </button>
            </div>
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
            <div className="FormIS-underline-input">
              <label htmlFor="register-email">Email</label>
              <input
                type="email"
                id="register-email"
                value={email}
                placeholder="Enter your email"
                onChange={handleEmailChange}
                required
              />
            </div>
            <div className="FormIS-underline-input">
              <label htmlFor="register-password">Password</label>
              <input
                type="password"
                id="register-password"
                value={password}
                placeholder="Create a password"
                onChange={handlePasswordChange}
                required
              />
            </div>
  
            {/* Checkbox de Términos y Condiciones */}
            <div className="terms-checkbox">
              <input
                type="checkbox"
                id="terms"
                checked={registerTermsAccepted}
                onChange={() => setRegisterTermsAccepted(!registerTermsAccepted)}
                required
              />
              <label htmlFor="terms">
                I confirm that I have read, consent and agree to{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Use</a> and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>{' '}
                of <strong>VoltaPizzaApp</strong>.
              </label>
            </div>
  
            {/* Botón de registro condicionado a términos */}
            <button
              className="FormIS-botonAcceso"
              type="submit"
              disabled={!registerTermsAccepted}
              title={!registerTermsAccepted ? "Debes aceptar los términos y condiciones para continuar con el registro." : ""}
            >
              Register
            </button>
  
            {/* Botón de Google condicionado a términos */}
            <div 
              style={{ marginTop: '20px' }}
              title={!registerTermsAccepted ? "Debes aceptar los términos y condiciones para continuar con Google." : ""}
            >
              <div style={{ opacity: !registerTermsAccepted ? 0.5 : 1, pointerEvents: !registerTermsAccepted ? 'none' : 'auto' }}>
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleFailure} />
              </div>
            </div>
          </form>
        )}
      </div>
    </GoogleOAuthProvider>
  );
  
  
  
  
};

export default InicioSesion;
