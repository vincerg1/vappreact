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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const handleEmailChange = (e) => setEmail(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);


  const handleLoginOrRememberMe = async (e) => {
    e.preventDefault();
    setErrorMessage('');
  
    try {
      if (email && password) {
        // Intentar iniciar sesión con email y contraseña
        const { data } = await axios.post('http://localhost:3001/api/auth/login', { email, password });
  
        const { id_cliente, email: emailFromDB, ticketPromedio, ...rest } = data;
        const ticketObjetivo = (ticketPromedio * 1.1).toFixed(2);
  
        updateSessionData({
          id_cliente,
          email: emailFromDB,
          ticketPromedio,
          ticketObjetivo,
          ...rest,
        });
  
        navigate('/customer');
      } else if (email && !password) {
        // Intentar "Remember Me" con solo email
        const { data } = await axios.post('http://localhost:3001/api/auth/remember-me', { email });
  
        setPassword(data.password); // Rellenar automáticamente la contraseña
        alert('Credentials loaded. Press the button again to log in.');
      } else {
        setErrorMessage('Please enter your email.');
      }
    } catch (error) {
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
            <button className="FormIS-botonAcceso" type="submit">
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
            <button className="FormIS-botonAcceso" type="submit">
              Register
            </button>
            <div style={{ marginTop: '20px' }}>
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleFailure} />
            </div>
          </form>
        )}
      </div>
    </GoogleOAuthProvider>
  );
};

export default InicioSesion;
