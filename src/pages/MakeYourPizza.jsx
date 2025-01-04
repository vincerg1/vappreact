import React, { useState, useEffect, useContext } from 'react';
import _PizzaContext from './_PizzaContext';
import FloatingCart from './FloatingCart';
import { v4 as uuidv4 } from 'uuid';
import '../styles/MakeYourPizza.css'; 
import moment from 'moment';
import { useLocation } from 'react-router-dom';
import DeliveryForm from './DeliveryForm';  

const PORCENTAJE_INGREDIENTE_EXTRA = 0.15;

const MakeYourPizza = () => {
  const { activePizzas, sessionData } = useContext(_PizzaContext);
  const [sizeSeleccionado, setSizeSeleccionado] = useState('');
  const [ingredientesDisponibles, setIngredientesDisponibles] = useState([]);
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]);
  const [preciosBase, setPreciosBase] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const location = useLocation();
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
    cupones: initialCompra.cupones || [], // Usa cupones pasados
    venta: initialCompra.venta || [],
    total_productos: initialCompra.total_productos || 0.0,
    total_descuentos: initialCompra.total_descuentos || 0.0,
    total_a_pagar_con_descuentos: initialCompra.total_a_pagar_con_descuentos || 0.0,
    venta_procesada: 0,
    origen: 'MakeYourPizza',
  });


  
  
  useEffect(() => {
    console.log('Estado de compra actualizado:', compra);
  }, [compra]);
  useEffect(() => {
    if (activePizzas && activePizzas.length > 0) {
      const preciosBaseCalculados = {};
      activePizzas.forEach((pizza) => {
        const priceBySize = JSON.parse(pizza.PriceBySize || '{}');
        Object.keys(priceBySize).forEach((size) => {
          if (
            !preciosBaseCalculados[size] ||
            priceBySize[size] < preciosBaseCalculados[size]
          ) {
            preciosBaseCalculados[size] = parseFloat(priceBySize[size]);
          }
        });
      });
      setPreciosBase(preciosBaseCalculados);
    }
  }, [activePizzas]);
  useEffect(() => {
    if (activePizzas && activePizzas.length > 0) {
      const allIngredientes = [];
      activePizzas.forEach((pizza) => {
        const ingredientes = JSON.parse(pizza.ingredientes || '[]');
        allIngredientes.push(
          ...ingredientes.map((ing) => ({
            nombre: ing.ingrediente,
            IDI: ing.IDI,
          }))
        );
      });
      const uniqueIngredientes = allIngredientes.filter(
        (ing, index, self) =>
          index === self.findIndex((t) => t.IDI === ing.IDI)
      );
      setIngredientesDisponibles(uniqueIngredientes);
    }
  }, [activePizzas]);
  useEffect(() => {
    if (!sizeSeleccionado) {
      setTotalPrice(0);
      return;
    }
  
    const precioBase = preciosBase[sizeSeleccionado] || 0;
  
    // Recalcular los precios de los ingredientes seleccionados
    const nuevosIngredientesSeleccionados = ingredientesSeleccionados.map((ing) => {
      const nuevoPrecio = parseFloat(
        (precioBase * PORCENTAJE_INGREDIENTE_EXTRA).toFixed(2)
      );
      return {
        ...ing,
        precio: nuevoPrecio, // Actualizamos el precio del ingrediente
      };
    });
  
    setIngredientesSeleccionados(nuevosIngredientesSeleccionados);
  
    // Calcular el precio total
    const precioIngredientes = nuevosIngredientesSeleccionados.reduce(
      (acc, ing) => acc + ing.precio,
      0
    );
  
    setTotalPrice(parseFloat((precioBase + precioIngredientes).toFixed(2)));
  }, [sizeSeleccionado, preciosBase, ingredientesSeleccionados]);
  


  const calcularPrecioIngrediente = (ingrediente, size) => {
    const precioBase = preciosBase[size];
    if (!precioBase) return 0;
    return parseFloat((precioBase * PORCENTAJE_INGREDIENTE_EXTRA).toFixed(2));
  };
  const handleAgregarIngrediente = (ingrediente) => {
    if (!sizeSeleccionado) {
      alert('Debes seleccionar un tamaño antes de agregar ingredientes.');
      return;
    }

    if (ingredientesSeleccionados.some((ing) => ing.IDI === ingrediente.IDI)) {
      return;
    }

    const precioIngrediente = calcularPrecioIngrediente(
      ingrediente,
      sizeSeleccionado
    );

    const ingredienteConPrecio = {
      ...ingrediente,
      precio: precioIngrediente,
    };

    setIngredientesSeleccionados((prev) => [...prev, ingredienteConPrecio]);
  };
  const handleEliminarIngrediente = (IDI) => {
    setIngredientesSeleccionados((prev) =>
      prev.filter((ing) => ing.IDI !== IDI)
    );
  };
  const handleConfirmarPizza = () => {
    if (!sizeSeleccionado) {
      alert('Por favor selecciona un tamaño.');
      return;
    }
  
    const nuevaPizza = {
      id: uuidv4(),
      nombre: 'Pizza Personalizada',
      size: sizeSeleccionado,
      cantidad: 1,
      total: totalPrice,
      basePrice: preciosBase[sizeSeleccionado], // Este es el precio de la base que necesitamos
      extraIngredients: ingredientesSeleccionados.map((ing) => ({
        IDI: ing.IDI,
        nombre: ing.nombre,
        precio: ing.precio,
      })),
    };
    
  
    setCompra((prevCompra) => {
      const nuevaVenta = [...prevCompra.venta, nuevaPizza];
      const nuevoTotalProductos = nuevaVenta.reduce((acc, item) => acc + item.total, 0);
  
      return {
        ...prevCompra,
        venta: nuevaVenta,
        total_productos: parseFloat(nuevoTotalProductos.toFixed(2)),
        total_a_pagar_con_descuentos: parseFloat(nuevoTotalProductos.toFixed(2)),
      };
    });
  
    setSizeSeleccionado('');
    setIngredientesSeleccionados([]);
    setTotalPrice(0);
    handleCloseForm();
    alert('Pizza añadida al carrito');
    console.log('Pizza añadida al carrito:', nuevaPizza);
  };
  const handleEditProduct = (productoEditado) => {
    setSizeSeleccionado(productoEditado.size);
    setIngredientesSeleccionados(productoEditado.extraIngredients || []);
    setTotalPrice(productoEditado.total);
    setIsEditing(true); // Activar el modo edición
    setEditingProductId(productoEditado.id); // Guardar el ID del producto a editar
  };
  const handleUpdateProduct = () => {
    setCompra((prevCompra) => {
      const nuevaVenta = prevCompra.venta.map((producto) => {
        if (producto.id === editingProductId) {
          // Recalcular el precio base y el precio de los ingredientes extras
          const precioBase = preciosBase[sizeSeleccionado];
          const nuevosIngredientes = ingredientesSeleccionados.map((ing) => {
            const nuevoPrecioIngrediente = parseFloat(
              (precioBase * PORCENTAJE_INGREDIENTE_EXTRA).toFixed(2)
            );
            return {
              ...ing,
              precio: nuevoPrecioIngrediente, // Actualizamos el precio del ingrediente extra
            };
          });
  
          // Calcular el nuevo total
          const nuevoTotal = parseFloat(
            (
              precioBase +
              nuevosIngredientes.reduce((acc, ing) => acc + ing.precio, 0)
            ).toFixed(2)
          );
  
          return {
            ...producto,
            size: sizeSeleccionado,
            basePrice: precioBase, // Actualizamos el precio base
            total: nuevoTotal, // Nuevo total de la pizza
            extraIngredients: nuevosIngredientes, // Ingredientes con precios actualizados
          };
        }
        return producto;
      });
  
      // Calcular el nuevo total de productos
      const nuevoTotalProductos = nuevaVenta.reduce((acc, item) => acc + item.total, 0);
  
      return {
        ...prevCompra,
        venta: nuevaVenta,
        total_productos: parseFloat(nuevoTotalProductos.toFixed(2)),
        total_a_pagar_con_descuentos: parseFloat(nuevoTotalProductos.toFixed(2)),
      };
    });
  
    // Limpieza completa del formulario después de la actualización
    setSizeSeleccionado(''); // Reiniciar tamaño seleccionado
    setIngredientesSeleccionados([]); // Vaciar ingredientes seleccionados
    setTotalPrice(0); // Reiniciar precio total
    setIsEditing(false); // Salir del modo edición
    setEditingProductId(null); // Limpiar el ID del producto en edición
    handleCloseForm();
    // Opcional: mensaje para confirmar la acción al usuario
    alert('Pizza editada =).');
  };
  const handleCloseForm = () => {
    setSizeSeleccionado('');
    setIngredientesSeleccionados([]);
    setTotalPrice(0);
    setIsEditing(false);
    setEditingProductId(null);
    // Aquí puedes ocultar el formulario o panel adicional
  };
  const handleNextStep = () => {
    if (compra.venta.length === 0) {
      alert('Debes añadir al menos una pizza al carrito antes de continuar.');
      return;
    }
    setShowDeliveryForm(true); // Cambiar a la vista de DeliveryForm
  };
  const calcularTotalDescuentos = () => {
    let totalProductos = compra.venta.reduce((acc, item) => acc + (item.total || 0), 0);
    const costoDelivery = compra.Entrega?.Delivery?.costo || 0;
    const costoCupon = compra.cupones.reduce((acc, cupon) => acc + (cupon.PrecioCupon || 0), 0);
    totalProductos += costoDelivery + costoCupon;
    setCompra((prevCompra) => ({
      ...prevCompra,
      total_productos: parseFloat(totalProductos.toFixed(2)),
    }));
  };


  
  return (
    <div className="make-your-pizza-container">
      {/* Carrito flotante siempre visible */}
      <FloatingCart
        compra={compra}
        setCompra={setCompra}
        handleEditProduct={handleEditProduct}
        handleNextStep={handleNextStep}
      />
  
      {/* Contenido condicional basado en `showDeliveryForm` */}
      {!showDeliveryForm ? (
        <>
          <h2>Crea tu Pizza</h2>
  
          {/* Selección de tamaño */}
          <div className="size-selection">
            <h3>Selecciona el tamaño:</h3>
            <select
              value={sizeSeleccionado}
              onChange={(e) => setSizeSeleccionado(e.target.value)}
            >
              <option value="">Selecciona un tamaño</option>
              {Object.keys(preciosBase).map((size) => (
                <option key={size} value={size}>
                  {size} - {preciosBase[size].toFixed(2)}€
                </option>
              ))}
            </select>
          </div>
  
          {/* Panel de ingredientes */}
          <div className="ingredientes-panel">
            <h3>Selecciona tus ingredientes:</h3>
            <div className="ingredientes-grid">
              {ingredientesDisponibles.map((ingrediente) => (
                <button
                  key={ingrediente.IDI}
                  className={`ingrediente-boton ${
                    ingredientesSeleccionados.some(
                      (ing) => ing.IDI === ingrediente.IDI
                    )
                      ? "seleccionado"
                      : ""
                  }`}
                  onClick={() => handleAgregarIngrediente(ingrediente)}
                >
                  <span>{ingrediente.nombre}</span>
                  <span>
                    (
                    {sizeSeleccionado
                      ? `${calcularPrecioIngrediente(
                          ingrediente,
                          sizeSeleccionado
                        ).toFixed(2)}€`
                      : "0.00€"}
                    )
                  </span>
                </button>
              ))}
            </div>
          </div>
  
          {/* Ingredientes seleccionados */}
          <div className="ingredientes-seleccionados-contenedor">
            <h4>Ingredientes seleccionados:</h4>
            <div className="ingredientes-horizontales">
              {sizeSeleccionado && (
                <div className="ingrediente-cuadro">
                  <span>
                    Base de Pizza <br />
                    ({sizeSeleccionado}) ➡️{" "}
                    {preciosBase[sizeSeleccionado]?.toFixed(2)}€
                  </span>
                </div>
              )}
              {ingredientesSeleccionados.map((ing, index) => (
                <React.Fragment key={ing.IDI}>
                  {index > 0 || sizeSeleccionado ? (
                    <span className="separador">➕</span>
                  ) : null}
                  <div className="ingrediente-cuadro">
                    <span>{ing.nombre}</span>
                    <span>({ing.precio.toFixed(2)}€)</span>
                    <button
                      className="boton-eliminar"
                      onClick={() => handleEliminarIngrediente(ing.IDI)}
                    >
                      Eliminar
                    </button>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
  
          {/* Precio total */}
          <h3>Precio Total: {totalPrice.toFixed(2)}€</h3>
          <button onClick={isEditing ? handleUpdateProduct : handleConfirmarPizza}>
            {isEditing ? "Editar Pizza" : "Añadir al Carrito"}
          </button>
        </>
      ) : (
        <DeliveryForm compra={compra} setCompra={setCompra} />
      )}
    </div>
  );
  
  
};

export default MakeYourPizza;
