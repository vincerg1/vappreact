import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/OrderNow.css'; // Asegúrate de que este archivo esté enlazado correctamente

const OrderNow = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Obtener el estado pasado desde CustomerPage
  const { compra } = location.state || {}; // Extraer el estado de compra pasado

  const handleMenuClick = () => {
    navigate('/customerMenu', { state: { compra } }); // Pasar la prop "compra" a CustomerMenu
  };

  const handleMakeYourPizzaClick = () => {
    navigate('/make-your-pizza', { state: { compra } });  // Pasar la prop "compra" a MakeYourPizza si es necesario
  };

  const handleMakeARarePizzaClick = () => {
    navigate('/rare-pizza', { state: { compra } });
  };

  return (
    <div className="order-now-container">
      <h1>Order Now</h1>
      <button onClick={handleMenuClick}>Menú</button>
      <button onClick={handleMakeYourPizzaClick}>Make Your Pizza</button>
      <button onClick={handleMakeARarePizzaClick}>Make a Rare Pizza</button>
    </div>
  );
};

export default OrderNow;
