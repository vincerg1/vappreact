import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/inicio_style.css';

export const Inicio = () => {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false); // ✅ Estado de carga agregado

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); // ⏳ Inicia la carga
    setError(null);

    try {
      const response = await axios.post('http://localhost:3001/admin/login', { correo, contrasena });

      if (response.data.admin) {
        localStorage.setItem('loggedIn', JSON.stringify(true));
        localStorage.setItem('admin', JSON.stringify(response.data.admin));

        setLoggedIn(true);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setError('❌ Credenciales incorrectas. Intenta nuevamente.');
      } else {
        setError('⚠ Error al iniciar sesión. Inténtalo más tarde.');
      }
    } finally {
      setLoading(false); // 🔄 Finaliza la carga
    }
  };

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
          <h2 className="login-title">Inicio de Sesión - Administrador</h2>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="correo">Correo:</label>
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
              <label htmlFor="contrasena">Contraseña:</label>
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
            ¿No tienes una cuenta?{' '}
            <span onClick={() => navigate('/register')} className="register-link-text">
              Crear una cuenta
            </span>
          </p>
        </section>
      ) : (
        <>
          <h1 className="PDCRL">Panel de Control / My_Backoffice</h1>
          <section className="contenedorPC">
            <button className="background_icon_button informacion" onClick={handleInformacionClick}>
              <span>Información</span>
            </button>
            <button className="background_icon_button menu" onClick={handleMenuClick}>
              <span>Menú</span>
            </button>
            <button className="background_icon_button clientes" onClick={handleClientesClick}>
              <span>Clientes</span>
            </button>
            <button className="background_icon_button inventario" onClick={handleInvClick}>
              <span>Inventario</span>
            </button>
            <button className="background_icon_button seguimiento" onClick={handleSeguimientoClick}>
              <span>Seguimiento</span>
            </button>
            <button className="background_icon_button ofertas" onClick={handleOffersClick}>
              <span>Ofertas</span>
            </button>
            <button className="background_icon_button routesetter" onClick={handleRouteSetterClick}>
              <span>RouteSetter</span>
            </button>
            <button className="background_icon_button ControlHorarioIndex" onClick={handleControlHorarioIndexSetterClick}>
              <span>Control Horario</span>
            </button>
          </section>
        </>
      )}
    </div>
  );
};

export default Inicio;

