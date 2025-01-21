import React, { useContext, useState, useEffect } from 'react';
import { _PizzaContext } from './_PizzaContext';
import { useLocation } from 'react-router-dom';  
import axios from 'axios';
import moment from 'moment';
import FloatingCart from './FloatingCart'; 
import DeliveryForm from './DeliveryForm';  
import '../styles/CustomerMenu.css';

const CustomerMenu = () => {
  const { activePizzas, sessionData, updateSessionData } = useContext(_PizzaContext);
  const location = useLocation();
  const [incentivos, setIncentivos] = useState([]);
  const initialCompra = location.state?.compra || {};
  const [clienteInfo, setClienteInfo] = useState(sessionData?.cliente || null); 
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);  
  const [ingredientesActivos, setIngredientesActivos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [compra, setCompra] = useState({
    observaciones: '',
    id_orden: '',
    fecha: moment().format('YYYY-MM-DD'),
    hora: moment().format('HH:mm:ss'),
    id_cliente: sessionData?.id_cliente || '',
    DescuentosDailyChallenge: 0,
    cupones: initialCompra.cupones || [], 
    venta: initialCompra.venta || [],
    Entrega: initialCompra.Entrega || {},
    total_productos: initialCompra.total_productos || 0.0,
    total_descuentos: initialCompra.total_descuentos || 0.0,
    total_a_pagar_con_descuentos: initialCompra.total_a_pagar_con_descuentos || 0.0,
    venta_procesada: 0,
    origen: '',
    observaciones: ''
  });

  useEffect(() => {
    if (activePizzas && activePizzas.length > 0) {
      let allIngredients = [];
      activePizzas.forEach((pizza) => {
        const ingredientes = JSON.parse(pizza.ingredientes || "[]");
        allIngredients = allIngredients.concat(
          ingredientes.map((ing) => ({
            ...ing,
            ingrediente: ing.ingrediente || "Sin nombre", // Aseguramos el nombre
          }))
        );
      });
      const uniqueIngredients = allIngredients.filter(
        (ing, index, self) =>
          index === self.findIndex((t) => t.IDI === ing.IDI)
      );
      setIngredientesActivos(uniqueIngredients);
      console.log("Ingredientes Activos calculados desde activePizzas:", uniqueIngredients);
    }
  }, [activePizzas]);
  useEffect(() => {
    const loadClienteInfo = async () => {
      try {
        const idCliente = sessionData?.id_cliente;
        if (idCliente && !clienteInfo) {
          const response = await axios.get(`http://localhost:3001/clientes/${idCliente}`);
          const clienteData = response.data;
          setClienteInfo(clienteData);
          updateSessionData({ ...sessionData, cliente: clienteData });
        }
      } catch (error) {
        console.error('Error al cargar la información del cliente:', error);
      }
    };
    loadClienteInfo();
  }, [sessionData, clienteInfo, updateSessionData]);
  useEffect(() => {
    console.log('Estado de compra actualizado:', compra);
  }, [compra]);
  useEffect(() => {
    const calcularTotalDescuentos = () => {
      let totalDescuentos = 0;
  
      // Calcular el total de productos incluyendo costos adicionales (delivery, ticket express, precio del cupón)
      let totalProductos = compra.venta.reduce((acc, item) => {
        const precioIngredientesExtras = item.extraIngredients?.reduce(
          (sum, ing) => sum + parseFloat(ing.precio || 0),
          0
        ) || 0; // Maneja el caso donde no haya ingredientes extras
  
        const basePrice = parseFloat(item.basePrice || 0);
        const cantidad = parseInt(item.cantidad || 1);
  
        return acc + basePrice * cantidad + precioIngredientesExtras;
      }, 0);
  
      console.log("Total productos inicial:", totalProductos, typeof totalProductos);
  
      // Manejar costos adicionales (delivery, ticket express, cupones)
      let costoDelivery = parseFloat(compra.Entrega?.Delivery?.costo || 0);
        if (isNaN(costoDelivery)) costoDelivery = 0;

        const costoTicketExpress = parseFloat(
          (compra.Entrega?.Delivery?.costoTicketExpress || 0) +
          (compra.Entrega?.PickUp?.costoTicketExpress || 0)
        );
        if (isNaN(costoTicketExpress)) costoTicketExpress = 0;

        const costoCupon = compra.cupones.reduce((acc, cupon) => {
          const precioCupon = parseFloat(cupon.PrecioCupon || 0); // Si es "gratis", será 0
          return acc + (isNaN(precioCupon) ? 0 : precioCupon);
        }, 0);
  
      // Actualizar total de productos incluyendo costos adicionales
      totalProductos += costoDelivery + costoTicketExpress + costoCupon;
  
      console.log("Total productos después de costos adicionales:", totalProductos, typeof totalProductos);
  
      // Calcular descuentos por cupones
      if (compra.cupones.length > 0 && totalProductos > 0) {
        compra.cupones.forEach((cupon) => {
          const descuentoAplicado = totalProductos * parseFloat(cupon.Descuento || 0);
          const descuentoFinal = Math.min(descuentoAplicado, parseFloat(cupon.Max_Amount || 0));
          totalDescuentos += descuentoFinal;
  
          console.log("Descuento aplicado:", {
            descuentoAplicado,
            descuentoFinal,
            cupon,
          });
        });
      }
  
      console.log("Total descuentos:", totalDescuentos, typeof totalDescuentos);
  
      // Calcular total con descuento aplicado
      let totalConDescuento = totalProductos - totalDescuentos;
      if (totalConDescuento < 0) {
        totalConDescuento = 0; 
      }
  
      console.log("Total con descuento:", totalConDescuento, typeof totalConDescuento);
  
      if (isNaN(totalProductos) || isNaN(totalDescuentos) || isNaN(totalConDescuento)) {
        console.error("Error: Valores no numéricos detectados", {
          totalProductos,
          totalDescuentos,
          totalConDescuento,
        });
        return;
      }
      setCompra((prevCompra) => ({
        ...prevCompra,
        total_productos: typeof totalProductos === "number" && !isNaN(totalProductos)
          ? parseFloat(totalProductos.toFixed(2))
          : 0,
        total_descuentos: typeof totalDescuentos === "number" && !isNaN(totalDescuentos)
          ? parseFloat(totalDescuentos.toFixed(2))
          : 0,
        total_a_pagar_con_descuentos: typeof totalConDescuento === "number" && !isNaN(totalConDescuento)
          ? parseFloat(totalConDescuento.toFixed(2))
          : 0,
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
  
  
  const [isFormVisible, setFormVisible] = useState(false);
  const [selectedPizza, setSelectedPizza] = useState(location.state?.selectedPizza || null);
  const [pizzaDetails, setPizzaDetails] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [sizeError, setSizeError] = useState('');  
  const [extraIngredients, setExtraIngredients] = useState([]);
  const [showIngredientSelect, setShowIngredientSelect] = useState(false);
  const [ingredientesExtraPrecios, setIngredientesExtraPrecios] = useState({});

  useEffect(() => {
    if (selectedPizza) {
      console.log("Pizza seleccionada recibida:", selectedPizza);
      handleSelectPizza(selectedPizza); // Abre el modal automáticamente
    }
  }, [selectedPizza]);
  useEffect(() => {
    const fetchExtraPrices = async () => {
      try {
        const response = await axios.get('http://localhost:3001/IngredientExtraPrices');
        const preciosExtra = response.data.reduce((acc, item) => {
          acc[item.size] = item.extra_price;
          return acc;
        }, {});
        setIngredientesExtraPrecios(preciosExtra);
      } catch (error) {
        console.error('Error al obtener los precios de los ingredientes extras:', error);
      }
    };
    fetchExtraPrices();
  }, []);
  
  const fetchPizzaDetails = async (pizzaId) => {
    try {
      const response = await axios.get(`http://localhost:3001/menu_pizzas/${pizzaId}`);
      const pizzaData = response.data.data;

      if (pizzaData && pizzaData.PriceBySize) {
        const priceBySize = JSON.parse(pizzaData.PriceBySize);
        const ingredientes = pizzaData.ingredientes ? JSON.parse(pizzaData.ingredientes) : [];

        setPizzaDetails({
          descripcion: pizzaData.descripcion,
          PriceBySize: priceBySize,
          ingredientes: ingredientes
        });
      }
    } catch (error) {
      console.error('Error al obtener los detalles de la pizza:', error);
    }
  };
  const handleSelectPizza = (pizza) => {
    setSelectedPizza(pizza);
    fetchPizzaDetails(pizza.id);
    setFormVisible(true);
    setSelectedSize('');
    setQuantity(1);
    setTotalPrice(0);
    setSizeError('');  
    setExtraIngredients([]); // Resetear los ingredientes extras
  };
  const handleCloseForm = () => {
    setFormVisible(false);
    setSelectedPizza(null);
    setPizzaDetails(null);
    setSelectedSize('');
    setQuantity(1);
    setExtraIngredients([]); // Resetear los ingredientes extras
  };
  const handleSizeChange = (e) => {
    const size = e.target.value;
    setSelectedSize(size);
    setSizeError('');  
    if (pizzaDetails && pizzaDetails.PriceBySize) {
      const basePrice = pizzaDetails.PriceBySize[size] * quantity;
      const extraIngredientsPrice = extraIngredients.reduce((acc, ing) => acc + (ingredientesExtraPrecios[size] * quantity), 0);
      setTotalPrice(basePrice + extraIngredientsPrice);
    }
  };
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setQuantity(value > 0 ? value : 1);
    if (selectedSize && pizzaDetails && pizzaDetails.PriceBySize) {
      const basePrice = pizzaDetails.PriceBySize[selectedSize] * value;
      const extraIngredientsPrice = extraIngredients.reduce((acc, ing) => acc + (ingredientesExtraPrecios[selectedSize] * value), 0);
      setTotalPrice(basePrice + extraIngredientsPrice);
    }
  };
  const handleAddExtraIngredient = (selectedIngredientIDI) => {
    if (!selectedIngredientIDI || !selectedSize) return;
  
    const ingredienteSeleccionado = ingredientesActivos.find(
      (ing) => ing.IDI === selectedIngredientIDI
    );
  
    if (ingredienteSeleccionado) {
      setExtraIngredients((prevExtras) => {
        if (prevExtras.some((ing) => ing.IDI === selectedIngredientIDI)) return prevExtras;
  
        const ingredienteConPrecio = {
          ...ingredienteSeleccionado,
          nombre: ingredienteSeleccionado.ingrediente || "Sin nombre", // Aseguramos el nombre
          precio: ingredientesExtraPrecios[selectedSize] || 0, // Precio dinámico según tamaño
          IDI: ingredienteSeleccionado.IDI,
        };
  
        return [...prevExtras, ingredienteConPrecio];
      });
    }
  };
  const handleRemoveExtraIngredient = (ingredientIDI) => {
    setExtraIngredients((prevExtras) => {
      // Filtramos los ingredientes actualizando el array de extras
      const updatedExtras = prevExtras.filter((ing) => ing.IDI !== ingredientIDI);
  
      // Calcular y actualizar el precio total después de la eliminación
      actualizarPrecioTotal(updatedExtras);
      
      return updatedExtras;
    });
  };
  const actualizarPrecioTotal = (updatedExtras) => {
    const basePrice = pizzaDetails.PriceBySize[selectedSize] * quantity;
    const extraIngredientsPrice = updatedExtras.reduce(
      (acc, ing) => acc + parseFloat(ingredientesExtraPrecios[selectedSize] || 0) * quantity,
      0
    );
  
    const newTotalPrice =
  typeof basePrice === "number" &&
  !isNaN(basePrice) &&
  typeof extraIngredientsPrice === "number" &&
  !isNaN(extraIngredientsPrice)
    ? parseFloat((basePrice + extraIngredientsPrice).toFixed(2))
    : 0;

setTotalPrice(newTotalPrice);
  };
  const handleAddAnotherPizza = () => {
    if (!selectedSize) {
      setSizeError("Debes seleccionar un tamaño para continuar");
      return;
    }
  
    const pizzaToAdd = {
      id: selectedPizza.id,
      nombre: selectedPizza.nombre,
      size: selectedSize,
      cantidad: quantity,
      total: totalPrice,
      basePrice: pizzaDetails.PriceBySize[selectedSize],
      extraIngredients: extraIngredients.map((ing) => ({
        IDI: ing.IDI,
        nombre: ing.nombre || "Sin nombre",
        precio: typeof ing.precio === "number" && !isNaN(ing.precio)
          ? parseFloat(ing.precio.toFixed(2))
          : 0,
      })),
    };
  
    setCompra((prevCompra) => ({
      ...prevCompra,
      venta: [...prevCompra.venta, pizzaToAdd],
      total_productos: prevCompra.total_productos + totalPrice,
    }));
  
    setFormVisible(false);
    setSelectedPizza(null);
    setSizeError("");
  };
  const renderIngredientDescription = () => {
    if (pizzaDetails && pizzaDetails.ingredientes.length > 0) {
      const ingredientes = pizzaDetails.ingredientes.map((ing) => ing.ingrediente);
      const lastIngredient = ingredientes.pop();
      const ingredientList = ingredientes.length > 0 ? ingredientes.join(', ') + ' y ' + lastIngredient : lastIngredient;
      return `Esta pizza está elaborada con: ${ingredientList}.`;
    }
    return '';
  };
  const handleNextStep = () => {
    setShowDeliveryForm(true); 
  };
  const handleUpdateProduct = () => {
    setCompra((prevCompra) => {
      const nuevaVenta = prevCompra.venta.map((producto) => {
        if (producto.id === editingProductId) {
          const updatedProduct = {
            ...producto,
            size: selectedSize,
            cantidad: quantity,
            total: typeof totalPrice === "number" && !isNaN(totalPrice)
              ? parseFloat(totalPrice.toFixed(2))
              : 0,
            price: typeof pizzaDetails.PriceBySize[selectedSize] === "number" &&
              !isNaN(pizzaDetails.PriceBySize[selectedSize])
              ? parseFloat(pizzaDetails.PriceBySize[selectedSize])
              : 0,
            extraIngredients: extraIngredients.map((ing) => ({
              IDI: ing.IDI,
              nombre: ing.nombre || "Sin nombre",
              precio: typeof ing.precio === "number" && !isNaN(ing.precio)
                ? parseFloat(ing.precio.toFixed(2))
                : 0,
            })),
          };
          return updatedProduct;
        }
        return producto;
      });
  
      // Recalcular el total de productos
      const nuevoTotalProductos = nuevaVenta.reduce(
        (acc, item) => acc + item.total,
        0
      );
  
      return {
        ...prevCompra,
        venta: nuevaVenta,
        total_productos: typeof nuevoTotalProductos === "number" 
          ? parseFloat(nuevoTotalProductos.toFixed(2)) 
          : 0, // Asigna 0 si no es un número válido
        total_a_pagar_con_descuentos: typeof nuevoTotalProductos === "number" && typeof prevCompra.total_descuentos === "number"
          ? parseFloat((nuevoTotalProductos - prevCompra.total_descuentos).toFixed(2)) 
          : 0, // Asigna 0 si alguno de los valores no es un número
      };
      
    });
  
    setFormVisible(false);
    setIsEditing(false);
    setEditingProductId(null);
  };
  
  const handleEditProduct = (productoEditado) => {
    console.log("Editando el producto:", productoEditado);
    setEditingProductId(productoEditado.id); // Establece el ID del producto que se está editando
  
    // Actualizar valores de la pizza seleccionada
    setSelectedPizza({
      ...productoEditado,
      size: productoEditado.size,
      cantidad: productoEditado.cantidad,
    });
  
    // Actualizar valores del tamaño y cantidad
    setSelectedSize(productoEditado.size);
    setQuantity(productoEditado.cantidad);
  
    // Asegurarse de que los ingredientes extras están correctamente formateados
    const validExtraIngredients = productoEditado.extraIngredients.map((ing) => ({
      IDI: ing.IDI,
      nombre: ing.nombre || ing.ingrediente || "Ingrediente Desconocido",
      precio: parseFloat(ing.precio) || 0,
    }));
  
    setExtraIngredients(validExtraIngredients);
  
    // Calcular el precio total en función de los datos actuales
    setTotalPrice(parseFloat(productoEditado.total));
  
    // Establecer el formulario en modo edición
    setFormVisible(true);
    setIsEditing(true); // Activar el modo edición
  };

  return (
    <>

    
      {/* Carrito flotante */}
      <FloatingCart 
      compra={compra} 
      setCompra={setCompra} 
      handleNextStep={handleNextStep} 
      handleEditProduct={handleEditProduct}
      handleAddAnotherPizza={handleAddAnotherPizza}
      extraIngredients={extraIngredients}
      handleRemoveExtraIngredient={handleRemoveExtraIngredient} 
      />

      {/* Menú y selección de pizza */}
      {!showDeliveryForm && (
        <>
          <h1 className="PDCRL">Selecciona Tu Pizza del Menú</h1>
          <div className="menu-container">
           {activePizzas
              .filter(pizza => pizza.categoria !== "Base Pizza")
              .map(pizza => (
                <div className="menu-item-cm" key={pizza.id}>
                  <div className="menu-image-cm">
                    <img src={`http://localhost:3001/${pizza.imagen}`} alt={pizza.nombre} />
                  </div>
                  <div className="menu-details">
                    <h3>{pizza.nombre}</h3>
                    <button className="botonSeleccionarMenu" onClick={() => handleSelectPizza(pizza)}>Seleccionar</button>
                  </div>
                </div>
            ))}
          </div>
        </>
      )}

      {/* Mostrar formulario de condiciones de entrega cuando se hace clic en "Siguiente" */}
      {showDeliveryForm && (
        <DeliveryForm compra={compra} setCompra={setCompra} />
      )}

      {isFormVisible && pizzaDetails && (
        <div className="form-container">
          <div className="modal-content">
            <button className="close-button" onClick={handleCloseForm}>✖</button>
            <h3>Detalles de {selectedPizza.nombre}</h3>
            <p className="pizza-description">{pizzaDetails.descripcion}</p>
            <p className="ingredient-description">{renderIngredientDescription()}</p>

            <label htmlFor="size">Tamaño:</label>
            <select
              id="size"
              value={selectedSize}
              onChange={handleSizeChange}
              className={sizeError ? 'error-border' : ''}  
            >
              <option value="" disabled>Seleccione el tamaño</option>
              {Object.keys(pizzaDetails.PriceBySize).map(size => (
                <option key={size} value={size}>
                  {size} - {pizzaDetails.PriceBySize[size]}€
                </option>
              ))}
            </select>

            {sizeError && (
              <div className="tooltip-error">
                <p>{sizeError}</p>
              </div>
            )}

            <label htmlFor="quantity">Cantidad:</label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={handleQuantityChange}
              min="1"
            />

            {selectedSize && (
              <p className="total-price">Precio total: {totalPrice}€</p>
            )}

            <div className="extra-ingredients">
              {showIngredientSelect ? (
                <>
                  <select id="ingredient-select" disabled={!selectedSize}>
                    <option value="">Seleccione un ingrediente extra</option>
                    {ingredientesActivos.map((ing) => (
                      <option key={ing.IDI} value={ing.IDI}>{ing.ingrediente}</option>
                    ))}
                  </select>
                  <button onClick={() => {
                    if (!selectedSize) {
                      setSizeError('Debes seleccionar un tamaño para continuar');
                      return;
                    }
                    const selectElement = document.getElementById("ingredient-select");
                    const selectedIngredientIDI = selectElement.value;
                    handleAddExtraIngredient(selectedIngredientIDI);
                  }}>Agregar</button>
                </>
              ) : (
                <button onClick={() => {
                  if (!selectedSize) {
                    setSizeError('Debes seleccionar un tamaño para continuar');
                    return;
                  }
                  setShowIngredientSelect(true);
                }}>Agregar Ingrediente Extra</button>
              )}
            </div>

            <ul className="extra-ingredients-list">
              {extraIngredients.map((ing, index) => (
                <li key={index}>
                  {ing.nombre || ing.ingrediente} ({typeof ing.precio === "number" ? parseFloat(ing.precio).toFixed(2) : "0.00"}€)
                  <button onClick={() => handleRemoveExtraIngredient(ing.IDI)}>Eliminar</button>
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              {isEditing ? (
                <button className="botonSeleccionarMenu" onClick={handleUpdateProduct}>
                  Editar Orden
                </button>
              ) : (
                <button className="botonSeleccionarMenu" onClick={handleAddAnotherPizza}>
                  Añadir a la Orden
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default CustomerMenu;
