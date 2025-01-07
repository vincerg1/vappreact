import React, { useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import _PizzaContext from './_PizzaContext';
import '../styles/MakeARarePizza.css';
import FloatingCart from './FloatingCart';
import DeliveryForm from './DeliveryForm';
import moment from 'moment';

const MakeARarePizza = () => {
  const { activePizzas, updateFloatingCart, sessionData } = useContext(_PizzaContext);
  const basePizza = ['Salsa Tomate Pizza', 'Mozzarella'];
  const location = useLocation();
  const [ingredientesAleatorios, setIngredientesAleatorios] = useState([]);
  const [descuento, setDescuento] = useState(null);
  const [pizzaGenerada, setPizzaGenerada] = useState(false);
  const [sizeSeleccionado, setSizeSeleccionado] = useState('');
  const [generarIntentos, setGenerarIntentos] = useState(3); // Número de intentos permitidos
  const initialCompra = location.state?.compra || {};
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [compra, setCompra] = useState({
    observaciones: '',
    id_orden: '',
    Entrega: {},
    fecha: moment().format('YYYY-MM-DD'),
    hora: moment().format('HH:mm:ss'),
    id_cliente: sessionData?.id_cliente || '',
    DescuentosDailyChallenge: 0,
    cupones: initialCompra.cupones || [],
    venta: initialCompra.venta || [],
    total_productos: initialCompra.total_productos || 0.0,
    total_descuentos: initialCompra.total_descuentos || 0.0,
    total_a_pagar_con_descuentos: initialCompra.total_a_pagar_con_descuentos || 0.0,
    venta_procesada: 0,
    origen: 'MakeARarePizza',
  });

  const sizesDisponibles = [...new Set(activePizzas.flatMap(pizza => JSON.parse(pizza.selectSize)))];

  const generarIngredientesAleatorios = () => {
    const ingredientesDisponibles = [...new Set(
      activePizzas.flatMap(pizza => JSON.parse(pizza.ingredientes).map(ing => ing.ingrediente))
    )].filter(ing => !basePizza.includes(ing));

    const seleccionados = [];
    while (seleccionados.length < 2) {
      const random = ingredientesDisponibles[Math.floor(Math.random() * ingredientesDisponibles.length)];
      if (!seleccionados.includes(random)) {
        seleccionados.push(random);
      }
    }
    return seleccionados;
  };

  const handleGeneratePizza = () => {
    if (generarIntentos === 0) {
      alert('Ya no tienes más intentos para generar una pizza rara.');
      return;
    }

    if (!sizeSeleccionado) {
      alert('Selecciona un tamaño antes de generar la pizza.');
      return;
    }

    const ingredientes = generarIngredientesAleatorios();
    const descuentoAleatorio = Math.floor(Math.random() * (10 - 1 + 1)) + 1; // Descuento entre 1% y 10%
    setIngredientesAleatorios(ingredientes);
    setDescuento(descuentoAleatorio);

    const nuevaPizza = {
      id: 103,
      nombre: 'Pizza Personalizada 3',
      size: sizeSeleccionado,
      ingredientes: ['Salsa Tomate Pizza', 'Mozzarella', ...ingredientes],
      descuento: descuentoAleatorio,
      precioBase: 10,
      total: 10 - (10 * descuentoAleatorio) / 100,
    };

    setPizzaGenerada(nuevaPizza);
    setGenerarIntentos(prev => prev - 1); // Reducir los intentos disponibles
  };

  const handleAddToCart = () => {
    if (!pizzaGenerada) {
      alert('Primero genera una pizza rara.');
      return;
    }

    const nuevaPizza = {
      ...pizzaGenerada,
      cantidad: 1,
      ingredientes: [...basePizza, ...ingredientesAleatorios],
      extraIngredients: ingredientesAleatorios.map(ing => ({
        nombre: ing,
        precio: 1.5,
      })),
    };

    setCompra(prev => {
      const nuevaVenta = [...prev.venta, nuevaPizza];
      const nuevoTotal = nuevaVenta.reduce((acc, item) => acc + item.total, 0);

      return {
        ...prev,
        venta: nuevaVenta,
        total_productos: nuevoTotal,
        total_a_pagar_con_descuentos: nuevoTotal,
      };
    });

    setPizzaGenerada(null);
    setSizeSeleccionado('');
    setIngredientesAleatorios([]);
    setDescuento(null);
    alert('Pizza añadida al carrito.');
  };

  const handleNextStep = () => {
    if (compra.venta.length === 0) {
      alert('Debes añadir al menos una pizza al carrito antes de continuar.');
      return;
    }
    setShowDeliveryForm(true);
  };

  return (
    <div className="make-a-rare-pizza">
      <FloatingCart
        compra={compra}
        setCompra={setCompra}
        handleNextStep={handleNextStep}
      />

      {showDeliveryForm ? (
        <DeliveryForm compra={compra} setCompra={setCompra} />
      ) : (
        <>
          <h2>Make A Rare Pizza</h2>
          <p>Selecciona un tamaño y genera tu Pizza Rara con un descuento único.</p>

          <div className="size-selector">
            <select
              value={sizeSeleccionado}
              onChange={e => setSizeSeleccionado(e.target.value)}
            >
              <option value="">Selecciona un tamaño</option>
              {sizesDisponibles.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <button
            className="generate-button"
            onClick={handleGeneratePizza}
            disabled={generarIntentos === 0}
          >
            {pizzaGenerada ? `Volver a Generar (${generarIntentos} intentos restantes)` : 'Generar Pizza'}
          </button>

          {pizzaGenerada && (
            <div className="pizza-card">
              <h3>Tu Pizza Rara</h3>
              <p><strong>Tamaño:</strong> {pizzaGenerada.size}</p>
              <p><strong>Ingredientes:</strong> {pizzaGenerada.ingredientes.join(', ')}</p>
              <p><strong>Descuento:</strong> {pizzaGenerada.descuento}%</p>
              <p><strong>Total:</strong> {pizzaGenerada.total.toFixed(2)}€</p>
              <button className="add-to-cart" onClick={handleAddToCart}>
                Añadir al Carrito
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MakeARarePizza;
