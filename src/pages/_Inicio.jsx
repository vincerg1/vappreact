import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/inicio_style.css';

export const Inicio = () => {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => {
    const storedLoggedIn = localStorage.getItem('loggedIn');
    return storedLoggedIn ? JSON.parse(storedLoggedIn) : false;
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin/login`, { correo, contrasena });
      if (response.data.admin) {
        // Guardamos en localStorage
        localStorage.setItem('loggedIn', JSON.stringify(true));
        localStorage.setItem('admin', JSON.stringify(response.data.admin));

        // Actualizamos el estado
        setLoggedIn(true);

        // Navegamos al Backoffice
        navigate('/_Inicio');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setError('❌ Credenciales incorrectas. Intenta nuevamente.');
      } else {
        setError('⚠ Error al iniciar sesión. Inténtalo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('admin');
    setLoggedIn(false);


    navigate('/_Inicio');
  };

  useEffect(() => {
    if (loggedIn) {
      navigate('/_Inicio');
    }
  }, [loggedIn, navigate]);

  const handleInformacionClick = () => navigate('/_Inicio/_Informacion');
  const handleMenuClick = () => navigate('/_Inicio/_Menu_p1');
  const handleInvClick = () => navigate('/_Inicio/_InvIngDB');
  const handleOffersClick = () => navigate('/offers');
  const handleClientesClick = () => navigate('/clientes');
  const handleSeguimientoClick = () => navigate('/seguimiento');
  const handleRouteSetterClick = () => navigate('/RouteSetterAdmin');
  const handleControlHorarioIndexSetterClick = () => navigate('/control-horario');

  return (
    <div className="login-container">
      {!loggedIn ? (
        <section className="login-section">
          <h2 className="login-title">Login - Administrator</h2>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="correo">Email:</label>
              <input
                type="email"
                id="correo"
                placeholder="ejemplo@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="contrasena">Password:</label>
              <input
                type="password"
                id="contrasena"
                placeholder="********"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="register-link">
            Don't have an account?{' '}
            <span onClick={() => navigate('/register')} className="register-link-text">
            Create an account
            </span>
          </p>
        </section>
      ) : (
        <>
          <h1>My_Backoffice</h1>
          <section className="contenedorPC">
            <button className="background_icon_button informacion" onClick={handleInformacionClick}>
              <span>Information</span>
            </button>
            <button className="background_icon_button menu" onClick={handleMenuClick}>
              <span>Menu</span>
            </button>
            <button className="background_icon_button clientes" onClick={handleClientesClick}>
              <span>Customers</span>
            </button>
            <button className="background_icon_button inventario" onClick={handleInvClick}>
              <span>Inventory</span>
            </button>
            <button className="background_icon_button seguimiento" onClick={handleSeguimientoClick}>
              <span>My_Zones</span>
            </button>
            <button className="background_icon_button ofertas" onClick={handleOffersClick}>
              <span>Offers</span>
            </button>
            <button className="background_icon_button routesetter" onClick={handleRouteSetterClick}>
              <span>Route_Setter</span>
            </button>
            <button className="background_icon_button ControlHorarioIndex" onClick={handleControlHorarioIndexSetterClick}>
              <span>Schedule_Control</span>
            </button>
          </section>
             <button className="logout-button" onClick={handleLogout}>
             Sign Out!
          </button>
        </>
      )}
    
    </div>
  );
};

export default Inicio;
