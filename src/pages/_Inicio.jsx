import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import inicio_style from '../styles/inicio_style.css';

export const Inicio = () => {
  const navigate = useNavigate();

  // Estado para el formulario de inicio de sesión
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false); // Control de acceso al panel

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3001/admin/login', { correo, contrasena });

      if (response.data.admin) {
        // Guardar información en localStorage
        localStorage.setItem('loggedIn', JSON.stringify(true));
        localStorage.setItem('admin', JSON.stringify(response.data.admin));
        
        // Actualizar el estado de inicio de sesión
        setLoggedIn(true);
        setError(null);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setError('Credenciales incorrectas. Por favor, intenta nuevamente.');
      } else {
        setError('Error al iniciar sesión. Por favor, intenta más tarde.');
      }
    }
  };

  // Funciones de navegación
  const handleInformacionClick = () => navigate('/_Inicio/_Informacion');
  const handleMenuClick = () => navigate('/_Inicio/_Menu_p1');
  const handleInvClick = () => navigate('/_Inicio/_InvIngDB');
  const handleOffersClick = () => navigate('/offers');
  const handleClientesClick = () => navigate('/clientes');
  const handleSeguimientoClick = () => navigate('/seguimiento');
  const handleRouteSetterClick = () => navigate('/RouteSetterAdmin');

  return (
    <div>
      {!loggedIn ? (
        // Mostrar formulario de inicio de sesión
        <section className="login-section">
          <h2>Inicio de Sesión - Administrador</h2>
          <form onSubmit={handleLogin}>
            <div>
              <label htmlFor="correo">Correo:</label>
              <input
                type="email"
                id="correo"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="contrasena">Contraseña:</label>
              <input
                type="password"
                id="contrasena"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <button type="submit">Iniciar Sesión</button>
          </form>
          <p>
            ¿No tienes una cuenta?{' '}
            <a href="/register" onClick={() => navigate('/register')}>
              Crear una cuenta
            </a>
          </p>
        </section>
      ) : (
        // Mostrar panel de control con el encabezado
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
          </section>
        </>
      )}
    </div>
  );
  
};

export default Inicio;
