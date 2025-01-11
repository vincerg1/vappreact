import React, { useState, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import _PizzaContext from './_PizzaContext';
import '../styles/MakeARarePizza.css';
import FloatingCart from './FloatingCart';
import DeliveryForm from './DeliveryForm';
import moment from 'moment';
import axios from 'axios';

const MakeARarePizza = () => {
  const { activePizzas, updateFloatingCart, sessionData } = useContext(_PizzaContext);
  const basePizza = ['Salsa Tomate Pizza', 'Mozzarella'];
  const location = useLocation();
  const [ingredientesAleatorios, setIngredientesAleatorios] = useState([]);
  const [pizzaGenerada, setPizzaGenerada] = useState(null);
  const [sizeSeleccionado, setSizeSeleccionado] = useState('');
  const [generarIntentos, setGenerarIntentos] = useState(3); // Número de intentos permitidos
  const initialCompra = location.state?.compra || {};
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [ofertaPizzaRara, setOfertaPizzaRara] = useState(null);
  const [descuentoAleatorio, setDescuentoAleatorio] = useState(null);
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
  const basePizzaData = activePizzas.find(pizza => pizza.categoria === 'Base Pizza');

 useEffect(() => {
    console.log('Estado de compra actualizado:', compra);
  }, [compra]);
  useEffect(() => {
    console.log("Venta actualizada:", compra.venta);
  }, [compra.venta]);
  useEffect(() => {
    const updateCuponesDisponibles = async () => {
      if (ofertaPizzaRara && compra.cupones.some(cupon => cupon.Oferta_Id === ofertaPizzaRara.Oferta_Id)) {
        try {
          await axios.patch(`http://localhost:3001/ofertas/${ofertaPizzaRara.Oferta_Id}`, {
            Cupones_Disponibles: ofertaPizzaRara.Cupones_Disponibles - 1,
          });
          console.log("Cupones disponibles actualizados exitosamente.");
        } catch (error) {
          console.error("Error al actualizar Cupones_Disponibles:", error);
        }
      }
    };
  
    if (pizzaGenerada) {
      updateCuponesDisponibles();
    }
  }, [pizzaGenerada, ofertaPizzaRara, compra.cupones]);
  

  const generarIngredientesAleatorios = () => {
    const ingredientesDisponibles = [...new Set(
      activePizzas.flatMap(pizza => JSON.parse(pizza.ingredientes).map(ing => ing.ingrediente))
    )].filter(ing => !basePizza.includes(ing));
   console.log(activePizzas)
    const seleccionados = [];
    while (seleccionados.length < 2) {
      const random = ingredientesDisponibles[Math.floor(Math.random() * ingredientesDisponibles.length)];
      if (!seleccionados.includes(random)) {
        seleccionados.push(random);
      }
    }
    console.log('Ingredientes aleatorios seleccionados:', seleccionados);
    return seleccionados;
  };
  const handleGeneratePizza = async () => {
    try {
      if (generarIntentos === 0) {
        alert('Ya no tienes más intentos para generar una pizza rara.');
        return;
      }
  
      if (!sizeSeleccionado) {
        alert('Selecciona un tamaño antes de generar la pizza.');
        return;
      }
  
      // Obtener las ofertas para Pizza Rara
      const ofertaResponse = await axios.get('http://localhost:3001/ofertas');
      const ofertaEncontrada = ofertaResponse.data.data.find(
        (oferta) => oferta.Tipo_Oferta === 'Pizza Rara'
      );
      if (!ofertaEncontrada) {
        alert('No hay ofertas disponibles para Pizza Rara.');
        return;
      }
  
      const { Min_Descuento_Percent, Max_Descuento_Percent, Cupones_Disponibles } = ofertaEncontrada;
      if (Cupones_Disponibles <= 0) {
        alert('No hay cupones disponibles para esta oferta.');
        return;
      }
  
      // Generar un descuento aleatorio dentro del rango
      const descuentoAleatorio = Math.floor(
        Math.random() * (Max_Descuento_Percent - Min_Descuento_Percent + 1)
      ) + Min_Descuento_Percent;
  
      // Obtener la base de pizza
      const response = await axios.get('http://localhost:3001/menu_pizzas');
      const pizzasBase = response.data.data.filter(
        (pizza) => pizza.categoria.toLowerCase() === 'base pizza'
      );
  
      if (pizzasBase.length === 0) {
        throw new Error('No se encontraron pizzas base en la API.');
      }
  
      const basePizza = pizzasBase[0];
      const priceBySize = JSON.parse(basePizza.PriceBySize);
      const precioBase = parseFloat(priceBySize[sizeSeleccionado]);
  
      if (isNaN(precioBase)) {
        throw new Error('El precio de la base de pizza no es válido.');
      }
  
      // Obtener los precios de ingredientes extras
      const responseExtraPrices = await axios.get('http://localhost:3001/IngredientExtraPrices');
      const extraPrices = responseExtraPrices.data.reduce((acc, item) => {
        acc[item.size] = item.extra_price;
        return acc;
      }, {});
  
      // Generar ingredientes aleatorios
      const ingredientes = generarIngredientesAleatorios();
      const ingredientesExtra = activePizzas
        .flatMap((pizza) => JSON.parse(pizza.ingredientes))
        .filter((ing) => ingredientes.includes(ing.ingrediente))
        .map((ing) => ({
          IDI: ing.IDI,
          nombre: ing.ingrediente,
          precio: extraPrices[sizeSeleccionado] || 0, // Precio según el tamaño
        }));
  
      // Evitar duplicados en `extraIngredients`
      const ingredientesUnicos = ingredientesExtra.filter(
        (ing, index, self) => index === self.findIndex((t) => t.IDI === ing.IDI)
      );
  
      // Calcular el precio total de los ingredientes extra
      const precioIngredientesExtra = ingredientesUnicos.reduce((acc, ing) => acc + ing.precio, 0);
  
      // Calcular el precio sin descuento
      const totalSinDescuento = precioBase + precioIngredientesExtra;
  
      // Crear nueva pizza
      const nuevaPizza = {
        id: 103,
        nombre: 'Pizza Personalizada 3',
        size: sizeSeleccionado,
        cantidad: 1,
        ingredientes: ['Salsa Tomate Pizza', 'Mozzarella', ...ingredientes],
        extraIngredients: ingredientesUnicos,
        descuento: descuentoAleatorio, // Guardar el porcentaje de descuento
        totalSinDescuento: parseFloat(totalSinDescuento.toFixed(2)), // Precio sin descuento
        precioBase: precioBase,
        precioIngredientesExtra: precioIngredientesExtra,
        total: parseFloat(totalSinDescuento.toFixed(2)), // Total sin aplicar descuento
      };
  
      setOfertaPizzaRara(ofertaEncontrada);
      setPizzaGenerada(nuevaPizza);
      setDescuentoAleatorio(descuentoAleatorio);
      setGenerarIntentos((prev) => prev - 1);
    } catch (error) {
      console.error('Error al generar la pizza rara:', error);
    }
  };
  const handleAddToCart = async () => {
    if (!pizzaGenerada) {
      alert('Primero genera una pizza rara.');
      return;
    }
  
    const cuponRandomPizza = {
      Oferta_Id: ofertaPizzaRara.Oferta_Id,
      Codigo_Oferta: ofertaPizzaRara.Codigo_Oferta,
      Descuento: descuentoAleatorio / 100, // Ejemplo: 0.15 si es 15%
      Max_Amount: ofertaPizzaRara.Max_Amount,
      Tipo_Cupon: ofertaPizzaRara.Tipo_Cupon,
    };
  
    setCompra((prev) => {
      const nuevaVenta = [...prev.venta, pizzaGenerada];
      const nuevoTotal = nuevaVenta.reduce((acc, item) => acc + item.totalSinDescuento, 0);
  
      return {
        ...prev,
        venta: nuevaVenta,
        cupones: [...prev.cupones, cuponRandomPizza],
        total_productos: parseFloat(nuevoTotal.toFixed(2)), // Total sin descuentos
      };
    });
  
    setPizzaGenerada(null);
    setSizeSeleccionado('');
    setIngredientesAleatorios([]);
    setDescuentoAleatorio(null);
    setOfertaPizzaRara(null);
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
