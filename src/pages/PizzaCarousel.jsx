import Slider from 'react-slick';
import React, { useContext, useState, useEffect } from 'react';
import { _PizzaContext } from './_PizzaContext';
import '../styles/CustomerPage.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const PizzaCarousel = ({ onPizzaSelect }) => {
  const { activePizzas } = useContext(_PizzaContext);
  const [ventasPorPizza, setVentasPorPizza] = useState({});
  const [top3Tendencia, setTop3Tendencia] = useState([]);

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/registro_ventas`);
        const result = await response.json();

        if (!result.data || !Array.isArray(result.data)) {
          console.error("Error: la API no devolvió un array válido en 'data'.");
          return;
        }

        const ventasTotales = {};
        const ventasUltimaSemana = {};
        const hoy = new Date();
        const unaSemanaAtras = new Date();
        unaSemanaAtras.setDate(hoy.getDate() - 7);

        result.data.forEach((venta) => {
          const productos = JSON.parse(venta.productos);
          const fechaVenta = new Date(venta.fecha);

          productos.forEach(({ id_pizza, cantidad }) => {
            if (![101, 102, 103].includes(id_pizza)) {
              ventasTotales[id_pizza] = (ventasTotales[id_pizza] || 0) + cantidad;

              // Contar ventas solo de la última semana
              if (fechaVenta >= unaSemanaAtras) {
                ventasUltimaSemana[id_pizza] = (ventasUltimaSemana[id_pizza] || 0) + cantidad;
              }
            }
          });
        });

        setVentasPorPizza(ventasTotales);

        // Determinar el Top 3 de pizzas más vendidas en la última semana
        const top3 = Object.entries(ventasUltimaSemana)
          .sort((a, b) => b[1] - a[1]) // Ordenar por cantidad vendida en la última semana
          .slice(0, 3) // Tomar las 3 más vendidas
          .map(([id_pizza]) => parseInt(id_pizza)); // Convertir a número

        setTop3Tendencia(top3);
        
      } catch (error) {
        console.error('Error obteniendo ventas:', error);
      }
    };

    fetchVentas();
  }, []);

  if (!activePizzas || activePizzas.length === 0) {
    return <p>No hay pizzas disponibles en este momento.</p>;
  }

  const rankingIcons = ["#1️⃣", "#2️⃣", "#3️⃣", "#4️⃣", "#5️⃣"];

  const top5BestSellers = activePizzas
    .filter((pizza) => pizza.categoria !== "Base Pizza")
    .map((pizza) => ({
      ...pizza,
      ventas_historicas: ventasPorPizza[pizza.id] || 0,
      esTendencia: top3Tendencia.includes(pizza.id) // Verifica si está en el Top 3 de la última semana
    }))
    .sort((a, b) => b.ventas_historicas - a.ventas_historicas)
    .slice(0, 5);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };

  return (
    <div className="pizza-carousel">
      <h2>😍 Top 5 Best Sellers 😍</h2>
      <Slider {...settings}>
        {top5BestSellers.map((pizza, index) => (
          <div key={pizza.id} onClick={() => onPizzaSelect(pizza)} className="carousel-item">
            <div className="carousel-image-container">
              <img
                src={`${process.env.REACT_APP_API_URL}/${pizza.imagen}`}
                alt={pizza.nombre}
                className="carousel-image"
              />
            </div>
            <div className="carousel-details">
              <h3 style={{ fontWeight: '500', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                <b>{pizza.nombre}</b> - {pizza.ventas_historicas}Sold {rankingIcons[index]}
                {pizza.esTendencia ? "🔥Trend" : "↗️Rise!"} 
              </h3>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default PizzaCarousel;
