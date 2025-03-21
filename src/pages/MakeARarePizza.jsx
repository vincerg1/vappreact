import React, { useState, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import _PizzaContext from './_PizzaContext';
import FloatingCart from './FloatingCart';
import DeliveryForm from './DeliveryForm';
import moment from 'moment';
import axios from 'axios';
import '../styles/MakeARarePizza.css';

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
  const [timeLeft, setTimeLeft] = useState(null);
  const [ingredientesMenosUsados, setIngredientesMenosUsados] = useState([]);
  const [rareIngredientsFiltered, setRareIngredientsFiltered] = useState([]);
  const [menuPizzas, setMenuPizzas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [compra, setCompra] = useState({
    observaciones: '',
    id_order: '',
    Entrega: {},
    fecha: moment().format('YYYY-MM-DD'),
    hora: moment().format('HH:mm:ss'),
    id_cliente: sessionData?.id_cliente || '',
    DescuentosDailyChallenge: 0,
    cupones: Array.isArray(initialCompra?.cupones) ? initialCompra.cupones : [],  // ✅ Siempre será un array
    venta: Array.isArray(initialCompra?.venta) ? initialCompra.venta : [],      // ✅ Siempre será un array
    total_productos: initialCompra?.total_productos || 0.0,
    total_descuentos: initialCompra?.total_descuentos || 0.0,
    total_a_pagar_con_descuentos: initialCompra?.total_a_pagar_con_descuentos || 0.0,
    venta_procesada: 0,
    origen: 'MakeARarePizza',
  });

  const sizesDisponibles = [...new Set(activePizzas.flatMap(pizza => JSON.parse(pizza.selectSize)))];
  const basePizzaData = activePizzas.find(pizza => pizza.categoria === 'Base Pizza');


  useEffect(() => {
    const fetchMenuPizzas = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/menu_pizzas`);
        if (response.data && Array.isArray(response.data.data)) {
          console.log("📦 Menú Pizzas cargado desde BD:", response.data.data);
          setMenuPizzas(response.data.data);
        } else {
          console.warn("⚠️ Respuesta inesperada de menu_pizzas:", response.data);
        }
      } catch (error) {
        console.error("❌ Error al obtener menu_pizzas:", error);
      }
    };
  
    fetchMenuPizzas();
  }, []);
  useEffect(() => {
    const fetchInventario = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/inventario`);
        if (response.data && Array.isArray(response.data.data)) {
          console.log("📋 Inventario cargado desde BD:", response.data.data);
          setInventario(response.data.data);
        } else {
          console.warn("⚠️ Respuesta inesperada de inventario:", response.data);
        }
      } catch (error) {
        console.error("❌ Error al obtener inventario:", error);
      }
    };
  
    fetchInventario();
  }, []);
  useEffect(() => {
    console.log('Estado de compra actualizado:', compra);
  }, [compra]);
  useEffect(() => {
    console.log("Venta actualizada:", compra.venta);
  }, [compra.venta]);
  useEffect(() => {
    const fetchOfertaPizzaRara = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/ofertas`);
        const oferta = response.data.data.find(
          (oferta) => oferta.Tipo_Oferta === 'Random Pizza'
        );
    
        if (oferta) {
          if (!oferta.Hora_Fin) {
            console.warn('La oferta no tiene una hora de fin válida.');
          }
          if (typeof oferta.Precio_Cupon !== 'number') {
            console.warn('El Precio_Cupon no es válido.');
          }
          setOfertaPizzaRara(oferta);
          calculateTimeLeft(oferta);
          if (shouldResetCoupons(oferta)) {
            resetCoupons(oferta); 
          }
        } else {
          console.warn('No se encontró una oferta para Random Pizza.');
        }
      } catch (error) {
        console.error('Error al obtener la oferta de Random Pizza:', error);
      }
    };
  
    fetchOfertaPizzaRara();
  }, []);
  useEffect(() => {
    if (!timeLeft) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval); // Limpiar intervalo al desmontar
  }, [timeLeft]);
  useEffect(() => {
    const fetchIngredientesMenosUsados = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/ingredientes-uso`);
        if (response.data && Array.isArray(response.data)) {
          // Ordenar ingredientes por total_vendido
          const ingredientesOrdenados = response.data.sort((a, b) => a.total_vendido - b.total_vendido);
          
          // Calcular la mediana
          const mitad = Math.floor(ingredientesOrdenados.length / 2);
          const menosUsados = ingredientesOrdenados.slice(0, mitad);
          
          console.log("📊 Ingredientes por debajo de la mediana:", menosUsados);
          setIngredientesMenosUsados(menosUsados);
        }
      } catch (error) {
        console.error("❌ Error al obtener ingredientes menos usados:", error);
      }
    };

    fetchIngredientesMenosUsados();
  }, []);
  useEffect(() => {
    if (!sizeSeleccionado || ingredientesMenosUsados.length === 0 || menuPizzas.length === 0 || !Array.isArray(inventario) || inventario.length === 0) {
      console.warn("⚠️ No se puede filtrar ingredientes raros. Verifica los datos disponibles.");
      setRareIngredientsFiltered([]);
      return;
    }
  
    console.log("✅ Filtrando ingredientes raros para tamaño:", sizeSeleccionado);
    console.log("📌 Ingredientes menos usados:", ingredientesMenosUsados);
    console.log("📦 Menú Pizzas:", menuPizzas);
    console.log("📋 Inventario:", inventario);
  
    let allActiveIngredients = [];
  
    menuPizzas.forEach((pizza) => {
      const ingArray = JSON.parse(pizza.ingredientes || "[]");
      ingArray.forEach((ing) => {
        const itemInventario = inventario.find((inv) => inv.IDI === ing.IDI);
        const estadoGEN = itemInventario ? itemInventario.estadoGEN : 1; // 1 = Inactivo por defecto si no se encuentra
  
        allActiveIngredients.push({
          IDI: ing.IDI,
          nombre: ing.ingrediente.trim().toLowerCase(),
          cantBySize: ing.cantBySize,
          estadoGEN: estadoGEN,
        });
      });
    });
  
    console.log("🔍 Todos los ingredientes activos en el menú:", allActiveIngredients);
  
    const filtered = ingredientesMenosUsados
      .map((menosUsado) => {
        const found = allActiveIngredients.find(
          (item) =>
            item.nombre === menosUsado.ingrediente.trim().toLowerCase() &&
            item.estadoGEN === 0 &&
            (item.cantBySize?.[sizeSeleccionado] || 0) > 0
        );
        return found || null;
      })
      .filter(Boolean);
  
    console.log("✅ Ingredientes raros disponibles para la Random Pizza en tamaño", sizeSeleccionado, ":", filtered);
    setRareIngredientsFiltered(filtered);
  }, [sizeSeleccionado, ingredientesMenosUsados, menuPizzas, inventario]);
  

  const generarIngredientesAleatoriosDesdeFiltrados = () => {
    if (!rareIngredientsFiltered || rareIngredientsFiltered.length === 0) {
      console.warn("⚠️ No hay ingredientes raros disponibles para este tamaño.");
      return [];
    }
  
    console.log("🎲 Rare Ingredients antes de la selección aleatoria:", rareIngredientsFiltered);
  
    const ingredientesDisponibles = [...rareIngredientsFiltered];
    const seleccionados = [];
  
    while (seleccionados.length < 2 && ingredientesDisponibles.length > 0) {
      const randomIndex = Math.floor(Math.random() * ingredientesDisponibles.length);
      const ingredienteSeleccionado = ingredientesDisponibles.splice(randomIndex, 1)[0];
  
      if (ingredienteSeleccionado.cantBySize[sizeSeleccionado] > 0) {
        seleccionados.push(ingredienteSeleccionado);
      }
    }
  
    if (seleccionados.length === 0) {
      console.warn("⚠️ No se seleccionaron ingredientes aleatorios. Verifica la disponibilidad.");
    }
  
    console.log("✅ Ingredientes aleatorios seleccionados para la Random Pizza:", seleccionados);
    return seleccionados;
  };
  const getCouponMessage = (oferta) => {
    if (!oferta) return 'No offers available';
  
    const { Categoria_Cupon, Precio_Cupon, Min_Descuento_Percent, Max_Descuento_Percent } = oferta;
  
    if (Categoria_Cupon === 'gratis') {
      return `Today you can get a free discount between ${Min_Descuento_Percent}% and ${Max_Descuento_Percent}%.`;
    }
  
    if (Categoria_Cupon === 'pago' && typeof Precio_Cupon === 'number' && !isNaN(Precio_Cupon)) {
      return `Today you can get a discount between ${Min_Descuento_Percent}% and ${Max_Descuento_Percent}% for just ${Precio_Cupon.toFixed(2)}€ per coupon.`;
    }
  
    return 'Coupon details unavailable.';
  };  
  const handleGeneratePizza = async () => {
    try {
      if (generarIntentos === 0) {
        alert("Ya no tienes más intentos para generar una pizza rara.");
        return;
      }
  
      if (!sizeSeleccionado) {
        alert("Selecciona un tamaño antes de generar la pizza.");
        return;
      }
  
      // 🔹 Obtener oferta de Random Pizza
      const ofertaResponse = await axios.get(`${process.env.REACT_APP_API_URL}/ofertas`);
      const ofertaEncontrada = ofertaResponse.data.data.find(
        (oferta) => oferta.Tipo_Oferta === "Random Pizza"
      );
  
      if (!ofertaEncontrada) {
        alert("No hay ofertas disponibles para Random Pizza.");
        return;
      }
  
      const { Min_Descuento_Percent, Max_Descuento_Percent, Cupones_Disponibles } = ofertaEncontrada;
      if (Cupones_Disponibles <= 0) {
        alert("No hay cupones disponibles para esta oferta.");
        return;
      }
  
      // 🔹 Generar un descuento aleatorio dentro del rango
      const descuentoAleatorio = Math.floor(
        Math.random() * (Max_Descuento_Percent - Min_Descuento_Percent + 1)
      ) + Min_Descuento_Percent;
  
      // 🔹 Obtener base de pizza desde `menu_pizzas`
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/menu_pizzas`);
      const pizzasBase = response.data.data.filter(
        (pizza) => pizza.categoria.toLowerCase() === "base pizza"
      );
  
      if (pizzasBase.length === 0) {
        throw new Error("No se encontraron pizzas base en la API.");
      }
  
      const basePizza = pizzasBase[0];
      const priceBySize = JSON.parse(basePizza.PriceBySize);
      const precioBase = parseFloat(priceBySize[sizeSeleccionado]);
  
      if (isNaN(precioBase)) {
        throw new Error("El precio de la base de pizza no es válido.");
      }
  
      // 🔹 Generar ingredientes aleatorios usando `rareIngredientsFiltered`
      const ingredientesSeleccionados = generarIngredientesAleatoriosDesdeFiltrados();
  
      // 🔹 Mapear ingredientes para obtener `IDI`, `cantBySize`, etc.
      const ingredientesExtra = ingredientesSeleccionados.map((item) => ({
        IDI: item.IDI,
        nombre: item.nombre,
        precio: 0, // Puedes cambiar esto si hay costos adicionales
        cantBySize: item.cantBySize?.[sizeSeleccionado] || 0,
      }));
  
      console.log("✅ Ingredientes seleccionados:", ingredientesExtra);
  
      // 🔹 Calcular precio sin descuento
      const totalSinDescuento = precioBase;
  
      // 🔹 Crear nueva pizza rara
      const nuevaPizza = {
        id: 103,
        nombre: "Rare Pizza",
        size: sizeSeleccionado,
        cantidad: 1,
        ingredientes: ["Salsa Tomate Pizza", "Mozzarella", ...ingredientesSeleccionados.map(ing => ing.nombre)],
        extraIngredients: ingredientesExtra,
        descuento: descuentoAleatorio,
        totalSinDescuento: parseFloat(totalSinDescuento.toFixed(2)),
        precioBase: precioBase,
        precioIngredientesExtra: 0,
        total: parseFloat(totalSinDescuento.toFixed(2)),
      };
  
      setOfertaPizzaRara(ofertaEncontrada);
      setPizzaGenerada(nuevaPizza);
      setDescuentoAleatorio(descuentoAleatorio);
      setGenerarIntentos((prev) => prev - 1);
    } catch (error) {
      console.error("❌ Error al generar la pizza rara:", error);
    }
  };   
  const handleAddToCart = async () => {
    if (!pizzaGenerada) {
      alert('Primero genera una pizza rara.');
      return;
    }
  
    // Construir el objeto cupón (puede tener PrecioCupon o no, según la oferta)
    const cuponRandomPizza = {
      Oferta_Id: ofertaPizzaRara.Oferta_Id,
      Codigo_Oferta: ofertaPizzaRara.Codigo_Oferta,
      Descuento: descuentoAleatorio / 100,
      Max_Amount: ofertaPizzaRara.Max_Amount,
      Tipo_Cupon: ofertaPizzaRara.Tipo_Cupon,
      PrecioCupon: ofertaPizzaRara.Categoria_Cupon === 'gratis' ? 0 : ofertaPizzaRara.Precio_Cupon,
    };
  
    // 1) Agregar la pizza y el cupón al carrito (estado 'compra')
    setCompra((prev) => {
      const nuevaVenta = [...prev.venta, pizzaGenerada];
      const nuevoTotal = nuevaVenta.reduce((acc, item) => acc + item.totalSinDescuento, 0);
      const nuevoTotalDescuentos = prev.total_descuentos + (cuponRandomPizza.PrecioCupon || 0);
      return {
        ...prev,
        venta: nuevaVenta,
        cupones: [...prev.cupones, cuponRandomPizza],
        total_productos: parseFloat(nuevoTotal.toFixed(2)),
        total_descuentos: parseFloat(nuevoTotalDescuentos.toFixed(2)),
      };
    });
  
   
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/offers/${ofertaPizzaRara.Oferta_Id}/use-coupon`,
        {
          // Restar uno a Cupones_Disponibles
          Cupones_Disponibles: ofertaPizzaRara.Cupones_Disponibles - 1,
        }
      );
      console.log('Cupones disponibles actualizados exitosamente.');
    } catch (error) {
      console.error('Error al actualizar Cupones_Disponibles:', error);
    }
  
    // 3) Limpiar estados temporales
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
  const calculateTimeLeft = (oferta) => {
    if (!oferta.Hora_Fin) return;
    const horaFin = moment(oferta.Hora_Fin, 'HH:mm');
    const currentTime = moment();
    if (currentTime.isBefore(horaFin)) {
      setTimeLeft(horaFin.diff(currentTime, 'seconds'));
    } else {
      setTimeLeft(0);
    }
  };
  const shouldResetCoupons = (oferta) => {
    const currentTime = moment();
    const horaInicio = moment(oferta.Hora_Inicio, 'HH:mm');
    const horaFin = moment(oferta.Hora_Fin, 'HH:mm');
    const diasActivos = JSON.parse(oferta.Dias_Activos).map((dia) =>
      dia.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    );
    const currentDay = moment().format('dddd').toLowerCase();

    // Verifica si el día actual está activo
    if (!diasActivos.includes(currentDay)) return false;

    // Verifica si el tiempo actual está fuera del rango permitido
    if (currentTime.isAfter(horaFin)) {
      return true; // Resetea si ya pasó la hora fin
    }

    return false;
  };
  const resetCoupons = async (oferta) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/offers/${oferta.Oferta_Id}/reset-coupons`, {
        Cupones_Disponibles: oferta.Cupones_Asignados,
      });
      setOfertaPizzaRara((prev) => ({
        ...prev,
        Cupones_Disponibles: oferta.Cupones_Asignados,
      }));
      console.log('Cupones disponibles reseteados correctamente.');
    } catch (error) {
      console.error('Error al resetear los cupones disponibles:', error);
    }
  };
  const renderTimeLeftForRarePizza = () => {
    if (!timeLeft || timeLeft <= 0) {
      return <div className="time-left-banner warning">🚨 This coupon is not currently active.</div>;
    }
    const duration = moment.duration(timeLeft, 'seconds');
    const hours = Math.floor(duration.asHours());
    const minutes = Math.floor(duration.minutes());
    const seconds = Math.floor(duration.seconds());
    return (
      <div className="time-left-banner">
        ⏳ Time left to claim: <strong>{hours}h {minutes}m {seconds}s</strong>
      </div>
    );
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
          {ofertaPizzaRara ? (
            <div className="rare-pizza-offer-banner">
              🎉 {getCouponMessage(ofertaPizzaRara)}
              {ofertaPizzaRara && renderTimeLeftForRarePizza()}
            </div>
          ) : (
            <div className="rare-pizza-offer-banner warning">
              🚨 No offers available for Rare Pizza at this moment.
            </div>
          )}
  
          <div className="size-selector">
            <select
              value={sizeSeleccionado}
              onChange={(e) => setSizeSeleccionado(e.target.value)}
            >
              <option value="">Selecciona un tamaño</option>
              {sizesDisponibles.map((size) => (
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
            {pizzaGenerada
              ? `Volver a Generar (${generarIntentos} intentos restantes)`
              : "Generar Pizza"}
          </button>
  
          {pizzaGenerada && (
            <div className="pizza-card">
              <h3>Tu Random Pizza</h3>
              <p>
                <strong>Tamaño:</strong> {pizzaGenerada.size}
              </p>
              <p>
                <strong>Ingredientes:</strong>{" "}
                {pizzaGenerada.ingredientes.join(", ")}
              </p>
              <p>
                <strong>Descuento:</strong> {pizzaGenerada.descuento}%
              </p>
              <p>
                <strong>Precio del Cupón: </strong>
                {ofertaPizzaRara?.Categoria_Cupon === "gratis"
                  ? "Today Free"
                  : ofertaPizzaRara.Precio_Cupon}{" "}
                €
              </p>
              <p>
                <strong>Total:</strong> {pizzaGenerada.total.toFixed(2)}€
              </p>
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
