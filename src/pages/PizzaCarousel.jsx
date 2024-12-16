
import Slider from 'react-slick';
import React, { useContext } from 'react';
import { _PizzaContext } from './_PizzaContext';
import '../styles/CustomerPage.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const PizzaCarousel = ({ onPizzaSelect }) => {
  const { activePizzas } = useContext(_PizzaContext);

  if (!activePizzas || activePizzas.length === 0) {
    return <p>No hay pizzas disponibles en este momento.</p>;
  }

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
      <h2>Pizzas Disponibles Hoy</h2>
      <Slider {...settings}>
        {activePizzas.map((pizza) => (
          <div key={pizza.id} onClick={() => onPizzaSelect(pizza)} className="carousel-item">
            <div className="carousel-image-container">
              <img
                src={`http://localhost:3001/${pizza.imagen}`}
                alt={pizza.nombre}
                className="carousel-image"
              />
            </div>
            <div className="carousel-details">
              <h3>{pizza.nombre}</h3>
              <p>{pizza.descripcion || 'Deliciosa pizza artesanal.'}</p>
              <p>
                Desde <strong>{pizza.price ? `${pizza.price}€` : 'Consultar'}</strong>
              </p>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};


export default PizzaCarousel;
