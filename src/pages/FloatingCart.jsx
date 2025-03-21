import React, { useState, useContext, useEffect } from 'react';
import { _PizzaContext } from './_PizzaContext';
import axios from 'axios';
import QRCode from 'qrcode.react';
import moment from 'moment';
import '../styles/FloatingCart.css';

const generarOrderId = () => {
  return 'ORD' + Math.floor(100000 + Math.random() * 9000);
};

const FloatingCart = ({ compra, setCompra, handleNextStep, handleEditProduct }) => {
  const { sessionData, activePartners } = useContext(_PizzaContext);
  const [incentivos, setIncentivos] = useState([]);
  const [qrData, setQrData] = useState('');
  const [historial, setHistorial] = useState([]);
  const [orderId, setOrderId] = useState(generarOrderId());
  const [isReadyToPay, setIsReadyToPay] = useState(false);
  const [ingredientExtraPrices, setIngredientExtraPrices] = useState([]);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState(null);
  const [showComplementModal, setShowComplementModal] = useState(false);
  const [complementoQuantities, setComplementoQuantities] = useState({});
  const [complementoEnEdicion, setComplementoEnEdicion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const isScheduledOrder = compra?.is_scheduled_order ? 1 : 0;

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
    setCompra((prevCompra) => ({ ...prevCompra, id_order: orderId }));
  }, [orderId, setCompra]);
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
    setQrData(getQRCodeData());
  }, [compra?.Entrega]);
  useEffect(() => {
    console.log("🔄 Detectando cambios en compra, recalculando totales...");
    setCompra((prevCompra) => {
        const nuevaCompra = calcularTotales(prevCompra, incentivos);
        console.log("🟢 Estado actualizado de compra:", nuevaCompra);
        return nuevaCompra;
    });
  }, [compra]);



  function getSubtotalYDescuentos(compra) {
    // Pizzas + ingredientes extra
    const totalPizzas = compra.venta.reduce((acc, pizza) => {
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
      { orderId, step: prevHistorial.length + 1, tipo, contenido },
    ]);
  }
  function getQRCodeData() {
    if (compra?.Entrega?.PickUp) {
      const puntoRecogida = compra?.Entrega?.PickUp?.puntoRecogida;
      const puntoRecogidaInfo = puntoRecogida
        ? `\nPunto de Recogida: ${puntoRecogida.ciudad}, ${puntoRecogida.direccion}`
        : '';
      return `PickUp
      Cliente: ${compra.cliente?.name}
      Teléfono: ${compra.cliente?.phone}
      Fecha y Hora: ${compra?.Entrega?.PickUp?.fechaYHoraPrometida}
      TicketExpress: ${compra?.Entrega?.PickUp?.TicketExpress ? 'Sí' : 'No'}
      ${puntoRecogidaInfo}`;
    } else if (compra?.Entrega?.Delivery) {
      return `Delivery
      Cliente: ${compra.cliente?.name}
      Teléfono: ${compra.cliente?.phone}
      Dirección: ${compra?.Entrega?.Delivery?.address}
      Fecha y Hora: ${compra?.Entrega?.Delivery?.fechaYHoraPrometida}
      TicketExpress: ${compra?.Entrega?.Delivery?.TicketExpress ? 'Sí' : 'No'}`;
    }
    return 'No hay información de entrega disponible';
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
  const calcularTotales = (tempCompra, incentivos = []) => {
    console.log("🔵 Calculando totales para la compra:", tempCompra);

    // 1️⃣ Extraer subtotales y descuentos
    const { subtotalProductos, totalDescuentos, subtotalConDesc } = getSubtotalYDescuentos(tempCompra);
    console.log("📊 Subtotal de productos:", subtotalProductos);
    console.log("📉 Descuentos aplicados:", totalDescuentos);
    console.log("✅ Subtotal después de descuentos:", subtotalConDesc);

    // 2️⃣ Obtener costos adicionales (Delivery, Cupones, etc.)
    tempCompra.Entrega = tempCompra.Entrega || {};
    tempCompra.Entrega.Delivery = tempCompra.Entrega.Delivery || {};

    const costoReal = tempCompra.Entrega.Delivery.costoReal ?? tempCompra.Entrega.Delivery.costo ?? 0;

    // 3️⃣ Evaluar si el usuario desbloquea el Delivery Free Pass
    const dfpIncentivo = incentivos.find(i => i.incentivo === "Delivery Free Pass");
    let freePassApplied = tempCompra.Entrega.Delivery.freePassApplied || false;

    if (dfpIncentivo) {
        const cumpleRequisito = subtotalConDesc >= dfpIncentivo.TO_minimo;
        freePassApplied = cumpleRequisito;
    }

    // 4️⃣ Aplicar el Free Pass si es válido
    const totalDelivery = freePassApplied ? 0 : costoReal;
    tempCompra.Entrega.Delivery.freePassApplied = freePassApplied;
    tempCompra.Entrega.Delivery.costo = totalDelivery;

    // 5️⃣ Obtener nuevamente los costos adicionales con el nuevo estado de Delivery
    const costos = getCostosAdicionales(tempCompra);
    console.log("💰 Costos adicionales recibidos desde el estado de compra:", costos);

    // 6️⃣ Aplicar IVA (10% sobre subtotal con descuento)
    const iva = subtotalConDesc * 0.10;
    console.log("💡 IVA Calculado (10% sobre subtotal con descuento):", iva);

    // 7️⃣ Calcular el total final con IVA
    const totalConIVA = subtotalConDesc + iva + costos.totalCostos;
    console.log("💰 Total final con IVA:", totalConIVA);

    // 🔎 Log final para verificar todos los valores
    console.log("📦 Resultado final de la compra en calcularTotales:", {
        subtotalProductos,
        totalDescuentos,
        subtotalConDesc,
        totalBase: subtotalConDesc + costos.totalCostos,
        iva,
        totalConIVA,
        freePassApplied,  // 🔥 Estado actualizado del Free Pass
        totalDelivery
    });

    // 8️⃣ Devolver el objeto actualizado
    return {
        ...tempCompra,
        total_productos: parseFloat(subtotalProductos.toFixed(2)),
        total_descuentos: parseFloat(totalDescuentos.toFixed(2)),
        iva: parseFloat(iva.toFixed(2)),
        total_a_pagar_con_descuentos: parseFloat(totalConIVA.toFixed(2)),
        totalDelivery,
        totalTicketExpress: costos.totalTicketExpress,
        totalCupones: costos.totalCupones,
        freePassApplied
    };
  };
  const handleUndo = () => {
    const qrActual = qrData;
    // Borrar todo y restaurar QR
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
    setQrData(qrActual);
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

      // Agregar email del cliente
      const email = sessionData.email;
      const estadoEntrega = 'Pendiente';

      const compraData = {
        id_order: orderId,
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
          // Manejo especial para pizzas mitad y mitad
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
          // Caso general
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
            latitud: compra.Entrega?.Delivery?.latitud, // 🔹 Agregamos coordenadas
            longitud: compra.Entrega?.Delivery?.longitud // 🔹 Agregamos coordenadas
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
    } else {
      alert('Procesando pago...');
      handlePagar();
    }
  };
  const handleRemoveProduct = (productoAEliminar) => {
    const nuevaVenta = compra.venta.filter((p) => p.id !== productoAEliminar.id);
    actualizarEstadoCompra({ venta: nuevaVenta });
  };
  const handleRemoveExtraIngredient = (productoId, ingredientIDI) => {
    const nuevaVenta = compra.venta.map((producto) => {
      if (producto.id === productoId) {
        const nuevosIngredientes = producto.extraIngredients.filter(
          (ing) => ing.IDI !== ingredientIDI
        );

        // Recalcular total del producto
        const ingredientePrecio = (ingID) => {
          return (
            ingredientExtraPrices.find(
              (price) => price.IDI === ingID && price.size === producto.size
            )?.precio || 0
          );
        };
        const sumExtras = nuevosIngredientes.reduce(
          (acc, ing) => acc + ingredientePrecio(ing.IDI) * producto.cantidad,
          0
        );

        const base = producto.price * producto.cantidad; // O la lógica que uses
        const nuevoTotal = base + sumExtras;

        return {
          ...producto,
          extraIngredients: nuevosIngredientes,
          total: parseFloat(nuevoTotal.toFixed(2)),
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

  console.log('FloatingCart - Estado compra actualizado:', compra);
  const { totalDelivery, totalTicketExpress, totalCupones } = getCostosAdicionales(compra);
  const hayCostosAdicionales = totalDelivery > 0 || totalTicketExpress > 0 || totalCupones > 0;
  const totalAPagar = compra.total_a_pagar_con_descuentos;
  const filteredComplementos = activePartners
    .filter((item) => item.subcategoria === selectedSubcategoria)
    .filter((item) => item.producto.toLowerCase().includes(searchTerm.toLowerCase()));

    const totalTicketExpressFixed = parseFloat((compra.totalTicketExpress || 0).toFixed(2));
    const totalDeliveryFixed = parseFloat((compra.totalDelivery || 0).toFixed(2));
    const totalCuponesFixed = parseFloat((compra.totalCupones || 0).toFixed(2));

  return (
    <div className="floating-cart">
      <div className="cart-header">
        <h3>shopping cart</h3>
        <button className="undo-button" onClick={handleUndo}>
          undo
        </button>
      </div>

      {(compra?.venta?.length > 0 || compra?.complementos?.length > 0) && (
        <div className="detalles-compra">
          <p>
            <strong>Order Details:</strong>
          </p>
        </div>
      )}

      <div className="detalles_pedidos">
        {compra?.venta?.length === 0 && compra?.complementos?.length === 0 ? (
          <p className="carrito-vacio bounce-effect">🍕¡Add some deliciousness!🍕</p>
        ) : (
          <ul>
            {[...(compra.venta ?? []), ...(compra.complementos ?? [])].map((item, index) => {
              const esComplemento = !!item.subcategoria;
              const precioPrincipal = esComplemento
                ? item.precio
                : item.halfAndHalf
                ? (item.halfAndHalf.izquierda.precio + item.halfAndHalf.derecha.precio).toFixed(2)
                : item.basePrice || item.precioBase || item.price;

              return (
                <li
                  key={index}
                  className={`pedido-item ${esComplemento ? 'complemento' : ''}`}
                  style={{ listStyleType: 'none' }}
                >
                  <div className="detalles_pedidos_general">
                    <span>
                      {item.cantidad} x {esComplemento ? item.producto : item.nombre}
                      {item.size ? ` (${item.size})` : ''} - {precioPrincipal}€
                    </span>

                    <button
                      className="edit-button"
                      onClick={() =>
                        esComplemento ? handleEditComplemento(item) : handleEditProduct(item)
                      }
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-button"
                      onClick={() =>
                        esComplemento ? handleRemoveComplemento(item) : handleRemoveProduct(item)
                      }
                    >
                      ❌
                    </button>

                    {item.extraIngredients?.length > 0 && (
                      <ul style={{ listStyleType: 'none' }}>
                        {item.extraIngredients.map((extra) => (
                          <li
                            key={extra.nombre}
                            className="extra-ingredient-item"
                            style={{ margin: 0, padding: 0 }}
                          >
                            +IE: {extra.nombre} ({parseFloat(extra.precio).toFixed(2)}€)
                            <button
                              className="extra-ingredient-button"
                              onClick={() => handleRemoveExtraIngredient(item.id, extra.IDI)}
                              title="Eliminar ingrediente"
                            >
                              Del
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>


      {isReadyToPay && (
          <>
              <div className="detalles-compra">
                  <p><strong>Extra Charges:</strong></p>
              </div>
              <div className="additional-costs">
                  {(totalDeliveryFixed > 0 || totalTicketExpressFixed > 0 || totalCuponesFixed > 0 || compra.Entrega?.Delivery?.freePassApplied) ? (
                      <>
                          {/* Mostrar el costo de Delivery si aplica Free Pass o si tiene costo */}
                          {compra.Entrega?.Delivery?.freePassApplied ? (
                              <p>+Delivery: Today Free</p>
                          ) : (
                              totalDeliveryFixed > 0 && <p>+Delivery: {totalDeliveryFixed.toFixed(2)}€</p>
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
            showComplementModal && selectedSubcategoria === 'Bebidas' ? 'parpadeo' : ''
          }`}
          onClick={() => handleOpenComplementos('Bebidas')}
        >
          {selectedSubcategoria === 'Bebidas' && showComplementModal ? '🔙 Go Back' : '🥤 Drinks'}
        </button>

        <button
          className={`complemento-btn ${
            showComplementModal && selectedSubcategoria === 'Postres' ? 'parpadeo' : ''
          }`}
          onClick={() => handleOpenComplementos('Postres')}
        >
          {selectedSubcategoria === 'Postres' && showComplementModal ? '🔙 Go Back' : '🍰 Sweets'}
        </button>

        <button
          className={`complemento-btn ${
            showComplementModal && selectedSubcategoria === 'Complementos' ? 'parpadeo' : ''
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

      {/* Barra de búsqueda */}
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
            const cantidadSeleccionada = complementoQuantities[item.id] || 0;

            return (
              <li
                key={item.id}
                className={`complemento-item ${cantidadSeleccionada === 0 ? "error" : ""}`}
              >
                <span className="complemento-nombre">
                  {resaltarCoincidencias(item.producto, searchTerm)} - {item.precio}€
                </span>
                <select
                  className="complemento-cantidad"
                  value={cantidadSeleccionada}
                  onChange={(e) => handleLocalQuantityChange(e, item.id)}
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
                      // Muestra el error solo si el usuario intenta agregar con cantidad 0
                      document.getElementById(`error-${item.id}`).style.display = "block";
                      return;
                    }
                    handleAddComplemento(item);
                    handleCloseModal();
                  }}
                >
                  ✔
                </button>
                {/* Mensaje de error visible solo si el usuario intenta agregar con cantidad 0 */}
                <p
                  id={`error-${item.id}`}
                  className="error-message"
                  style={{ display: "none", color: "red", fontSize: "0.9em" }}
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



      {(compra?.total_productos > 0 || compra?.venta?.length > 0 || compra?.complementos?.length > 0) && (
        <div className="totals2">
          {compra.cupones.map((cupon, index) => (
            <p key={index}>
              ✅{' '}
              {cupon.Descuento ? `${(cupon.Descuento * 100).toFixed(0)}%` : '0%'} de descuento
              {cupon.quantity_condition > 0
                ? ` (aplicable a la ${cupon.quantity_condition + 1}ª unidad)`
                : ''}
            </p>
          ))}
          <div>
        <p>
          <b>Amount to Pay:</b> {compra.total_a_pagar_con_descuentos.toFixed(2)}€
          <span style={{ fontSize: '0.9em', color: '#666' }}> (IVA Included)</span>
        </p>
      
      </div>
    </div>
  
      )}

        {incentivos?.length > 0 ? (
            incentivos.map((incentivo) => {
                // 📌 Detectamos si es el DFP porque modifica el precio del delivery
                const esDeliveryFreePass = incentivo.incentivo === "Delivery Free Pass";

                // 🔹 Si es DFP, excluimos el costo del delivery para evaluar si se alcanza el mínimo
                // 🔹 Para otros incentivos, usamos el total a pagar incluyendo delivery
                const montoBaseParaEvaluar = esDeliveryFreePass
                    ? compra.total_productos + compra.iva  // Excluir delivery
                    : compra.total_a_pagar_con_descuentos; // Incluir delivery

                const faltante = incentivo.TO_minimo - montoBaseParaEvaluar;

                return (
                    <div key={incentivo.id} className="incentivo-estado">
                        {faltante > 0 ? (
                            <div className="incentivo-faltante">
                                <p>
                                    ¡You need <strong>{faltante.toFixed(2)}€</strong> to get {incentivo.incentivo}!
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
            })
        ) : (
            <div className="incentivo-estado">
                <p>🍕 IT'S PIZZA TIME! 🍕</p>
            </div>
        )}


      {compra?.Entrega && (
        <div className="qr-code-container">
          <h4 className="track-title">Order Track ({compra.id_order})</h4>
          <div className="qr-with-text">
            <span className="vertical-text">Scan the QR code to track your order.</span>
            <QRCode value={qrData} size={128} />
          </div>
        </div>
      )}

      <button className="next-button" onClick={handleNext}>
        {isReadyToPay ? 'Pay' : 'Next'}
      </button>
    </div>
  );
};

export default FloatingCart;
