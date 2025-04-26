import React, { useState, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import _PizzaContext from './_PizzaContext';
import { v4 as uuidv4 } from 'uuid';
import { PurchaseContext } from './PurchaseContext'; // <-- Importamos nuestro PurchaseContext
import FloatingCart from './FloatingCart';
import DeliveryForm from './DeliveryForm';
import moment from 'moment';
import axios from 'axios';
import '../styles/MakeARarePizza.css';

const MakeARarePizza = () => {
  // ----------------------------------------------------------------------------
  // 1) Consumimos el _PizzaContext si necesitas "activePizzas" u otros datos
  // ----------------------------------------------------------------------------
  const { activePizzas } = useContext(_PizzaContext);

  // ----------------------------------------------------------------------------
  // 2) Consumimos PurchaseContext para obtener y actualizar la compra global
  // ----------------------------------------------------------------------------
  const { compra, setCompra } = useContext(PurchaseContext);
  // (Opcionalmente podrías usar otras funciones como addPizzasToVenta, etc., 
  //  si las tienes definidas en tu contexto)

  // ----------------------------------------------------------------------------
  // 3) Resto de estados locales de MakeARarePizza
  // ----------------------------------------------------------------------------
  const location = useLocation();
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [ofertaPizzaRara, setOfertaPizzaRara] = useState(null);
  const [descuentoAleatorio, setDescuentoAleatorio] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [pizzaGenerada, setPizzaGenerada] = useState(null);
  const [ingredientesAleatorios, setIngredientesAleatorios] = useState([]);
  const [sizeSeleccionado, setSizeSeleccionado] = useState('');
  const [generarIntentos, setGenerarIntentos] = useState(3);
  const [ingredientesMenosUsados, setIngredientesMenosUsados] = useState([]);
  const [rareIngredientsFiltered, setRareIngredientsFiltered] = useState([]);
  const [menuPizzas, setMenuPizzas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [ingredientesExtraPrecios, setIngredientesExtraPrecios] = useState({}); 


  useEffect(() => {
    setCompra((prev) => ({ ...prev, origen: 'MakeARarePizza' }));
  }, [setCompra]);
  useEffect(() => {
    if (location.state?.compra) {
      setCompra((prev) => ({
        ...prev,
        ...location.state.compra,
      }));
    }
  }, [location.state?.compra, setCompra]);
  useEffect(() => {
    const fetchMenuPizzas = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/menu_pizzas`);
        if (response.data && Array.isArray(response.data.data)) {
          console.log("📦 Menú Pizzas cargado:", response.data.data);
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
          console.log("📋 Inventario cargado:", response.data.data);
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
    const fetchIngredientesExtraPrecios = async () => {
      try {
        const resp = await axios.get(`${process.env.REACT_APP_API_URL}/IngredientExtraPrices`);
        // Resp esperada: [ { size: 'S', extra_price: 0.5 }, { size: 'L', extra_price: 1.0 } ... ]
        const precios = {};
        resp.data.forEach((item) => {
          precios[item.size] = parseFloat(item.extra_price);
        });
        setIngredientesExtraPrecios(precios);
      } catch (error) {
        console.error('Error al cargar tabla de precios de ingredientes extras:', error);
      }
    };


    fetchIngredientesExtraPrecios();
  }, []);


  useEffect(() => {
    console.log('Estado de compra (global) actualizado:', compra);
  }, [compra]);
  useEffect(() => {
    const fetchOfertaPizzaRara = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/ofertas`);
        const oferta = response.data.data.find(
          (of) => of.Tipo_Oferta === 'Random Pizza'
        );
        if (oferta) {
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
    return () => clearInterval(interval);
  }, [timeLeft]);
  useEffect(() => {
    const fetchIngredientesMenosUsados = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/ingredientes-uso`);
        if (response.data && Array.isArray(response.data)) {
          // Ordenar y obtener la mitad con menos uso
          const ingredientesOrdenados = response.data.sort((a, b) => a.total_vendido - b.total_vendido);
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
      console.warn("⚠️ No se puede filtrar ingredientes raros. Verifica los datos.");
      setRareIngredientsFiltered([]);
      return;
    }

    console.log("✅ Filtrando ingredientes raros para tamaño:", sizeSeleccionado);
    let allActiveIngredients = [];

    menuPizzas.forEach((pizza) => {
      const ingArray = JSON.parse(pizza.ingredientes || "[]");
      ingArray.forEach((ing) => {
        const itemInv = inventario.find((inv) => inv.IDI === ing.IDI);
        const estadoGEN = itemInv ? itemInv.estadoGEN : 1;

        allActiveIngredients.push({
          IDI: ing.IDI,
          nombre: ing.ingrediente.trim().toLowerCase(),
          cantBySize: ing.cantBySize,
          estadoGEN,
        });
      });
    });

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

    console.log("✅ Ingredientes raros disponibles:", filtered);
    setRareIngredientsFiltered(filtered);
  }, [sizeSeleccionado, ingredientesMenosUsados, menuPizzas, inventario]);




  const sizesDisponibles = [
    ...new Set(activePizzas.flatMap((pizza) => JSON.parse(pizza.selectSize)))
  ];

  

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
  const generateRandomDiscount = (oferta) => {
    const { Min_Descuento_Percent, Max_Descuento_Percent } = oferta;
    return Math.floor(
      Math.random() * (Max_Descuento_Percent - Min_Descuento_Percent + 1)
    ) + Min_Descuento_Percent;
  };
  const generarIngredientesAleatoriosDesdeFiltrados = () => {
    if (!rareIngredientsFiltered || rareIngredientsFiltered.length === 0) {
      console.warn("⚠️ No hay ingredientes raros disponibles para este tamaño.");
      return [];
    }
    const ingredientesDisponibles = [...rareIngredientsFiltered];
    const seleccionados = [];

    while (seleccionados.length < 2 && ingredientesDisponibles.length > 0) {
      const randomIndex = Math.floor(Math.random() * ingredientesDisponibles.length);
      const ingredienteSeleccionado = ingredientesDisponibles.splice(randomIndex, 1)[0];
      if (ingredienteSeleccionado.cantBySize[sizeSeleccionado] > 0) {
        seleccionados.push(ingredienteSeleccionado);
      }
    }
    return seleccionados;
  };
  const handleGeneratePizza = async () => {
    if (generarIntentos === 0) {
      alert("Ya no tienes más intentos para generar una pizza rara.");
      return;
    }
    if (!sizeSeleccionado) {
      alert("Selecciona un tamaño antes de generar la pizza.");
      return;
    }

    try {
      // Buscar la oferta
      const resp = await axios.get(`${process.env.REACT_APP_API_URL}/ofertas`);
      const ofertaEncontrada = resp.data.data.find(
        (of) => of.Tipo_Oferta === 'Random Pizza'
      );
      if (!ofertaEncontrada) {
        alert("No hay ofertas disponibles para Random Pizza.");
        return;
      }
      if (ofertaEncontrada.Cupones_Disponibles <= 0) {
        alert("No hay cupones disponibles.");
        return;
      }

      const descuento = generateRandomDiscount(ofertaEncontrada);

      // Base Pizza
      const resp2 = await axios.get(`${process.env.REACT_APP_API_URL}/menu_pizzas`);
      const pizzasBase = resp2.data.data.filter(
        (pz) => pz.categoria.toLowerCase() === "base pizza"
      );
      if (!pizzasBase.length) throw new Error("No se encontró una base pizza.");

      const basePizzaObj = pizzasBase[0];
      const pbSize = JSON.parse(basePizzaObj.PriceBySize || '{}');
      const precioBase = parseFloat(pbSize[sizeSeleccionado] || 0);
      if (isNaN(precioBase)) throw new Error("Precio base no válido.");

      // Ingredientes raros aleatorios
      const ingredientesSel = generarIngredientesAleatoriosDesdeFiltrados();
      // Calcular precio extra
      // Ejemplo: usamos “ingredientesExtraPrecios[sizeSeleccionado]” 
      //   si tu “tabla de precio extra” es un valor general por ing.
      const ingredientesExtra = ingredientesSel.map((item) => ({
        IDI: item.IDI,
        nombre: item.nombre,
        cantBySize: item.cantBySize?.[sizeSeleccionado] || 0,
        // Asignamos un precio a cada ing usando la “tabla” 
        // Por ejemplo, 1.0€ si sizeSeleccionado == 'L'
        precio: ingredientesExtraPrecios[sizeSeleccionado] || 0,
      }));
      const sumPrecioExtra = ingredientesExtra.reduce((acc, ing) => acc + ing.precio, 0);

      // total sin descuento
      const totalSinDescuento = precioBase + sumPrecioExtra;
      const nuevaPizza = {
        uuid: uuidv4(),
        id: 103,
        nombre: "Rare Pizza",
        size: sizeSeleccionado,
        cantidad: 1,
        ingredientes: [
          "Salsa Tomate Pizza",
          "Mozzarella",
          ...ingredientesSel.map((ing) => ing.nombre)
        ],
        extraIngredients: ingredientesExtra,
        descuento,
        precioBase: parseFloat(precioBase.toFixed(2)),
        precioIngredientesExtra: parseFloat(sumPrecioExtra.toFixed(2)),
        totalSinDescuento: parseFloat(totalSinDescuento.toFixed(2)),
        total: parseFloat(totalSinDescuento.toFixed(2)), // la "pizza" en sí no está rebajada
      };

      setOfertaPizzaRara(ofertaEncontrada);
      setPizzaGenerada(nuevaPizza);
      setDescuentoAleatorio(descuento);
      setGenerarIntentos((prev) => prev - 1);

    } catch (error) {
      console.error("Error al generar la Rare Pizza:", error);
    }
  };
  const handleAddToCart = async () => {
    if (!pizzaGenerada) {
      alert('Primero genera una pizza rara.');
      return;
    }
    // Construir cupón
    const cuponRandomPizza = {
      Oferta_Id: ofertaPizzaRara.Oferta_Id,
      Codigo_Oferta: ofertaPizzaRara.Codigo_Oferta,
      Descuento: descuentoAleatorio / 100, // Por ej. 0.15 si 15%
      Max_Amount: ofertaPizzaRara.Max_Amount,
      Tipo_Cupon: ofertaPizzaRara.Tipo_Cupon,
      PrecioCupon: (ofertaPizzaRara.Categoria_Cupon === 'gratis')
        ? 0
        : ofertaPizzaRara.Precio_Cupon,
    };

    // Actualizar estado global de la compra
    setCompra((prevCompra) => {
      const nuevaVenta = [...prevCompra.venta, pizzaGenerada];
      const nuevoTotal = nuevaVenta.reduce(
        (acc, item) => acc + (item.totalSinDescuento || 0),
        0
      );
      const nuevoTotalDescuentos = prevCompra.total_descuentos + (cuponRandomPizza.PrecioCupon || 0);

      return {
        ...prevCompra,
        venta: nuevaVenta,
        cupones: [...prevCompra.cupones, cuponRandomPizza],
        total_productos: parseFloat(nuevoTotal.toFixed(2)),
        total_descuentos: parseFloat(nuevoTotalDescuentos.toFixed(2)),
      };
    });

    // Restar 1 cupón en la BD
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/offers/${ofertaPizzaRara.Oferta_Id}/use-coupon`,
        { Cupones_Disponibles: ofertaPizzaRara.Cupones_Disponibles - 1 }
      );
    } catch (error) {
      console.error('Error actualizando cupones en BD:', error);
    }

    // Limpiar pizza generada
    setPizzaGenerada(null);
    setSizeSeleccionado('');
    setIngredientesAleatorios([]);
    setDescuentoAleatorio(null);
    setOfertaPizzaRara(null);

    alert('¡Pizza rara añadida al carrito!');
  };
  const handleNextStep = () => {
    if (!compra.venta.length) {
      alert('Primero añade una pizza al carrito.');
      return;
    }
    setShowDeliveryForm(true);
  };
  const calculateTimeLeft = (oferta) => {
    if (!oferta.Hora_Fin) return;
    const horaFin = moment(oferta.Hora_Fin, 'HH:mm');
    const now = moment();
    if (now.isBefore(horaFin)) {
      setTimeLeft(horaFin.diff(now, 'seconds'));
    } else {
      setTimeLeft(0);
    }
  };
  const shouldResetCoupons = (oferta) => {
    const now = moment();
    const horaFin = moment(oferta.Hora_Fin, 'HH:mm');
    const diasActivos = JSON.parse(oferta.Dias_Activos).map((dia) =>
      dia.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    );
    const currentDay = now.format('dddd').toLowerCase();
    if (!diasActivos.includes(currentDay)) return false;
    if (now.isAfter(horaFin)) {
      return true;
    }
    return false;
  };
  const resetCoupons = async (oferta) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/offers/${oferta.Oferta_Id}/reset-coupons`,
        { Cupones_Disponibles: oferta.Cupones_Asignados }
      );
      setOfertaPizzaRara((prev) =>
        prev ? { ...prev, Cupones_Disponibles: oferta.Cupones_Asignados } : null
      );
    } catch (error) {
      console.error('Error al resetear cupones:', error);
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
        <DeliveryForm
          compra={compra}
          setCompra={setCompra}
        />
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
                <strong>Precio del Cupón:</strong>{" "}
                {ofertaPizzaRara?.Categoria_Cupon === "gratis"
                  ? "Today Free"
                  : ofertaPizzaRara?.Precio_Cupon
                }{" "}
                €
              </p>
              <p>
                <strong>Total:</strong>{" "}
                {pizzaGenerada.total.toFixed(2)}€
              </p>
              <button className="add-to-cart" onClick={handleAddToCart}>
                Add to cart
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MakeARarePizza;
