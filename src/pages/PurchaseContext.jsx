import React, { createContext, useState, useEffect } from 'react';
import moment from 'moment';

// Creamos el contexto
export const PurchaseContext = createContext();

// Creamos el provider
export const PurchaseProvider = ({ children }) => {
  const [compra, setCompra] = useState({
    observaciones: '',
    id_order: '',
    fecha: moment().format('YYYY-MM-DD'),
    hora: moment().format('HH:mm:ss'),
    id_cliente: '', // Podrás setearlo luego al obtener sessionData
    DescuentosDailyChallenge: 0,
    cupones: [],
    venta: [],
    complementos: [],
    Entrega: {
      Delivery: {
        latitud: '',
        longitud: '',
        costo: 0,
        costoTicketExpress: 0,
      },
      PickUp: {
        costoTicketExpress: 0,
      },
    },
    total_productos: 0,
    total_descuentos: 0,
    total_a_pagar_con_descuentos: 0,
    venta_procesada: 0,
    origen: '',
    is_scheduled_order: false,
  });


  useEffect(() => {
    const calcularTotalDescuentos = () => {
      let totalDescuentos = 0;

      // 2.1) Calcular el total de productos (precio base + ingredientes extras)
let totalProductos = compra.venta.reduce((acc, item) => {
  // 1) Si es pizza “complemento”, quizás item.precio
  // 2) Si es pizza 101 (completa), usar item.basePrice + item.extraIngredients
  // 3) Si es pizza 102 (mitad y mitad), usar la suma halfAndHalf.izquierda.precio + derecha.precio
  //    o directamente "item.total" si lo guardamos bien.

  if (item.id === 102 && item.halfAndHalf) {
    // Recalcular manualmente
    const { izquierda, derecha } = item.halfAndHalf;
    const precioMitadIzq = parseFloat(izquierda?.precio || 0);
    const precioMitadDer = parseFloat(derecha?.precio || 0);
    const cantidad = parseInt(item.cantidad || 1, 10);
    return acc + (precioMitadIzq + precioMitadDer) * cantidad;
  }

  // Si no es 102, asumimos que item.basePrice + extras
  const precioExtras = item.extraIngredients?.reduce(
    (sum, ing) => sum + parseFloat(ing.precio || 0),
    0
  );
  const basePrice = parseFloat(item.basePrice || 0);
  const cantidad = parseInt(item.cantidad || 1, 10);
  return acc + (basePrice * cantidad) + precioExtras;
}, 0);


      // 2.2) Sumar costos adicionales (delivery, ticket express, cupones comprados)
      const costoDelivery = parseFloat(compra.Entrega?.Delivery?.costo || 0) || 0;
      const costoTicketExpress =
        parseFloat(compra.Entrega?.Delivery?.costoTicketExpress || 0) +
        parseFloat(compra.Entrega?.PickUp?.costoTicketExpress || 0) || 0;
      const costoCupon = compra.cupones.reduce((acc, cupon) => {
        const precioCupon = parseFloat(cupon.PrecioCupon || 0);
        return acc + (isNaN(precioCupon) ? 0 : precioCupon);
      }, 0);

      totalProductos += costoDelivery + costoTicketExpress + costoCupon;

      // 2.3) Aplicar descuentos de los cupones
      if (compra.cupones.length > 0 && totalProductos > 0) {
        compra.cupones.forEach((cupon) => {
          const { Descuento, Max_Amount, quantity_condition } = cupon;

          // 2.3.a) Cupon con condición de cantidad
          if (quantity_condition > 0) {
            // Filtramos productos en posiciones "impares" (ejemplo original)
            const productosValidos = compra.venta.filter(
              (_, index) => index % 2 !== 0
            );
            if (productosValidos.length < quantity_condition) {
              console.log("No se cumple la condición mínima para aplicar este cupón.");
              return;
            }

            let descuentoAplicado = 0;
            for (let i = 0; i < productosValidos.length; i++) {
              const producto = productosValidos[i];
              const descuentoProducto = producto.basePrice * parseFloat(Descuento || 0);

              if (descuentoAplicado + descuentoProducto > parseFloat(Max_Amount || 0)) {
                const restante = parseFloat(Max_Amount || 0) - descuentoAplicado;
                totalDescuentos += restante;
                break;
              } else {
                totalDescuentos += descuentoProducto;
                descuentoAplicado += descuentoProducto;
              }
            }
          } 
          // 2.3.b) Cupon sin condición
          else {
            console.log("Aplicando descuento general para cupon sin condición");
            const descuentoAplicado = totalProductos * parseFloat(Descuento || 0);
            const descuentoFinal = Math.min(
              descuentoAplicado,
              parseFloat(Max_Amount || 0)
            );
            totalDescuentos += descuentoFinal;
          }
        });
      }

      // 2.4) Calcular el total final con descuentos
      let totalConDescuento = totalProductos - totalDescuentos;
      if (totalConDescuento < 0) {
        totalConDescuento = 0;
      }

      // 2.5) Actualizar el estado de compra con totales
      setCompra((prev) => ({
        ...prev,
        total_productos: parseFloat(totalProductos.toFixed(2)),
        total_descuentos: parseFloat(totalDescuentos.toFixed(2)),
        total_a_pagar_con_descuentos: parseFloat(totalConDescuento.toFixed(2)),
      }));
    };

    calcularTotalDescuentos();
  }, [
    compra.cupones,
    compra.venta,
    compra.Entrega?.Delivery?.costo,
    compra.Entrega?.Delivery?.costoTicketExpress,
    compra.Entrega?.PickUp?.costoTicketExpress,
  ]);
  useEffect(() => {
    if (!compra.id_order) {
      const generarOrderId = () => 'ORD' + Math.floor(100000 + Math.random() * 9000);
      setCompra((prev) => ({ ...prev, id_order: generarOrderId() }));
    }
  }, []);

  const agregarComplemento = (complemento) => {
    setCompra((prev) => ({
      ...prev,
      complementos: [...prev.complementos, complemento],
      // Opcional: si quieres sumar el precio del complemento de inmediato:
      total_productos: prev.total_productos + (complemento.precio || 0),
      total_a_pagar_con_descuentos: prev.total_a_pagar_con_descuentos + (complemento.precio || 0),
    }));
  };
  const eliminarComplemento = (idComplemento) => {
    setCompra((prev) => {
      const complementoEliminado = prev.complementos.find(c => c.id === idComplemento);
      if (!complementoEliminado) return prev; // no hay cambios si no existe

      const nuevosComplementos = prev.complementos.filter(
        (comp) => comp.id !== idComplemento
      );
      const nuevoTotal = prev.total_productos - (complementoEliminado.precio || 0);

      return {
        ...prev,
        complementos: nuevosComplementos,
        total_productos: nuevoTotal,
        total_a_pagar_con_descuentos: nuevoTotal - prev.total_descuentos
      };
    });
  };
  const addPizzasToVenta = (pizzasToAdd, totalPrice) => {
    setCompra((prev) => ({
      ...prev,
      venta: [...prev.venta, ...pizzasToAdd],
      total_productos: prev.total_productos + totalPrice,
    }));
  };
  const updateProductInVenta = (editingProductId, updatedData) => {
    setCompra((prev) => {
      const nuevaVenta = prev.venta.map((producto) => {
        if (producto.id === editingProductId) {
          return { ...producto, ...updatedData };
        }
        return producto;
      });

      // Recalcular total de productos (aquí es muy básico)
      const nuevoTotalProductos = nuevaVenta.reduce(
        (acc, item) => acc + (item.total || 0),
        0
      );

      return {
        ...prev,
        venta: nuevaVenta,
        total_productos: parseFloat(nuevoTotalProductos.toFixed(2)),
        total_a_pagar_con_descuentos: parseFloat(
          (nuevoTotalProductos - prev.total_descuentos).toFixed(2)
        ),
      };
    });
  };
  const value = {
    compra,
    setCompra,
    agregarComplemento,
    eliminarComplemento,
    addPizzasToVenta,
    updateProductInVenta,
  };

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
};
