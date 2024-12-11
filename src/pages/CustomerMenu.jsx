import React, { useContext, useState, useEffect } from 'react';
import { _PizzaContext } from './_PizzaContext';
import { useLocation } from 'react-router-dom';  
import axios from 'axios';
import moment from 'moment';
import FloatingCart from './FloatingCart'; 
import DeliveryForm from './DeliveryForm';  
import '../styles/CustomerMenu.css';
import { v4 as uuidv4 } from 'uuid';

const CustomerMenu = () => {
  const { activePizzas, sessionData, updateSessionData } = useContext(_PizzaContext);
  const location = useLocation();
  const { compra: initialCompra, setCompra: initialSetCompra } = location.state || {};  
  const [incentivos, setIncentivos] = useState([]);

  const [compra, setCompra] = useState(initialCompra || {
    observaciones: '',
    id_orden: '',
    fecha: moment().format('YYYY-MM-DD'),
    hora: moment().format('HH:mm:ss'),
    id_cliente: sessionData?.id_cliente || '',
    DescuentosDailyChallenge: 0,
    cupones: [],  
    venta: [],
    Entrega: {},
    total_productos: 0.0, 
    total_descuentos: 0.0, 
    total_a_pagar_con_descuentos: 0.0, 
    venta_procesada: 0,
    origen: '',
    observaciones: ''
  });
  

  const [clienteInfo, setClienteInfo] = useState(sessionData?.cliente || null); 
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);  
  const [ingredientesActivos, setIngredientesActivos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  

  // Generar la lista de ingredientes activos a partir de activePizzas
  useEffect(() => {
    if (activePizzas && activePizzas.length > 0) {
      let allIngredients = [];
      activePizzas.forEach(pizza => {
        const ingredientes = JSON.parse(pizza.ingredientes);
        allIngredients = allIngredients.concat(ingredientes);
      });
      const uniqueIngredients = allIngredients.filter((ing, index, self) =>
        index === self.findIndex((t) => t.IDI === ing.IDI)
      );
      setIngredientesActivos(uniqueIngredients);
      console.log('Ingredientes Activos calculados desde activePizzas:', uniqueIngredients);
    }
  }, [activePizzas]);

  // Cargar datos del cliente si no están en sessionData
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
      let totalProductos = compra.venta.reduce((acc, item) => acc + (item.total || 0), 0);
      const costoDelivery = compra.Entrega?.Delivery?.costo || 0;
      if (compra.incentivos?.some(incentivo => incentivo.incentivo === "Delivery Free Pass")) {
        costoDelivery = 0;  // Anular el costo de entrega si se alcanzó el incentivo
      }
      const costoTicketExpress = (compra.Entrega?.Delivery?.costoTicketExpress || 0) + (compra.Entrega?.PickUp?.costoTicketExpress || 0);
      const costoCupon = compra.cupones.reduce((acc, cupon) => acc + (cupon.PrecioCupon || 0), 0);
  
      // Total de productos incluyendo todos los costos adicionales
      totalProductos += costoDelivery + costoTicketExpress + costoCupon;
  
      // Calcular el total del descuento basado en los cupones
      if (compra.cupones.length > 0 && totalProductos > 0) {
        compra.cupones.forEach((cupon) => {
          const descuentoAplicado = totalProductos * (cupon.Descuento || 0);
          const descuentoFinal = Math.min(descuentoAplicado, cupon.Max_Amount || 0);
          totalDescuentos += descuentoFinal;
        });
      }
  
      // Calcular el total a pagar con descuento aplicado
      let totalConDescuento = totalProductos - totalDescuentos;
      if (totalConDescuento < 0) {
        totalConDescuento = 0; // No permitir un total negativo
      }
  
      // Actualizar el estado de compra con los nuevos valores
      setCompra((prevCompra) => ({
        ...prevCompra,
        total_productos: parseFloat(totalProductos.toFixed(2)), // Total incluyendo todos los elementos
        total_descuentos: parseFloat(totalDescuentos.toFixed(2)), // Total de descuentos aplicados
        total_a_pagar_con_descuentos: parseFloat(totalConDescuento.toFixed(2)), // Total a pagar después de aplicar los descuentos
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
  const [selectedPizza, setSelectedPizza] = useState(null);
  const [pizzaDetails, setPizzaDetails] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [sizeError, setSizeError] = useState('');  
  const [extraIngredients, setExtraIngredients] = useState([]);
  const [showIngredientSelect, setShowIngredientSelect] = useState(false);

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
      const extraIngredientsPrice = extraIngredients.reduce((acc, ing) => acc + (pizzaDetails.PriceBySize[size] * 0.15 * quantity), 0);
      setTotalPrice(basePrice + extraIngredientsPrice);
    }
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setQuantity(value > 0 ? value : 1);
    if (selectedSize && pizzaDetails && pizzaDetails.PriceBySize) {
      const basePrice = pizzaDetails.PriceBySize[selectedSize] * value;
      const extraIngredientsPrice = extraIngredients.reduce((acc, ing) => acc + (pizzaDetails.PriceBySize[selectedSize] * 0.15 * value), 0);
      setTotalPrice(basePrice + extraIngredientsPrice);
    }
  };

  const handleAddExtraIngredient = (selectedIngredientIDI) => {
    if (!selectedIngredientIDI) return;

    const ingredienteSeleccionado = ingredientesActivos.find(ing => ing.IDI === selectedIngredientIDI);
    if (ingredienteSeleccionado) {
        setExtraIngredients((prevExtras) => {
            // Evitar agregar duplicados
            if (prevExtras.some((ing) => ing.IDI === selectedIngredientIDI)) return prevExtras;

            // Crear una versión del ingrediente con nombre, IDI, y precio claramente definidos
            const ingredienteConPrecio = {
                ...ingredienteSeleccionado,
                nombre: ingredienteSeleccionado.ingrediente,
                precio: parseFloat((pizzaDetails.PriceBySize[selectedSize] * 0.15 * quantity).toFixed(2)),
                IDI: ingredienteSeleccionado.IDI,
            };

            const updatedExtras = [...prevExtras, ingredienteConPrecio];

            // Calcular y actualizar el precio total
            actualizarPrecioTotal(updatedExtras);

            return updatedExtras;
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
  
  // Nueva función para actualizar el precio total del producto y el estado `compra`
  const actualizarPrecioTotal = (updatedExtras) => {
    // Calcular el precio base de la pizza y el precio de los ingredientes extra
    const basePrice = pizzaDetails.PriceBySize[selectedSize] * quantity;
    const extraIngredientsPrice = updatedExtras.reduce(
      (acc, ing) => acc + parseFloat(ing.precio),
      0
    );
  
    // Calcular el nuevo precio total para este producto
    const newTotalPrice = parseFloat((basePrice + extraIngredientsPrice).toFixed(2));
  
    // Actualizar el precio total en el estado del formulario
    setTotalPrice(newTotalPrice);
  
    // Actualizar también el estado `compra` para reflejar este cambio
    setCompra((prevCompra) => {
      const nuevaVenta = prevCompra.venta.map((producto) => {
        if (producto.id === editingProductId) {
          // Actualizar el producto que se está editando con los nuevos ingredientes y el nuevo precio total
          return {
            ...producto,
            extraIngredients: updatedExtras,
            total: newTotalPrice,
          };
        }
        return producto;
      });
  
      // Calcular el nuevo total de productos y el total a pagar con descuentos
      const nuevoTotalProductos = nuevaVenta.reduce((acc, item) => acc + item.total, 0);
      const nuevoTotalDescuentos = parseFloat((prevCompra.total_descuentos || 0).toFixed(2));
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
  
  
  const handleAddAnotherPizza = () => {
    if (!selectedSize) {
      setSizeError('Debes seleccionar un tamaño para continuar');
      return;
    }
  
    const pizzaToAdd = {
      id: uuidv4(), // Agregamos un identificador único
      id_producto: selectedPizza.id,
      nombre: selectedPizza.nombre,
      size: selectedSize,
      cantidad: quantity,
      total: totalPrice,
      price: pizzaDetails.PriceBySize[selectedSize],
      extraIngredients: extraIngredients.map(ing => ({ 
        IDI: ing.IDI, // Agregar el identificador IDI al ingrediente extra
        nombre: ing.ingrediente || ing.nombre, // Mantener el nombre si ya existe
        precio: parseFloat((pizzaDetails.PriceBySize[selectedSize] * 0.15 * quantity).toFixed(2))
      }))
    };
  
    setCompra((prevCompra) => ({
      ...prevCompra,
      venta: [...prevCompra.venta, pizzaToAdd],
      total_productos: prevCompra.total_productos + totalPrice,
      DescuentosCupon: prevCompra.DescuentosCupon,
      DescuentosDailyChallenge: prevCompra.DescuentosDailyChallenge,
      productos: [...(prevCompra.productos || []), {
        id_pizza: selectedPizza.id,
        cantidad: quantity,
        size: selectedSize,
        price: pizzaDetails.PriceBySize[selectedSize],
        extraIngredients: extraIngredients.map(ing => ({ 
          IDI: ing.IDI, // Agregar el identificador IDI también aquí
          nombre: ing.ingrediente || ing.nombre, 
          precio: parseFloat((pizzaDetails.PriceBySize[selectedSize] * 0.15 * quantity).toFixed(2))
        }))
      }],
      observaciones: prevCompra.observaciones
    }));
  
    setFormVisible(false);
    setSelectedPizza(null);
    setSizeError('');
    console.log('Pizza añadida al carrito:', pizzaToAdd);
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
  const handleEditProduct = (productoEditado) => {
    console.log("Editando el producto:", productoEditado);
    setEditingProductId(productoEditado.id);  // Establece el ID del producto que se está editando
    setSelectedPizza(productoEditado);
    setSelectedSize(productoEditado.size);
    setQuantity(productoEditado.cantidad);
  
    // Asegurarse de que cada ingrediente extra tiene nombre y precio, sin perder información
    const validExtraIngredients = productoEditado.extraIngredients.map((ing) => {
      return {
        nombre: ing.nombre || ing.ingrediente || "Ingrediente Desconocido",
        precio: ing.precio ? parseFloat(ing.precio).toFixed(2) : "0.00"
      };
    });
    setExtraIngredients(validExtraIngredients);
    
    setTotalPrice(productoEditado.total);
    setFormVisible(true);
    setIsEditing(true); // Usar este estado para saber que estamos en modo de edición
  };
  const handleUpdateProduct = () => {
    setCompra((prevCompra) => {
        const nuevaVenta = prevCompra.venta.map((producto) => {
            if (producto.id === editingProductId) {
                // Actualizar solo el producto que está siendo editado
                const updatedProduct = {
                    ...producto,
                    cantidad: quantity,
                    size: selectedSize,
                    total: totalPrice,
                    extraIngredients: extraIngredients.map(ing => ({
                        IDI: ing.IDI, // Asegurar que IDI esté presente
                        nombre: ing.ingrediente || ing.nombre, // Mantener el nombre si ya existe, usar `ingrediente` si está disponible
                        precio: ing.precio ? parseFloat(ing.precio) : parseFloat((pizzaDetails.PriceBySize[selectedSize] * 0.15 * quantity).toFixed(2)) // Mantener precio si existe, calcular si no
                    }))
                };

                // Debug: log del producto actualizado
                console.log("Producto actualizado:", updatedProduct);

                return updatedProduct;
            }
            return producto;
        });

        const nuevoTotalProductos = nuevaVenta.reduce((acc, item) => acc + item.total, 0);

        // Debug: log del nuevo total de productos
        console.log("Nuevo Total de Productos:", nuevoTotalProductos);

        return {
            ...prevCompra,
            venta: nuevaVenta,
            total_productos: parseFloat(nuevoTotalProductos.toFixed(2)),
            total_a_pagar_con_descuentos: parseFloat(
                (nuevoTotalProductos - prevCompra.total_descuentos).toFixed(2)
            ),
        };
    });

    // Finalizar el modo de edición y ocultar el formulario
    setFormVisible(false);
    setIsEditing(false);
    setEditingProductId(null);
  };

  
 
  
  
  
  
  
  
  

  return (
    <>
      {/* Panel de Reviews */}
      {!showDeliveryForm && (
        <div className="reviews-panel">
          <h2>Reseñas Recientes</h2>
          <div className="reviews-carousel">
            {sessionData.reviews && sessionData.reviews.length > 0 ? (
              sessionData.reviews.map((review, index) => (
                <div key={index} className="review-item">
                  <p><strong>{review.nombre_cliente}:</strong> {review.comentario}</p>
                  <p className="review-rating">Calificación: {review.calificacion} ⭐</p>
                </div>
              ))
            ) : (
              <p>No hay reseñas disponibles.</p>
            )}
          </div>
        </div>
      )}

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
            {activePizzas.map(pizza => (
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
      {ing.nombre || ing.ingrediente} ({parseFloat(ing.precio).toFixed(2)}€)
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
