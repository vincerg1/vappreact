import React, { useState, useContext, useEffect } from 'react';
import { _PizzaContext } from './_PizzaContext';
import axios from 'axios';
import QRCode from 'qrcode.react';
import moment from 'moment';
import '../styles/FloatingCart.css';
import { v4 as uuidv4 } from 'uuid';

const generarOrderId = () => {
  return 'ORD' + Math.floor(100000 + Math.random() * 9000);  // Ejemplo: ORD1234
};

const FloatingCart = ({ compra, setCompra, handleNextStep, handleEditProduct }) => {
  const { sessionData } = useContext(_PizzaContext);
  const [incentivos, setIncentivos] = useState([]);
  const [qrData, setQrData] = useState('');
  const [historial, setHistorial] = useState([]);  // Historial de cambios en venta y entrega
  const [orderId, setOrderId] = useState(generarOrderId());  // Generar un número de orden al iniciar
  const [isReadyToPay, setIsReadyToPay] = useState(false);  // Estado para controlar si el botón debe ser "Pagar"

  const handlePagar = async () => {
    try {
      const fecha = moment().format('YYYY-MM-DD');
      const hora = moment().format('HH:mm:ss');
      const metodo_pago = 'Tarjeta';
  
      if (!compra.venta.length) throw new Error('No hay productos en la venta');
  
      const totalDescuentosNum = parseFloat(compra.total_descuentos) || 0;
      const totalSinDescuentosNum = parseFloat(compra.total_productos) || 0;
  
      const incentivosAlcanzados = incentivos.filter(incentivo => {
        return compra.total_a_pagar_con_descuentos >= incentivo.TO_minimo;
      });
  
      // Agregar email al `compraData` directamente
      const email = sessionData.email; // Correo del cliente
      console.log('Email del cliente para enviar factura:', email); // Log para verificar el email
      const estadoEntrega = "Pendiente";
      const compraData = {
        id_orden: orderId,
        fecha,
        hora,
        id_cliente: sessionData.id_cliente,
        email, // Incluimos el email en los datos que se envían al servidor
        metodo_pago,
        total_con_descuentos: compra.total_a_pagar_con_descuentos || totalSinDescuentosNum,
        total_productos: totalSinDescuentosNum,
        total_descuentos: totalDescuentosNum,
        productos: compra.venta.map(item => ({
          id_pizza: item.id_producto,
          cantidad: item.cantidad,
          size: item.size,
          price: item.price,
          extraIngredients: item.extraIngredients,
        })),
        cupones: compra.cupones,
        incentivos: incentivosAlcanzados.map(inc => ({ id: inc.id })),
        metodo_entrega: JSON.stringify({
          ...compra.Entrega,
          Delivery: {
            ...compra.Entrega?.Delivery,
            costo: compra.Entrega?.Delivery?.freePassApplied ? 0 : compra.Entrega?.Delivery?.costoReal, // Asegurar que se almacene el costo del delivery siempre, sea 0 o el real
            costoReal: compra.Entrega?.Delivery?.costoReal, // Asegurar que el costo real siempre esté presente
            freePassApplied: compra.Entrega?.Delivery?.freePassApplied || false, // Asegurar que el estado esté presente
          },
        }),
        observaciones: compra.observaciones,
        venta_procesada: 0,
        estado_entrega: estadoEntrega, 
      };
  
      console.log('Datos de la compra:', compraData); // Verificar todos los datos antes de enviar
  
      // Realizar la solicitud para registrar la venta
      const response = await axios.post('http://localhost:3001/registro_ventas', compraData);
  
      if (response.data.success) {
        // Actualizar la tabla `PedidosEnCola` después de registrar la venta
        if (compra.Entrega?.Delivery) {
          const idUbicacion = compra.Entrega?.Delivery?.tiendaSalida?.id;
          if (idUbicacion) {
            await axios.post('http://localhost:3001/fill_pedidos_encola');
          }
        } else if (compra.Entrega?.PickUp) {
          const idUbicacion = compra.Entrega?.PickUp?.puntoRecogida?.id;
          if (idUbicacion) {
            await axios.post('http://localhost:3001/fill_pedidos_encola');
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
  useEffect(() => {
    const fetchIncentivos = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/incentivos');
        const incentivosActivos = response.data.filter((incentivo) => incentivo.activo === 1);
        setIncentivos(incentivosActivos);
      } catch (error) {
        console.error('Error al obtener los incentivos:', error);
      }
    };

    fetchIncentivos();
  }, []);
  const calcularFaltante = (incentivo, totalAPagar) => {
    const faltante = incentivo.TO_minimo - totalAPagar;
    return faltante > 0 ? faltante : 0;
  };
  const recalcularTotal = (venta) => {
    return venta.reduce((acc, item) => acc + item.total, 0);
  };
  const getDescuentoPorcentaje = () => {
    const totalDescuento = compra.DescuentosCupon || 0;
    if (totalDescuento === 0) return 0;
    return (totalDescuento * 100).toFixed(2);
  };
  const guardarEnHistorial = (tipo, contenido) => {
    setHistorial(prevHistorial => [
      ...prevHistorial,
      { orderId, step: prevHistorial.length + 1, tipo, contenido },
    ]);
  };
  useEffect(() => {
    if (compra.venta.length > 0) {
      guardarEnHistorial("venta", { ventaId: compra.venta[compra.venta.length - 1].id });
    }
  }, [compra.venta]);
  useEffect(() => {
    if (compra.Entrega) {
      guardarEnHistorial("entrega", { metodo: compra.Entrega });
    }
  }, [compra.Entrega]);
  const handleUndo = () => {
    if (historial.length > 0) {
      const nuevoHistorial = [...historial];
      const ultimoCambio = nuevoHistorial.pop();

      if (ultimoCambio.tipo === "venta") {
        setCompra(prevCompra => {
          const nuevaVenta = prevCompra.venta.slice(0, -1);
          const nuevoTotal = recalcularTotal(nuevaVenta);
          return {
            ...prevCompra,
            venta: nuevaVenta,
            total_productos: nuevoTotal,
            total_a_pagar_con_descuentos: nuevoTotal - prevCompra.total_descuentos,
          };
        });
      } else if (ultimoCambio.tipo === "entrega") {
        setCompra(prevCompra => ({ ...prevCompra, Entrega: null }));
      }

      setHistorial(nuevoHistorial);
    }
  };
  useEffect(() => {
    setCompra(prevCompra => ({ ...prevCompra, id_orden: orderId }));
  }, [orderId, setCompra]);
  const verificarDeliveryFreePass = () => {
    console.log("Verificando incentivos disponibles...");
    const deliveryFreePass = incentivos.some((incentivo) =>
      incentivo.incentivo === "Delivery Free Pass" && compra.total_a_pagar_con_descuentos >= incentivo.TO_minimo
    );
    console.log("Resultado de la verificación Delivery Free Pass:", deliveryFreePass);
    return deliveryFreePass;
  };
  useEffect(() => {
    if (compra.Entrega?.Delivery) {
      const valorCalculado = compra.Entrega.Delivery.costoReal ?? compra.Entrega.Delivery.costo ?? 0;
      const tieneDeliveryFreePass = verificarDeliveryFreePass();
  
      setCompra((prevCompra) => {
        const { costoReal, freePassApplied } = prevCompra.Entrega.Delivery;
  
        // Caso 1: Aplicar el Delivery Free Pass
        if (tieneDeliveryFreePass && !freePassApplied) {
          console.log("Aplicando Delivery Free Pass, estableciendo costo de delivery a 0...");
          return {
            ...prevCompra,
            Entrega: {
              ...prevCompra.Entrega,
              Delivery: {
                ...prevCompra.Entrega.Delivery,
                costoReal: valorCalculado, // Guardar el costo real antes de aplicar el incentivo
                costo: 0, // Establecer el costo a 0 para la interfaz de usuario
                freePassApplied: true,
              },
            },
          };
        }
  
        // Caso 2: Revertir el Delivery Free Pass si ya no aplica
        if (!tieneDeliveryFreePass && freePassApplied) {
          console.log("Revirtiendo Delivery Free Pass, restableciendo costo de delivery original...");
          return {
            ...prevCompra,
            Entrega: {
              ...prevCompra.Entrega,
              Delivery: {
                ...prevCompra.Entrega.Delivery,
                costo: costoReal || valorCalculado, // Restaurar el costo real
                freePassApplied: false,
              },
            },
          };
        }
  
        // Caso 3: Asegurarse de que el costo real siempre esté presente
        if (costoReal !== valorCalculado) {
          return {
            ...prevCompra,
            Entrega: {
              ...prevCompra.Entrega,
              Delivery: {
                ...prevCompra.Entrega.Delivery,
                costo: freePassApplied ? 0 : valorCalculado,
                costoReal: valorCalculado,
              },
            },
          };
        }
  
        return prevCompra;
      });
    }
  }, [compra.total_a_pagar_con_descuentos, incentivos, compra.Entrega?.Delivery]);

  const calcularCostosAdicionales = () => {
    let totalDelivery = compra.Entrega?.Delivery?.costo || 0;
    let totalTicketExpress = (compra.Entrega?.Delivery?.costoTicketExpress || 0) + (compra.Entrega?.PickUp?.costoTicketExpress || 0);
    let totalCupones = compra.cupones.reduce((acc, cupon) => acc + (cupon.PrecioCupon || 0), 0);
    
    return {
      totalDelivery,
      totalTicketExpress,
      totalCupones,
    };
  };
  const totalAPagar = compra.venta.length > 0
    ? (compra.total_a_pagar_con_descuentos > 0 ? compra.total_a_pagar_con_descuentos : compra.total_productos)
    : 0;

    const getQRCodeData = () => {
      if (compra?.Entrega?.PickUp) {
        const puntoRecogida = compra?.Entrega?.PickUp?.puntoRecogida;
        const puntoRecogidaInfo = puntoRecogida
          ? `\nPunto de Recogida: ${puntoRecogida.ciudad}, ${puntoRecogida.direccion}`
          : '';
        
        return `PickUp\nCliente: ${compra.cliente?.name}\nTeléfono: ${compra.cliente?.phone}\nFecha y Hora: ${compra?.Entrega?.PickUp?.fechaYHoraPrometida}\nTicketExpress: ${compra?.Entrega?.PickUp?.TicketExpress ? 'Sí' : 'No'}${puntoRecogidaInfo}`;
      } else if (compra?.Entrega?.Delivery) {
        return `Delivery\nCliente: ${compra.cliente?.name}\nTeléfono: ${compra.cliente?.phone}\nDirección: ${compra?.Entrega?.Delivery?.address}\nFecha y Hora: ${compra?.Entrega?.Delivery?.fechaYHoraPrometida}\nTicketExpress: ${compra?.Entrega?.Delivery?.TicketExpress ? 'Sí' : 'No'}`;
      }
      return 'No hay información de entrega disponible';
    };
  useEffect(() => {
    setQrData(getQRCodeData());
  }, [compra?.Entrega]);
  const handleNext = () => {
    if (!isReadyToPay) {
      handleNextStep();
      setIsReadyToPay(true);
    } else {
      handlePagar();
    }
  };
  const calcularTotalDescuentos = () => {
    const { totalDelivery, totalTicketExpress, totalCupones } = calcularCostosAdicionales();

    let totalDescuentos = 0;
    let totalProductos = compra.venta.reduce((acc, item) => acc + (item.total || 0), 0);
    totalProductos += totalTicketExpress;

    if (compra.cupones.length > 0 && totalProductos > 0) {
      compra.cupones.forEach((cupon) => {
        const descuentoAplicado = totalProductos * (cupon.Descuento || 0);
        const descuentoFinal = Math.min(descuentoAplicado, cupon.Max_Amount || 0);
        totalDescuentos += descuentoFinal;
      });
    }

    let totalConDescuento = totalProductos - totalDescuentos;
    totalConDescuento = totalConDescuento < 0 ? 0 : totalConDescuento;

    const totalFinal = totalConDescuento + totalCupones;

    setCompra((prevCompra) => ({
      ...prevCompra,
      total_productos: parseFloat(totalProductos.toFixed(2)),
      total_descuentos: parseFloat(totalDescuentos.toFixed(2)),
      total_a_pagar_con_descuentos: parseFloat(totalFinal.toFixed(2)),
    }));
  };
  useEffect(() => {
    calcularTotalDescuentos();
  }, [
    compra.venta,
    compra.cupones,
    compra.Entrega?.Delivery?.costo,
    compra.Entrega?.Delivery?.costoTicketExpress,
    compra.Entrega?.PickUp?.costoTicketExpress,
  ]);
  const handleRemoveProduct = (productoAEliminar) => {
    setCompra((prevCompra) => {
      // Filtrar el producto por su identificador único (id)
      const nuevaVenta = prevCompra.venta.filter(
        (producto) => producto.id !== productoAEliminar.id
      );
  
      // Recalcular el total de productos después de eliminar el producto
      const nuevoTotalProductos = nuevaVenta.reduce((acc, item) => acc + item.total, 0);
  
      return {
        ...prevCompra,
        venta: nuevaVenta,
        total_productos: parseFloat(nuevoTotalProductos.toFixed(2)),
        total_a_pagar_con_descuentos: parseFloat(
          (nuevoTotalProductos - prevCompra.total_descuentos).toFixed(2)
        ),
      };
    });
  };
  const handleRemoveExtraIngredient = (productoId, ingredientIDI) => {
    setCompra((prevCompra) => {
      const nuevaVenta = prevCompra.venta.map((producto) => {
        if (producto.id === productoId) {
          const nuevosIngredientes = producto.extraIngredients.filter(
            (ing) => ing.IDI !== ingredientIDI
          );
          const nuevoTotal = producto.price * producto.cantidad + nuevosIngredientes.reduce((acc, ing) => acc + parseFloat(ing.precio), 0);
          return {
            ...producto,
            extraIngredients: nuevosIngredientes,
            total: parseFloat(nuevoTotal.toFixed(2)),
          };
        }
        return producto;
      });

      const nuevoTotalProductos = nuevaVenta.reduce((acc, item) => acc + item.total, 0);
      const nuevoTotalDescuentos = prevCompra.total_descuentos;
      const totalAPagarConDescuentos = parseFloat(
        (nuevoTotalProductos - nuevoTotalDescuentos).toFixed(2)
      );

      return {
        ...prevCompra,
        venta: nuevaVenta,
        total_productos: parseFloat(nuevoTotalProductos.toFixed(2)),
        total_a_pagar_con_descuentos: totalAPagarConDescuentos,
      };
    });
  };

  return (
    <div className="floating-cart">
      <div className="cart-header">
        <h3>Carrito de Compras</h3>
        <button className="undo-button" onClick={handleUndo}>Deshacer</button>
      </div>

      {compra.venta.length > 0 && (
        <div className="detalles-compra">
          <p><strong>Detalles de tu compra:</strong></p>
        </div>
      )}

      <ul>
        {compra.venta.map((item, index) => (
          <li key={index}>
            {item.nombre} x {item.cantidad} - ({item.price}€)
            <button className="edit-button" onClick={() => handleEditProduct(item)}>✏️</button>
            <button className="delete-button" onClick={() => handleRemoveProduct(item)}>❌</button>
            {item.extraIngredients.length > 0 && (
              <ul>
              {item.extraIngredients.map((extra, idx) => (
                <div key={extra.IDI} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '5px' }}>
                <span style={{ marginRight: '5px', flexGrow: 1  }}>+IE: {extra.nombre} ({parseFloat(extra.precio).toFixed(2)}€)</span>
                <button
                  style={{ padding: '2px 5px', fontSize: '12px' }}
                  onClick={() => handleRemoveExtraIngredient(item.id, extra.IDI)}
                >
                  Del
                </button>
              </div>
    
              ))}
            </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="totals">
        
        {compra.cupones.length > 0 && (
          compra.cupones.map((cupon, index) => (
            <p key={index}>✅ {cupon.Descuento ? `${(cupon.Descuento * 100).toFixed(2)}%` : '0%'} de descuento</p>
          ))
        )} 

       
        <p>Total Descuento: {(compra.total_descuentos || 0).toFixed(2)}€</p>
        {isReadyToPay && compra.venta.length > 0 && (
          <>
            <div className="additional-costs">
              <h3 className="additional-costs-name" >Costos Adicionales</h3>
            
              {compra.Entrega?.Delivery && compra.Entrega?.Delivery?.costo !== undefined && (
                <p>+Delivery: {compra.Entrega?.Delivery?.costo === 0 && compra.Entrega?.Delivery?.freePassApplied ? 'Today Free' : `${(compra.Entrega?.Delivery?.costoReal || 0).toFixed(2)}€`}</p>
              )}
              {compra.Entrega?.Delivery?.costoTicketExpress > 0 && (
                <p>+Ticket Express: {(compra.Entrega?.Delivery?.costoTicketExpress || 0).toFixed(2)}€</p>
              )}
              {compra.Entrega?.PickUp?.costoTicketExpress > 0 && (
                <p>+Ticket Express: {(compra.Entrega?.PickUp?.costoTicketExpress || 0).toFixed(2)}€</p>
              )}
              {compra.cupones.length > 0 && (
                compra.cupones.map((cupon, index) => (
                  <p key={index}>
                    +Precio del Cupón: {cupon.PrecioCupon === 0 ? 'Today Free' : `${(cupon.PrecioCupon || 0).toFixed(2)}€`}
                  </p>
                ))
              )}
            </div>
            

            <p><b>Total a Pagar:</b> {(compra.total_a_pagar_con_descuentos || 0).toFixed(2)}€</p>

          </>
        )}
      </div>

      {incentivos.map((incentivo) => {
        const faltante = calcularFaltante(incentivo, totalAPagar);

        return (
          <div key={incentivo.id} className="incentivo-estado">
            {faltante > 0 ? (
              <div className="incentivo-faltante">
                <p>¡Faltan <strong>{faltante.toFixed(2)}€</strong> para el {incentivo.incentivo}!</p>
              </div>
            ) : compra.total_a_pagar_con_descuentos > 0 ? (
              <div className="incentivo-logrado">
                <p>
                  <span role="img" aria-label="logrado">✅</span> ¡Has logrado tu <strong>{incentivo.incentivo}!</strong>
                </p>
              </div>
            ) : null}
          </div>
        );
      })}

      {compra?.Entrega && (
        <div className="qr-code-container">
          <h4 className="track-title">Order Track ({compra.id_orden})</h4>
          <div className="qr-with-text">
            <span className="vertical-text">Escanea el QR para el seguimiento de tu orden</span> 
            <QRCode value={qrData} size={128} />
          </div>
        </div>
      )}

      <button className="next-button" onClick={handleNext}>
        {isReadyToPay ? 'Pagar' : 'Siguiente'}
      </button>
    </div>
  );
};

export default FloatingCart;
