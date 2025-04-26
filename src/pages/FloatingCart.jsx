import React, { useState, useContext, useEffect, useRef } from 'react';
import { _PizzaContext } from './_PizzaContext';
import axios from 'axios';
import moment from 'moment';
import MiniTvCart from './MiniTvCart';
import '../styles/FloatingCart.css';


const FloatingCart = ({ compra, setCompra, handleNextStep, handleEditProduct }) => {
  const { sessionData, activePartners } = useContext(_PizzaContext);
  const [incentivos, setIncentivos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [isReadyToPay, setIsReadyToPay] = useState(false);
  const [ingredientExtraPrices, setIngredientExtraPrices] = useState([]);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState(null);
  const [showComplementModal, setShowComplementModal] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [complementoQuantities, setComplementoQuantities] = useState({});
  const [complementoEnEdicion, setComplementoEnEdicion] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [dragging, setDragging] = useState(false);
  const [bubblePos, setBubblePos] = useState(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
  
    return isMobile
      ? { x: width - 75, y: height - 210 } // Móvil
      : { x: width - 130, y: height - 180 }; // Escritorio
  });
  const [searchTerm, setSearchTerm] = useState('');
  const isScheduledOrder = compra?.is_scheduled_order ? 1 : 0;
  const [compraFinalizada, setCompraFinalizada] = useState(false);


  useEffect(() => {
    const fetchIncentivos = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/incentivos`);
        const incentivosActivos = response.data.filter((inc) => inc.activo === 1);
        setIncentivos(incentivosActivos);
      } catch (error) {
        console.error('Error al obtener incentivos:', error);
      }
    };
    fetchIncentivos();
  }, []);
  useEffect(() => {
    const fetchIngredientExtraPrices = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/IngredientExtraPrices`);
        setIngredientExtraPrices(response.data);
      } catch (error) {
        console.error('Error al obtener precios de ingredientes extras:', error);
      }
    };
    fetchIngredientExtraPrices();
  }, []);
  useEffect(() => {
    if (compra?.venta?.length > 0) {
      guardarEnHistorial('venta', { ventaId: compra?.venta[compra?.venta?.length - 1].id });
    }
  }, [compra.venta]);
  useEffect(() => {
    if (compra.Entrega?.Delivery) {
        setCompra((prevCompra) => ({
            ...prevCompra,
            Entrega: {
                ...prevCompra.Entrega,
                Delivery: {
                    ...prevCompra.Entrega.Delivery,
                    latitud: prevCompra.Entrega.Delivery.latitud || prevCompra.Entrega.Delivery.tiendaSalida?.lat, // ✅ Extraemos de tiendaSalida si es necesario
                    longitud: prevCompra.Entrega.Delivery.longitud || prevCompra.Entrega.Delivery.tiendaSalida?.lng // ✅ Extraemos de tiendaSalida si es necesario
                }
            }
        }));
    }
  }, [compra.Entrega]); 
  useEffect(() => {
    console.log("🔄 Detectando cambios en compra, recalculando totales...");
    setCompra((prevCompra) => {
        const nuevaCompra = calcularTotales(prevCompra, incentivos);
        console.log("🟢 Estado actualizado de compra:", nuevaCompra);
        return nuevaCompra;
    });
  }, [compra]);
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
  
      setBubblePos(
        width <= 768
          ? { x: width - 75, y: height - 210 }
          : { x: width - 130, y: height - 180 }
      );
    };
  
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    console.log("🔄 Detectando cambios en compra, recalculando totales...");
    setCompra((prevCompra) => {
      const nuevaCompra = calcularTotales(prevCompra, incentivos);
      
      // 👇 Aquí mostramos el breakdown si existe
      if (nuevaCompra.deliveryBreakdown) {
        console.log("🧾 Desglose detallado del Delivery (deliveryBreakdown):");
        Object.entries(nuevaCompra.deliveryBreakdown).forEach(([key, value]) => {
          console.log(`   • ${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`);
        });
      }
  
      console.log("🟢 Estado actualizado de compra:", nuevaCompra);
      return nuevaCompra;
    });
  }, [compra]);

  const itemCount =
  (compra?.venta?.length || 0) + (compra?.complementos?.length || 0);

  function getSubtotalYDescuentos(compra) {
    const totalPizzas = compra.venta.reduce((acc, pizza, idx) => {
      console.log(
        `[FloatingCart:getSubtotalYDescuentos] Pizza #${idx}`,
        ` uuid=${pizza.uuid || '(no uuid)'}`,
        ` id=${pizza.id} (typeOf: ${typeof pizza.id})`,
        ` total=${pizza.total}`,
        pizza.halfAndHalf ? 
           ` halfAndHalf=(${pizza.halfAndHalf?.izquierda?.precio} + ${pizza.halfAndHalf?.derecha?.precio})` : ''
      );
  
      const isPersonalizada = [101, 102, 103].includes(
        typeof pizza.id === 'string' ? parseInt(pizza.id) : pizza.id
      );
  
      if (isPersonalizada) {
        return acc + ((pizza.total || 0) * (pizza.cantidad || 1));
      }
  
      // Para pizzas tradicionales, sumar base + ingredientes extra
      const precioBase = pizza.total || 0;
      const precioExtras = pizza.extraIngredients
        ? pizza.extraIngredients.reduce((sum, ing) => sum + (ing.precio || 0), 0)
        : 0;
  
      return acc + precioBase + precioExtras;
    }, 0);
  
    // Complementos
    const totalComp = (compra.complementos ?? []).reduce((acc, comp) => acc + (comp.total || 0), 0);
  
    // Subtotal sin descuentos
    let subtotalProductos = totalPizzas + totalComp;
  
    // Descuentos
    let totalDescuentos = 0;
    if (compra?.cupones?.length > 0 && subtotalProductos > 0) {
      compra.cupones.forEach((cupon) => {
        const descuentoAplicado = subtotalProductos * (cupon.Descuento || 0);
        const descuentoFinal = Math.min(descuentoAplicado, cupon.Max_Amount || descuentoAplicado);
        totalDescuentos += descuentoFinal;
      });
    }
  
    let subtotalConDesc = subtotalProductos - totalDescuentos;
    if (subtotalConDesc < 0) subtotalConDesc = 0;
  
    return {
      subtotalProductos,
      totalDescuentos,
      subtotalConDesc,
    };
  }
  function getCostosAdicionales(compra) {
    let totalDelivery = compra.Entrega?.Delivery?.freePassApplied ? 0 : compra.Entrega?.Delivery?.costo || 0;
    let totalTicketExpress =
        (compra.Entrega?.Delivery?.costoTicketExpress || 0) +
        (compra.Entrega?.PickUp?.costoTicketExpress || 0);
    let totalCupones = compra.cupones.reduce((acc, cupon) => acc + (cupon.PrecioCupon || 0), 0);

    console.log("🚚 Costo Delivery:", totalDelivery);
    console.log("🎟️ Costo Ticket Express:", totalTicketExpress);
    console.log("🎫 Costo Cupones:", totalCupones);
    console.log("💲 Total Costos Adicionales:", totalDelivery + totalTicketExpress + totalCupones);

    return {
        totalCostos: totalDelivery + totalTicketExpress + totalCupones,
        totalDelivery,
        totalTicketExpress,
        totalCupones
    };
  }
  function applyFreePassIfAny(compra, montoBase, incentivos) {
    let newDeliveryCost = compra.Entrega?.Delivery?.costoReal ?? compra.Entrega?.Delivery?.costo ?? 0;
    let newFreePassApplied = compra.Entrega?.Delivery?.freePassApplied ?? false;

    console.log("🔍 Evaluando si se debe aplicar el Delivery Free Pass...");
    console.log("🛒 Estado actual de la compra antes de aplicar Free Pass:", compra);

    const dfpIncentivo = incentivos.find((i) => i.incentivo === 'Delivery Free Pass');
    const deliveryFreePass = dfpIncentivo ? montoBase >= dfpIncentivo.TO_minimo : false;

    console.log("🎯 Condición DFP:", deliveryFreePass, "| Monto base:", montoBase, "| TO mínimo requerido:", dfpIncentivo?.TO_minimo);

    if (compra.Entrega?.Delivery) {
        if (deliveryFreePass && !newFreePassApplied) {
            console.log("✅ Aplicando Delivery Free Pass...");
            newDeliveryCost = 0;
            newFreePassApplied = true;
        } else if (!deliveryFreePass && newFreePassApplied) {
            console.log("❌ Removiendo Delivery Free Pass...");
            newFreePassApplied = false;
        }
    }

    console.log("🔄 Nuevo estado después de evaluar Free Pass:", {
        newMonto: montoBase,
        newDeliveryCost,
        newFreePassApplied
    });

    return { newMonto: montoBase, newDeliveryCost, newFreePassApplied };
  }
  function guardarEnHistorial(tipo, contenido) {
    setHistorial((prevHistorial) => [
      ...prevHistorial,
      { orderId: compra.id_order, step: prevHistorial.length + 1, tipo, contenido }
    ]);
  }
  function shouldApplyFreePass(montoBase, incentivos) {
    const dfpIncentivo = Array.isArray(incentivos) ? incentivos.find((i) => i.incentivo === 'Delivery Free Pass') : null;
    
    if (!dfpIncentivo) {
        console.log("❌ No hay incentivo de Delivery Free Pass activo.");
        return false;
    }

    console.log("🎯 Evaluando Free Pass: Monto base:", montoBase, "| TO mínimo requerido:", dfpIncentivo.TO_minimo);
    
    return montoBase >= dfpIncentivo.TO_minimo;
  }
  const actualizarEstadoCompra = (updates) => {
    setCompra((prevCompra) => calcularTotales({ ...prevCompra, ...updates }));
  };
  const n = (v) => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  };
  const calcularTotales = (tempCompra, incentivos = []) => {
    console.log("🔵 Calculando totales para la compra:", tempCompra);

    /* 1️⃣ Subtotales y descuentos */
    const {
      subtotalProductos,
      totalDescuentos,
      subtotalConDesc,
    } = getSubtotalYDescuentos(tempCompra);

    const subProdNum   = n(subtotalProductos);
    const descNum      = n(totalDescuentos);
    const subConDesc   = n(subtotalConDesc);

    /* 2️⃣ Costos adicionales (preparamos estructura por si falta) */
    tempCompra.Entrega           = tempCompra.Entrega           || {};
    tempCompra.Entrega.Delivery  = tempCompra.Entrega.Delivery  || {};

    const costoReal = n(
      tempCompra.Entrega.Delivery.costoReal ??
      tempCompra.Entrega.Delivery.costo
    );

    /* 3️⃣ Delivery Free Pass */
    const dfpIncentivo   = incentivos.find(i => i.incentivo === "Delivery Free Pass");
    let   freePassApplied = !!tempCompra.Entrega.Delivery.freePassApplied;

    if (dfpIncentivo) {
      freePassApplied = subConDesc >= n(dfpIncentivo.TO_minimo);
    }

    /* 4️⃣ Coste de delivery actualizado */
    const totalDelivery = freePassApplied ? 0 : costoReal;
    tempCompra.Entrega.Delivery = {
      ...tempCompra.Entrega.Delivery,
      freePassApplied,
      costo: totalDelivery,
    };

    /* 5️⃣ Costos adicionales */
    const costos            = getCostosAdicionales(tempCompra);
    const totalCostosNum    = n(costos.totalCostos);
    console.log("💰 Costos adicionales:", costos);

    /* 6️⃣ IVA (10 %) */
    const ivaNum = +(subConDesc * 0.10).toFixed(2); // +() fuerza a número
    console.log("💡 IVA calculado:", ivaNum);

    /* 7️⃣ Total final */
    const totalConIVA = subConDesc + ivaNum + totalCostosNum;
    console.log("💰 Total final con IVA:", totalConIVA);

    /* 8️⃣ Devolver el objeto actualizado (todo en número) */
    return {
      ...tempCompra,
      total_productos                : +subProdNum.toFixed(2),
      total_descuentos               : +descNum.toFixed(2),
      iva                            : ivaNum,
      total_a_pagar_con_descuentos   : +totalConIVA.toFixed(2),
      totalDelivery,
      totalTicketExpress             : +n(costos.totalTicketExpress).toFixed(2),
      totalCupones                   : +n(costos.totalCupones).toFixed(2),
      freePassApplied,
    };
  };
  const handleUndo = () => {

    actualizarEstadoCompra({
      venta: [],
      complementos: [],
      Entrega: {},
      cupones: [],
      total_productos: 0,
      total_descuentos: 0,
      total_a_pagar_con_descuentos: 0,
      costos_adicionales: 0,
    });
    setHistorial([]);
  };
  const handlePagar = async () => {
    try {
      const fecha = moment().format('YYYY-MM-DD');
      const hora = moment().format('HH:mm:ss');
      const metodo_pago = 'Tarjeta';
  
      if (!compra?.venta?.length) throw new Error('No hay productos en la venta');
  
      const totalDescuentosNum = parseFloat(compra.total_descuentos) || 0;
      const totalSinDescuentosNum = parseFloat(compra.total_productos) || 0;
  
      const incentivosAlcanzados = incentivos.filter(
        (incentivo) => compra.total_a_pagar_con_descuentos >= incentivo.TO_minimo
      );
  
      const email = sessionData.email;
      const estadoEntrega = 'Pendiente';
  
      const compraData = {
        id_order: compra.id_order,
        fecha,
        hora,
        id_cliente: sessionData.id_cliente,
        email,
        metodo_pago,
        total_con_descuentos: compra.total_a_pagar_con_descuentos || totalSinDescuentosNum,
        total_productos: totalSinDescuentosNum,
        total_descuentos: totalDescuentosNum,
        is_scheduled_order: isScheduledOrder,
        productos: compra.venta.map((item) => {
          if (item.id === 102 && item.halfAndHalf) {
            return {
              id_pizza: item.id,
              cantidad: item.cantidad,
              size: item.size,
              price: item.total,
              halfAndHalf: { ...item.halfAndHalf },
              extraIngredients: item.extraIngredients || [],
            };
          }
          return {
            id_pizza: item.id || item.id_producto,
            cantidad: item.cantidad,
            size: item.size,
            price: item.basePrice || item.total || item.price,
            extraIngredients: item.extraIngredients || [],
          };
        }),
        partners: compra.complementos,
        cupones: compra.cupones,
        incentivos: incentivosAlcanzados.map((inc) => ({ id: inc.id })),
        metodo_entrega: JSON.stringify({
          ...compra.Entrega,
          Delivery: {
            ...compra.Entrega?.Delivery,
            costo: compra.Entrega?.Delivery?.freePassApplied
              ? 0
              : compra.Entrega?.Delivery?.costoReal,
            costoReal: compra.Entrega?.Delivery?.costoReal,
            freePassApplied: compra.Entrega?.Delivery?.freePassApplied || false,
            latitud: compra.Entrega?.Delivery?.latitud,
            longitud: compra.Entrega?.Delivery?.longitud,
          },
        }),
        observaciones: compra.observaciones,
        venta_procesada: 0,
        estado_entrega: estadoEntrega,
      };
  
      console.log('Datos de la compra:', compraData);
  
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/registro_ventas`, compraData);
  
      if (response.data.success) {
        // Actualiza pedidos en cola
        if (compra.Entrega?.Delivery) {
          const idUbicacion = compra.Entrega?.Delivery?.tiendaSalida?.id;
          if (idUbicacion) {
            await axios.post(`${process.env.REACT_APP_API_URL}/fill_pedidos_encola`, {});
          }
        } else if (compra.Entrega?.PickUp) {
          const idUbicacion = compra.Entrega?.PickUp?.puntoRecogida?.id;
          if (idUbicacion) {
            await axios.post(`${process.env.REACT_APP_API_URL}/fill_pedidos_encola`, {});
          }
        }
  
        alert('Pago realizado y venta registrada con éxito');
        handleUndo();
        setIsReadyToPay(false);
        setCompraFinalizada(true);
      } else {
        throw new Error('Error al registrar la venta en el servidor');
      }
    } catch (error) {
      console.error('Error al realizar el pago y registrar la venta:', error);
      alert('Hubo un error al procesar el pago.');
    }
  };
  const handleNext = () => {
    if (!isReadyToPay) {
      handleNextStep();
      setIsReadyToPay(true);
      if (isMobile) {
        setIsCartOpen(false); 
      }
    } else {
      alert('Procesando pago...');
      handlePagar();
    }
  };
  const handleRemoveProduct = (productoAEliminar) => {
    const nuevaVenta = compra.venta.filter((p) => p.uuid !== productoAEliminar.uuid);
    actualizarEstadoCompra({ venta: nuevaVenta });
  };
  const handleRemoveExtraIngredient = (productoId, ingredientIDI) => {
    const nuevaVenta = compra.venta.map((producto) => {
      if (producto.id === productoId) {
        const nuevosIngredientes = producto.extraIngredients.filter(
          (ing) => ing.IDI !== ingredientIDI
        );
  
        // Recalcular total base
        let base = 0;
  
        if (producto.halfAndHalf) {
          base =
            (parseFloat(producto.halfAndHalf.izquierda.precio || 0) +
              parseFloat(producto.halfAndHalf.derecha.precio || 0));
        } else {
          base = parseFloat(producto.basePrice || 0);
        }
  
        // Calcular suma de los ingredientes restantes
        const sumExtras = nuevosIngredientes.reduce(
          (acc, ing) => acc + parseFloat(ing.precio || 0),
          0
        );
  
        const nuevoTotal = parseFloat((base + sumExtras).toFixed(2));
  
        return {
          ...producto,
          extraIngredients: nuevosIngredientes,
          total: nuevoTotal,
        };
      }
  
      return producto;
    });
  
    actualizarEstadoCompra({ venta: nuevaVenta });
  };
  const handleRemoveComplemento = (complementoAEliminar) => {
    const nuevosComplementos = compra.complementos.filter(
      (comp) => comp.producto !== complementoAEliminar.producto
    );
    actualizarEstadoCompra({ complementos: nuevosComplementos });
  };
  const handleAddComplemento = (complemento) => {
    const cantidadSeleccionada = complementoQuantities[complemento.id] || 0;
    const complementIndex = compra.complementos.findIndex(
      (comp) => comp.producto === complemento.producto
    );

    let nuevosComplementos = [...compra.complementos];
    if (complementIndex >= 0) {
      // Actualizar
      const complementoExistente = nuevosComplementos[complementIndex];
      nuevosComplementos[complementIndex] = {
        ...complementoExistente,
        cantidad: cantidadSeleccionada,
        total: parseFloat((complementoExistente.precio * cantidadSeleccionada).toFixed(2)),
      };
    } else {
      // Añadir
      nuevosComplementos.push({
        producto: complemento.producto,
        precio: complemento.precio,
        cantidad: cantidadSeleccionada,
        id: complemento.id,
        idi: complemento.IDI,
        subcategoria: complemento.subcategoria,
        total: parseFloat((complemento.precio * cantidadSeleccionada).toFixed(2)),
      });
    }
    actualizarEstadoCompra({ complementos: nuevosComplementos });
  };
  const handleAddExtraIngredient = (pizzaId, newIng) => {
    const nuevaVenta = compra.venta.map((producto) => {
      if (producto.id === pizzaId) {
        const nuevosExtras = [...(producto.extraIngredients || []), newIng];
        let base = producto.price;
        if (producto.halfAndHalf) {
          base = producto.halfAndHalf.izquierda.precio + producto.halfAndHalf.derecha.precio;
        }
        const sumExtras = nuevosExtras.reduce((acc, e) => acc + e.precio, 0);
        const total = (base + sumExtras) * producto.cantidad;

        return {
          ...producto,
          extraIngredients: nuevosExtras,
          total: parseFloat(total.toFixed(2)),
        };
      }
      return producto;
    });
    actualizarEstadoCompra({ venta: nuevaVenta });
  };
  const handleOpenComplementos = (subcategoria) => {
    if (selectedSubcategoria === subcategoria && showComplementModal) {
      handleCloseModal();
    } else {
      setSelectedSubcategoria(subcategoria);
      setShowComplementModal(true);
    }
  };
  const handleCloseModal = () => {
    setShowComplementModal(false);
    setSelectedSubcategoria(null);
  };
  const handleLocalQuantityChange = (e, complementoId) => {
    const nuevaCantidad = parseInt(e.target.value, 10) || 1;
    setComplementoQuantities((prev) => ({
      ...prev,
      [complementoId]: nuevaCantidad,
    }));
  };
  const handleEditComplemento = (complemento) => {
    setSelectedSubcategoria(complemento.subcategoria);
    setShowComplementModal(true);
  };
  const resaltarCoincidencias = (texto, busqueda) => {
    if (!busqueda) return texto; // Si no hay búsqueda, devolver el texto normal
  
    const regex = new RegExp(`(${busqueda})`, 'gi'); // Expresión regular para buscar sin distinguir mayúsculas/minúsculas
    return texto.split(regex).map((parte, index) =>
      parte.toLowerCase() === busqueda.toLowerCase() ? (
        <span key={index} className="highlight">{parte}</span> // Resaltamos solo la coincidencia
      ) : (
        parte
      )
    );
  };
  const handlePointerDown = (e) => {
    e.preventDefault(); 
    // Guardamos la posición inicial del pointer 
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    // Diferencia entre el click y la posición del bubble
    offsetRef.current = {
      x: e.clientX - bubblePos.x,
      y: e.clientY - bubblePos.y,
    };
  
    // Activamos los listeners globales al mover y soltar
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };
  const handlePointerMove = (e) => {
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
  
    // Si el dedo/mouse se movió suficiente, marcamos como arrastre
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      setDragging(true);
      setBubblePos({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      });
    }
  };
  const handlePointerUp = (e) => {
    // Quitamos los listeners para no filtrar movimientos futuros
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  
    // Chequear si se movió poco, entonces fue un “tap”
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
  
    // Menos de 5px => un “tap” => abrir modal
    if (distance < 5) {
      setIsCartOpen(true);
    }
  
    setDragging(false);
  };
  const getGroupedItems = (venta) => {
    const grupos = [];
  
    venta.forEach((item) => {
      const clave = JSON.stringify({
        id: item.id,
        nombre: item.nombre,
        size: item.size,
        price: item.basePrice || item.total || item.price,
      });
  
      const grupoExistente = grupos.find((g) => g.clave === clave);
  
      if (grupoExistente) {
        grupoExistente.items.push(item);
        grupoExistente.cantidadTotal += item.cantidad || 1;
      } else {
        grupos.push({
          clave,
          nombre: item.nombre,
          size: item.size,
          price: item.basePrice || item.total || item.price,
          items: [item],
          cantidadTotal: item.cantidad || 1,
        });
      }
    });
  
    return grupos;
  };
  
  
  console.log('FloatingCart - Estado compra actualizado:', compra);
  const { totalDelivery, totalTicketExpress, totalCupones } = getCostosAdicionales(compra);
  console.log("📦 Desglose detallado del Delivery (deliveryBreakdown):", compra.deliveryBreakdown);

  const hayCostosAdicionales = totalDelivery > 0 || totalTicketExpress > 0 || totalCupones > 0;
  const totalAPagar = compra.total_a_pagar_con_descuentos;
  const filteredComplementos = activePartners
    .filter((item) => item.subcategoria === selectedSubcategoria)
    .filter((item) => item.producto.toLowerCase().includes(searchTerm.toLowerCase()));

    const totalTicketExpressFixed = parseFloat((compra.totalTicketExpress || 0).toFixed(2));
    const totalDeliveryFixed = parseFloat((compra.totalDelivery || 0).toFixed(2));
    const totalCuponesFixed = parseFloat((compra.totalCupones || 0).toFixed(2));
    const startPosRef = useRef({ x: 0, y: 0 });
    const offsetRef = useRef({ x: 0, y: 0 });
    const metodoEntregaSeleccionado =
  (compra?.Entrega?.Delivery && compra?.Entrega?.Delivery?.tiendaSalida) ||
  (compra?.Entrega?.PickUp && compra?.Entrega?.PickUp?.puntoRecogida);
    
    return (
      <>
        {isMobile && isCartOpen && (
    <div
        className="modal-overlay-mobile"
        onClick={() => setIsCartOpen(false)}
      />
         )}
        {!isCartOpen && (
           <div
           className={`mini-cart-bubble ${dragging ? 'dragging' : ''}`}
           onPointerDown={handlePointerDown}
           style={{
            position: 'fixed',
            left: bubblePos.x,
            top: bubblePos.y,
            cursor: dragging ? 'grabbing' : 'grab',
            zIndex: 9999
            }}
           title="Open Cart"
           >
           <span className="cart-icon">🍕</span>
           {itemCount > 0 && <span className="item-count">{itemCount}</span>}
           </div>
        )}
        {isCartOpen && (
          <div className={isMobile ? 'mobile-cart-modal' : 'floating-cart'}>
            <button
              className="close-button-FC"
              onClick={() => setIsCartOpen(false)}
            >
              🔻hide
            </button>

            <div className="cart-header">
              <h3>shopping cart</h3>
              <button className="undo-button" onClick={handleUndo}>
                undo
              </button>
            </div>

            <div className="cart-body">
              {(compra?.venta?.length > 0 || compra?.complementos?.length > 0) && (
                <div className="detalles-compra">
                  <p>
                    <strong>Order Details:</strong>
                  </p>
                </div>
              )}

                <div className="detalles_pedidos">
                  {compra?.venta?.length === 0 && compra?.complementos?.length === 0 ? (
                    <p className="carrito-vacio bounce-effect">
                      🍕¡Add some deliciousness!🍕
                    </p>
                  ) : (
                    <ul>
                      {/* Agrupamos las pizzas */}
                      {getGroupedItems(compra.venta ?? []).map((grupo, index) => {
                        const item = grupo.items[0];
                        const precioPrincipal = item.halfAndHalf
                          ? (
                              (parseFloat(item.halfAndHalf?.izquierda?.precio) || 0) +
                              (parseFloat(item.halfAndHalf?.derecha?.precio) || 0)
                            ).toFixed(2)
                          : item.basePrice || item.precioBase || item.price;

                        return (
                          <li
                            key={`grupo-${index}`}
                            className="pedido-item"
                            style={{ listStyleType: 'none' }}
                          >
                            {/* Cabecera del ítem */}
                            <div className="detalles_pedidos_general">
                              <span>
                                {grupo.cantidadTotal} x {item.nombre}
                                {item.size ? ` (${item.size})` : ''} - {precioPrincipal}€
                              </span>

                              <div className="botones-acciones-fc">
                                <button
                                  className="edit-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isMobile) setIsCartOpen(false);
                                    handleEditProduct(grupo);
                                    handleEditProduct(grupo.items[0]);
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="delete-button"
                                  onClick={() => handleRemoveProduct(item)}
                                >
                                  ❌
                                </button>
                              </div>
                            </div>

                            {/* Detalles tipo Half and Half */}
                            {item.id === 102 && item.halfAndHalf && (
                              <ul
                                style={{
                                  margin: '5px 0',
                                  paddingLeft: '1.5rem',
                                  listStyleType: 'disc',
                                }}
                              >
                                <li style={{ fontSize: '0.95rem', fontStyle: 'italic' }}>
                                  Mitad: {item.halfAndHalf.izquierda.nombre} (
                                  {item.halfAndHalf.izquierda.precio.toFixed(2)}€)
                                </li>
                                <li style={{ fontSize: '0.95rem', fontStyle: 'italic' }}>
                                  Mitad: {item.halfAndHalf.derecha.nombre} (
                                  {item.halfAndHalf.derecha.precio.toFixed(2)}€)
                                </li>
                              </ul>
                            )}

                            {/* Ingredientes extras visualmente debajo */}
                            {item.extraIngredients?.length > 0 && (
                              <div className="detalles_ingredientes_extra">
                                <ul style={{ listStyleType: 'circle', paddingLeft: '1.5rem' }}>
                                  {item.extraIngredients.map((extra) => (
                                    <li
                                      key={extra.nombre}
                                      className="extra-ingredient-item"
                                      
                                    >
                                      +IE: {extra.nombre} ({parseFloat(extra.precio).toFixed(2)}€)
                                      <button
                                        className="extra-ingredient-button"
                                        onClick={() =>
                                          handleRemoveExtraIngredient(item.id, extra.IDI)
                                        }
                                        title="Eliminar ingrediente"
                                      >
                                        Del
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </li>
                        );
                      })}

                      {/* Complementos uno por uno */}
                      {(compra.complementos ?? []).map((item, index) => (
                        <li
                          key={`complemento-${index}`}
                          className="pedido-item complemento"
                          style={{ listStyleType: 'none' }}
                        >
                          <div className="detalles_pedidos_general">
                            <span>
                              {item.cantidad} x {item.producto} - {item.precio}€
                            </span>
                            <div className="botones-acciones-fc">
                              <button
                                className="edit-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isMobile) setIsCartOpen(false);
                                  handleEditComplemento(item);
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                className="delete-button"
                                onClick={() => handleRemoveComplemento(item)}
                              >
                                ❌
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>


              {isReadyToPay && (
                <>
                  <div className="detalles-compra">
                    <p>
                      <strong>Extra Charges:</strong>
                    </p>
                  </div>
                  <div className="additional-costs">
                    {totalDeliveryFixed > 0 ||
                    totalTicketExpressFixed > 0 ||
                    totalCuponesFixed > 0 ||
                    compra.Entrega?.Delivery?.freePassApplied ? (
                      <>
                        {compra.Entrega?.Delivery?.freePassApplied ? (
                          <p>+Delivery: Today Free</p>
                        ) : (
                          totalDeliveryFixed > 0 && (
                            <p>+Delivery: {totalDeliveryFixed.toFixed(2)}€</p>
                          )
                        )}
                        {totalTicketExpressFixed > 0 && (
                          <p>+Ticket Express: {totalTicketExpressFixed.toFixed(2)}€</p>
                        )}
                        {totalCuponesFixed > 0 && (
                          <p>+Coupon Price: {totalCuponesFixed.toFixed(2)}€</p>
                        )}
                      </>
                    ) : (
                      <p style={{ fontStyle: 'italic', color: '#666' }}>
                        No Additional Costs.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="complementos-section">
                <button
                  className={`complemento-btn ${
                    showComplementModal && selectedSubcategoria === 'Bebidas'
                      ? 'parpadeo'
                      : ''
                  }`}
                  onClick={() => handleOpenComplementos('Bebidas')}
                >
                  {selectedSubcategoria === 'Bebidas' && showComplementModal
                    ? '🔙 Go Back'
                    : '🥤 Drinks'}
                </button>

                <button
                  className={`complemento-btn ${
                    showComplementModal && selectedSubcategoria === 'Postres'
                      ? 'parpadeo'
                      : ''
                  }`}
                  onClick={() => handleOpenComplementos('Postres')}
                >
                  {selectedSubcategoria === 'Postres' && showComplementModal
                    ? '🔙 Go Back'
                    : '🍰 Sweets'}
                </button>

                <button
                  className={`complemento-btn ${
                    showComplementModal && selectedSubcategoria === 'Complementos'
                      ? 'parpadeo'
                      : ''
                  }`}
                  onClick={() => handleOpenComplementos('Complementos')}
                >
                  {selectedSubcategoria === 'Complementos' && showComplementModal
                    ? '🔙 Go Back'
                    : '🍟 Add-ons'}
                </button>
              </div>

              {showComplementModal && (
                <div className="modal-complementos">
                  <div className="modal-content">
                    <h3>Pick Your {selectedSubcategoria}</h3>
                    <input
                      type="text"
                      placeholder="Buscar..."
                      className="complementos-busqueda"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <ul className="complementos-lista">
                      {filteredComplementos.length === 0 ? (
                        <p className="no-complementos">
                          🤷‍♀️ Sorry, no {selectedSubcategoria} available right now! 😢
                        </p>
                      ) : (
                        filteredComplementos.map((item) => {
                          const cantidadSeleccionada =
                            complementoQuantities[item.id] || 0;
                          return (
                            <li
                              key={item.id}
                              className={`complemento-item ${
                                cantidadSeleccionada === 0 ? 'error' : ''
                              }`}
                            >
                              <span className="complemento-nombre">
                                {resaltarCoincidencias(item.producto, searchTerm)} - {item.precio}€
                              </span>
                              <select
                                className="complemento-cantidad"
                                value={cantidadSeleccionada}
                                onChange={(e) =>
                                  handleLocalQuantityChange(e, item.id)
                                }
                              >
                                {[...Array(10).keys()].map((num) => (
                                  <option key={num} value={num}>
                                    {num}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="agregar-complemento"
                                onClick={() => {
                                  if (cantidadSeleccionada === 0) {
                                    document.getElementById(`error-${item.id}`).style.display = 'block';
                                    return;
                                  }
                                  handleAddComplemento(item);
                                  handleCloseModal();
                                }}
                              >
                                ✔
                              </button>
                              <p
                                id={`error-${item.id}`}
                                className="error-message"
                                style={{
                                  display: 'none',
                                  color: 'red',
                                  fontSize: '0.9em',
                                }}
                              >
                                ⚠️ You must select at least 1 unit.
                              </p>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {(compra?.total_productos > 0 ||
                compra?.venta?.length > 0 ||
                compra?.complementos?.length > 0) && (
                <div className="totals2">
                  {compra.cupones.map((cupon, index) => (
                    <p key={index}>
                      ✅{' '}
                      {cupon.Descuento
                        ? `${(cupon.Descuento * 100).toFixed(0)}%`
                        : '0%'}{' '}
                      de descuento
                      {cupon.quantity_condition > 0
                        ? ` (aplicable a la ${
                            cupon.quantity_condition + 1
                          }ª unidad)`
                        : ''}
                    </p>
                  ))}
                  <div>
                    <p>
                      <b>Amount to Pay:</b>{' '}
                      {compra.total_a_pagar_con_descuentos.toFixed(2)}€
                      <span style={{ fontSize: '0.9em', color: '#666' }}>
                        {' '}
                        (IVA Included)
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {incentivos?.length > 0 ? (
                <div className="incentivos-wrapper">
                  {incentivos.map((incentivo) => {
                    const esDeliveryFreePass =
                      incentivo.incentivo === 'Delivery Free Pass';
                    const montoBaseParaEvaluar = esDeliveryFreePass
                      ? compra.total_productos + compra.iva
                      : compra.total_a_pagar_con_descuentos;
                    const faltante = incentivo.TO_minimo - montoBaseParaEvaluar;

                    return (
                      <div key={incentivo.id} className="incentivo-estado">
                        {faltante > 0 ? (
                          <div className="incentivo-faltante">
                            <p>
                              ¡You need <strong>{faltante.toFixed(2)}€</strong> to get{' '}
                              {incentivo.incentivo}!
                            </p>
                          </div>
                        ) : compra.total_a_pagar_con_descuentos > 0 ? (
                          <div className="incentivo-logrado">
                            <p>
                              <span role="img" aria-label="logrado">✅</span>{' '}
                              ¡You’ve unlocked <strong>{incentivo.incentivo}</strong>!
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="incentivos-wrapper">
                  <div className="incentivo-estado">
                    <p>🍕 IT'S PIZZA TIME! 🍕</p>
                  </div>
                </div>
              )}

              {compra?.Entrega && (
                <div className="qr-code-container">
                  <h4 className="track-title">
                    Order Track ({compra.id_order})
                  </h4>
                  <MiniTvCart
                    isReadyToPay={isReadyToPay}
                    compraFinalizada={compraFinalizada}
                  />
                </div>
              )}
             
            </div>

          
            <button
              className="next-button"
              onClick={handleNext}
              disabled={isReadyToPay && !metodoEntregaSeleccionado} 
            >
              {isReadyToPay ? 'Pay' : 'Next'}
            </button>
          </div>
        )}

      </>
    );
  }
export default FloatingCart;
