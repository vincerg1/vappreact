import React, { useContext, useState, useEffect } from 'react';
import { _PizzaContext } from './_PizzaContext';
import { PurchaseContext } from './PurchaseContext'; 
import { useLocation } from 'react-router-dom'; 
import { v4 as uuidv4 } from 'uuid'; 
import { Swiper, SwiperSlide } from 'swiper/react';
import axios from 'axios';
import moment from 'moment';
import FloatingCart from './FloatingCart'; 
import DeliveryForm from './DeliveryForm';  
import '../styles/CustomerMenu.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';



const CustomerMenu = () => {
  const { activePizzas, sessionData, updateSessionData, inventario } = useContext(_PizzaContext);
  const {
    compra,
    setCompra,
    addPizzasToVenta,        // si defines en el contexto la función para añadir pizzas
    agregarComplemento,      // para añadir complementos
    eliminarComplemento,     // para eliminar complementos
    updateProductInVenta,    // para editar productos en la venta
  } = useContext(PurchaseContext);
  const location = useLocation();
  const [incentivos, setIncentivos] = useState([]);
  const [clienteInfo, setClienteInfo] = useState(sessionData?.cliente || null); 
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);  
  const [ingredientesActivos, setIngredientesActivos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [menuPizzas, setMenuPizzas] = useState([]);
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (location.state?.compra) {
      // Mezclamos lo que venga de location con lo actual del context
      setCompra(prev => ({
        ...prev,
        ...location.state.compra,
      }));
    }
  }, [location.state?.compra, setCompra]);
  useEffect(() => {
    const fetchMenuPizzas = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/menu_pizzas`);
        setMenuPizzas(response.data.data);
        console.log("✅ Pizzas obtenidas desde la base de datos EN cm:", response.data.data);
      } catch (error) {
        console.error("❌ Error obteniendo menu_pizzas:", error);
      }
    };
    fetchMenuPizzas();
  }, []);
  useEffect(() => {
    if (menuPizzas.length > 0 && inventario && inventario.length > 0) {
      let allIngredients = [];

      menuPizzas
        .filter(pizza => pizza.categoria !== "Base Pizza")
        .forEach((pizza) => {
          const ingredientesPizza = JSON.parse(pizza.ingredientes || "[]");
          allIngredients = allIngredients.concat(
            ingredientesPizza.map((ing) => ({
              ...ing,
              ingrediente: ing.ingrediente || "Sin nombre",
              estadoGEN: inventario.find(inv => inv.IDI === ing.IDI)?.estadoGEN || 0,
              cantBySize: ing.cantBySize || {},
            }))
          );
        });
      
      // Filtrar solo los ingredientes activos y con cantidades definidas
      const ingredientesFiltrados = allIngredients.filter(
        (ing) => ing.estadoGEN === 0 && Object.keys(ing.cantBySize).length > 0
      );

      // Eliminar duplicados por IDI
      const uniqueIngredients = ingredientesFiltrados.filter(
        (ing, index, self) => index === self.findIndex((t) => t.IDI === ing.IDI)
      );

      setIngredientesActivos(uniqueIngredients);
      console.log("✅ Ingredientes disponibles SIN Base Pizza:", uniqueIngredients);
    }
  }, [menuPizzas, inventario]);
  useEffect(() => {
    const loadClienteInfo = async () => {
      try {
        const idCliente = sessionData?.id_cliente;
        if (idCliente && !clienteInfo) {
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/clientes/${idCliente}`);
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
    console.log('Estado de compra actualizado (desde el contexto):', compra);
  }, [compra]);
  useEffect(() => {
    if (selectedPizza) {
      console.log("Pizza seleccionada recibida:", selectedPizza);
      handleSelectPizza(selectedPizza); // Abre el modal automáticamente
    }
  }, [selectedPizza]);
  useEffect(() => {
    const fetchExtraPrices = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/IngredientExtraPrices`);
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
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => {
    if (!selectedPizza) return;
    if (isEditing) return;  // 🔐 Evita overwrite durante edición
    console.log("Pizza seleccionada recibida:", selectedPizza);
    handleSelectPizza(selectedPizza); // solo se llama desde menú
  }, [selectedPizza, isEditing]);
  useEffect(() => {
    console.log("📦 isFormVisible:", isFormVisible);
    console.log("📦 selectedPizza:", selectedPizza);
  }, [isFormVisible, selectedPizza]);
  useEffect(() => {
    if (pizzaDetails && selectedSize && quantity) {
      const basePrice = pizzaDetails.PriceBySize[selectedSize] * quantity;
      const extrasTotal = extraIngredients.reduce(
        (acc, ing) => acc + (parseFloat(ing.precio) * quantity),
        0
      );
      setTotalPrice(basePrice + extrasTotal);
    }
  }, [pizzaDetails, selectedSize, quantity, extraIngredients]);

  const fetchPizzaDetails = async (pizzaId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/menu_pizzas/${pizzaId}`);
      const pizzaData = response.data.data;
      if (pizzaData && pizzaData.PriceBySize) {
        const priceBySize = (typeof pizzaData.PriceBySize === "string")
          ? JSON.parse(pizzaData.PriceBySize)
          : pizzaData.PriceBySize;
        const ingredientes = (typeof pizzaData.ingredientes === "string")
          ? JSON.parse(pizzaData.ingredientes)
          : pizzaData.ingredientes;

        setPizzaDetails({
          descripcion: pizzaData.descripcion,
          PriceBySize: priceBySize,
          ingredientes: ingredientes,
        });
      }
    } catch (error) {
      console.error('Error al obtener los detalles de la pizza:', error);
    }
  };
  const handleSelectPizza = (pizza) => {
    // 🧠 Protección adicional por si se llama accidentalmente en modo edición
    if (isEditing) return;
  
    setSelectedPizza(pizza);
    fetchPizzaDetails(pizza.id);
    setFormVisible(true);
  
    // ⚠️ Solo limpiar el estado si NO estamos editando
    setSelectedSize('');
    setQuantity(1);
    setTotalPrice(0);
    setSizeError('');
    setExtraIngredients([]);
  };
  const handleCloseForm = () => {
    setFormVisible(false);
    setSelectedPizza(null);
    setPizzaDetails(null);
    setSelectedSize('');
    setQuantity(1);
    setExtraIngredients([]);
  };
  const handleSizeChange = (e) => {
    const size = e.target.value;
    setSelectedSize(size);
    setSizeError('');

    if (pizzaDetails?.PriceBySize) {
      const basePrice = pizzaDetails.PriceBySize[size] * quantity;
      const extraPrice = extraIngredients.reduce((acc, ing) => {
        return acc + (ingredientesExtraPrecios[size] * quantity);
      }, 0);
      setTotalPrice(basePrice + extraPrice);
    }
  };
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setQuantity(value > 0 ? value : 1);

    if (selectedSize && pizzaDetails?.PriceBySize) {
      const basePrice = pizzaDetails.PriceBySize[selectedSize] * (value > 0 ? value : 1);
      const extraPrice = extraIngredients.reduce((acc, ing) => {
        return acc + (ingredientesExtraPrecios[selectedSize] * (value > 0 ? value : 1));
      }, 0);
      setTotalPrice(basePrice + extraPrice);
    }
  };
  const handleAddExtraIngredient = (selectedIngredientIDI) => {
    if (!selectedIngredientIDI || !selectedSize) return;

    // Buscar el ingrediente en todo el menuPizzas
    const ingredienteSeleccionado = menuPizzas
      .flatMap((pz) => JSON.parse(pz.ingredientes || "[]"))
      .find((ing) => ing.IDI === selectedIngredientIDI);

    if (!ingredienteSeleccionado) {
      console.warn("⚠️ Ingrediente no encontrado en menuPizzas:", selectedIngredientIDI);
      return;
    }

    const cantidadPorSize = ingredienteSeleccionado.cantBySize?.[selectedSize] || 0;
    if (cantidadPorSize === 0) {
      console.warn(`⚠️ Ingrediente ${ingredienteSeleccionado.ingrediente} no tiene cantBySize para ${selectedSize}`);
      return;
    }

    setExtraIngredients((prevExtras) => {
      if (prevExtras.some((ing) => ing.IDI === selectedIngredientIDI)) return prevExtras;

      const ingredienteConPrecio = {
        ...ingredienteSeleccionado,
        nombre: ingredienteSeleccionado.ingrediente || "Sin nombre",
        precio: ingredientesExtraPrecios[selectedSize] || 0,
        cantBySize: cantidadPorSize,
        IDI: ingredienteSeleccionado.IDI,
      };
      return [...prevExtras, ingredienteConPrecio];
    });
  };
  const handleRemoveExtraIngredient = (ingredientIDI) => {
    setExtraIngredients((prevExtras) => {
      const updatedExtras = prevExtras.filter((ing) => ing.IDI !== ingredientIDI);
      actualizarPrecioTotal(updatedExtras);
      return updatedExtras;
    });
  };
  const actualizarPrecioTotal = (updatedExtras) => {
    if (!pizzaDetails?.PriceBySize || !selectedSize) return;
    const basePrice = pizzaDetails.PriceBySize[selectedSize] * quantity;
    const extraPrice = updatedExtras.reduce((acc, ing) => {
      return acc + parseFloat(ingredientesExtraPrecios[selectedSize] || 0) * quantity;
    }, 0);

    const newTotalPrice = (!isNaN(basePrice) && !isNaN(extraPrice))
      ? parseFloat((basePrice + extraPrice).toFixed(2))
      : 0;

    setTotalPrice(newTotalPrice);
  };
  const handleAddAnotherPizza = () => {
    if (!selectedSize) {
      setSizeError("Debes seleccionar un tamaño para continuar");
      return;
    }

    // Reconstruimos los ingredientes extras con la cantBySize actualizada
    const updatedExtraIngredients = extraIngredients.map((ing) => {
      const matchingIngredient = ingredientesActivos.find(item => item.IDI === ing.IDI);
      return {
        IDI: ing.IDI,
        cantBySize: matchingIngredient?.cantBySize?.[selectedSize] || 0,
        nombre: ing.nombre || "Sin nombre",
        precio: !isNaN(ing.precio) ? parseFloat(ing.precio.toFixed(2)) : 0,
      };
    });

    // Creamos un array con N pizzas, si la cantidad es > 1
    const pizzasToAdd = Array.from({ length: quantity }, () => ({
      uuid: uuidv4(),
      id: selectedPizza.id,
      nombre: selectedPizza.nombre,
      size: selectedSize,
      cantidad: 1,
      total: totalPrice / quantity,
      basePrice: pizzaDetails.PriceBySize[selectedSize],
      extraIngredients: updatedExtraIngredients,
    }));

    // Aquí puedes usar directamente "addPizzasToVenta" si lo tienes en el context:
    // addPizzasToVenta(pizzasToAdd, totalPrice);

    // O seguir usando "setCompra" como venías haciendo:
    setCompra((prev) => ({
      ...prev,
      venta: [...prev.venta, ...pizzasToAdd],
      total_productos: prev.total_productos + totalPrice,
    }));

    // Reset UI modal
    setFormVisible(false);
    setSelectedPizza(null);
    setSizeError('');
  };
  const handleNextStep = () => {
    setShowDeliveryForm(true);
  };
  const handleUpdateProduct = () => {
    if (!selectedPizza || !selectedSize || !quantity || quantity <= 0) {
      console.warn("⚠️ Datos insuficientes para actualizar producto.");
      return;
    }
  
    const updatedExtraIngredients = extraIngredients.map((ing) => {
      const matchingIngredient = activePizzas
        .flatMap(p => JSON.parse(p.ingredientes))
        .find(item => item.IDI === ing.IDI);
  
      return {
        IDI: ing.IDI,
        nombre: ing.nombre || ing.ingrediente || "Ingrediente Desconocido",
        cantBySize: matchingIngredient?.cantBySize?.[selectedSize] || 0,
        precio: parseFloat(ing.precio) || 0,
      };
    });
  
    // 🔄 Precio unitario (ya que totalPrice es por todas)
    const precioUnitario = parseFloat((totalPrice / quantity).toFixed(2));
    const basePrice = pizzaDetails?.PriceBySize?.[selectedSize] || 0;
  
    // 🔍 Eliminamos pizzas viejas del mismo grupo
    setCompra((prev) => {
      const nuevaVenta = prev.venta.filter((p) => {
        const mismosIngredientes =
          JSON.stringify(p.extraIngredients || []) !==
          JSON.stringify(selectedPizza.extraIngredients || []);
        return (
          p.id !== selectedPizza.id ||
          p.size !== selectedSize ||
          mismosIngredientes
        );
      });
  
      // 🔁 Reemplazamos por la nueva cantidad
      const pizzasActualizadas = Array.from({ length: quantity }, () => ({
        uuid: uuidv4(),
        id: selectedPizza.id,
        nombre: selectedPizza.nombre,
        size: selectedSize,
        cantidad: 1,
        basePrice,
        total: precioUnitario,
        extraIngredients: updatedExtraIngredients,
      }));
  
      return {
        ...prev,
        venta: [...nuevaVenta, ...pizzasActualizadas],
      };
    });
  
    // 🧼 Limpieza final
    setFormVisible(false);
    setIsEditing(false);
    setEditingProductId(null);
    setSelectedPizza(null);
  };
  const handleEditProduct = (grupo) => {
    if (!grupo || !grupo.items || grupo.items.length === 0) {
      console.warn("⚠️ Grupo inválido en handleEditProduct:", grupo);
      return;
    }
  
    const itemReferencia = grupo.items[0];
    const cantidadTotal = grupo.cantidadTotal;
  
    // 🛠️ 1️⃣ Activar modo edición
    setIsEditing(true);
  
    // 2️⃣ ID del producto
    setEditingProductId(itemReferencia.id);
  
    // 3️⃣ Tamaño y cantidad
    setSelectedSize(itemReferencia.size);
    setQuantity(cantidadTotal);
  
    // 4️⃣ Cargar detalles desde la base
    fetchPizzaDetails(itemReferencia.id);
  
    // 5️⃣ Ingredientes extras
    const validExtraIngredients = itemReferencia.extraIngredients?.map((ing) => {
      const matchingIngredient = activePizzas
        .flatMap(pizza => JSON.parse(pizza.ingredientes || "[]"))
        .find(item => item.IDI === ing.IDI);
  
      return {
        IDI: ing.IDI,
        nombre: ing.nombre || ing.ingrediente || "Ingrediente Desconocido",
        cantBySize: matchingIngredient?.cantBySize?.[itemReferencia.size] || 0,
        precio: parseFloat(ing.precio) || 0,
      };
    }) || [];
  
    setExtraIngredients(validExtraIngredients);
  
    // 6️⃣ Precio total
    const precioIndividual = parseFloat(itemReferencia.total) || 0;
    const precioFinal = +(precioIndividual * cantidadTotal).toFixed(2);
    setTotalPrice(precioFinal);
  
    // 7️⃣ Estructura para pizzas mitad y mitad
    let halfAndHalfSafe = null;
    if (itemReferencia.halfAndHalf) {
      const izquierda = itemReferencia.halfAndHalf.izquierda || {};
      const derecha = itemReferencia.halfAndHalf.derecha || {};
  
      const leftPizzaExists = activePizzas.some(p => p.id === izquierda.id);
      const rightPizzaExists = activePizzas.some(p => p.id === derecha.id);
  
      if (!leftPizzaExists || !rightPizzaExists) {
        console.warn("⚠️ Mitades inválidas o no disponibles:", izquierda, derecha);
      }
  
      halfAndHalfSafe = {
        izquierda: {
          id: izquierda.id || null,
          nombre: izquierda.nombre || "Mitad vacía",
          precio: parseFloat(izquierda.precio) || 0,
        },
        derecha: {
          id: derecha.id || null,
          nombre: derecha.nombre || "Mitad vacía",
          precio: parseFloat(derecha.precio) || 0,
        },
      };
    }
  
    // 8️⃣ Setear pizza para edición
    setSelectedPizza({
      ...itemReferencia,
      halfAndHalf: halfAndHalfSafe,
    });
  
    // 9️⃣ Mostrar formulario
    setFormVisible(true);
  };
  
  
  const handleAgregarComplemento = (complemento) => {
    agregarComplemento(complemento); 
    // o setCompra((prevCompra) => {...})
  };
  const handleEliminarComplemento = (idComplemento) => {
    eliminarComplemento(idComplemento);
  };
  const renderIngredientDescription = () => {
  if (pizzaDetails && pizzaDetails.ingredientes && pizzaDetails.ingredientes.length > 0) {
    const ingredientes = pizzaDetails.ingredientes.map((ing) => ing.ingrediente);
    const lastIngredient = ingredientes.pop();
    const ingredientList = ingredientes.length > 0
      ? ingredientes.join(', ') + ' y ' + lastIngredient
      : lastIngredient;
    
    return `Esta pizza está elaborada con: ${ingredientList}.`;
  }
  return '';
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
        agregarComplemento={handleAgregarComplemento}
        eliminarComplemento={handleEliminarComplemento}
      />

      {!showDeliveryForm && (
        <>
          {isMobile ? (
            <>
              {/* 🔍 Botón flotante */}
              <button className="search-float-button" onClick={() => setShowSearchModal(true)}>
                🔍
              </button>

              {/* 🎯 Swiper de pizzas */}
              <Swiper
                direction="vertical"
                slidesPerView={1}
                className="pizza-swiper"
                mousewheel
              >
                {activePizzas
                  .filter(p => p.categoria !== "Base Pizza")
                  .map(pizza => (
                    <SwiperSlide key={pizza.id}>
                      <div className="pizza-slide">
                        <img
                          className="pizza-slide-image"
                          src={`${process.env.REACT_APP_API_URL}/${pizza.imagen}`}
                          alt={pizza.nombre}
                        />
                        <div className="pizza-overlay">
                          <h2>{pizza.nombre}</h2>
                        </div>
                        <div className="pizza-controls">
                          <button className="botonOverlay" onClick={() => handleSelectPizza(pizza)}>
                           Choose
                          </button>
                          <p className="swipe-hint">⬇️ Swipe to see more</p>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
              </Swiper>

              {/* 🔍 MODAL DE BÚSQUEDA */}
              {showSearchModal && (
                <div className="modal-overlay" onClick={() => setShowSearchModal(false)}>
                  <div className="search-modal" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="search"
                      className="search-input"
                      placeholder="find pizza..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <ul className="search-results">
                      {activePizzas
                        .filter(p => p.categoria !== "Base Pizza")
                        .filter(pizza =>
                          pizza.nombre.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((pizza) => (
                          <li
                            key={pizza.id}
                            className="search-result-item"
                            onClick={() => {
                              handleSelectPizza(pizza);
                              setShowSearchModal(false);
                            }}
                          >
                            <img
                              src={`${process.env.REACT_APP_API_URL}/${pizza.imagen}`}
                              alt={pizza.nombre}
                            />
                            <span>{pizza.nombre}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h1>Selecciona tu Pizza del Menú</h1>
              <div className="menu-containerCM">
                {activePizzas
                  .filter(pizza => pizza.categoria !== "Base Pizza")
                  .map(pizza => (
                    <div className="menu-item-cm" key={pizza.id}>
                      <div className="menu-image-cm">
                        <img
                          src={`${process.env.REACT_APP_API_URL}/${pizza.imagen}`}
                          alt={pizza.nombre}
                        />
                      </div>
                      <div className="menu-details">
                        <h3>{pizza.nombre}</h3>
                        <button
                          className="botonSeleccionarMenu"
                          onClick={() => handleSelectPizza(pizza)}
                        >
                          Seleccionar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </>
      )}
      {showDeliveryForm && (
        <DeliveryForm compra={compra} setCompra={setCompra} />
      )}
      {isFormVisible && pizzaDetails && (
        <div className="form-container-cm">
          <div className="modal-content-cm">
            <button className="close-button-cm" onClick={handleCloseForm}>
              ✖
            </button>
            <h3>More about {selectedPizza.nombre}</h3>
            <p className="pizza-description">{pizzaDetails.descripcion}</p>
            <p className="ingredient-description">
              {renderIngredientDescription()}
            </p>

            <label htmlFor="size">Size:</label>
            <select
              id="size"
              value={selectedSize}
              onChange={handleSizeChange}
              className={sizeError ? 'error-border' : ''}
            >
              <option value="" disabled>Choose your size </option>
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

            <label htmlFor="quantity">Quantity:</label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={handleQuantityChange}
              min="1"
            />

            <div className="extra-ingredients">
              {selectedSize && (
                <div className="ingrediente-sugerencia animate-shake-loop">
                  👋 Extra toppings right here! 👇
                </div>
              )}

              {selectedSize && (
                <select
                  id="ingredient-select"
                  onChange={(e) => {
                    const selectedIngredientIDI = e.target.value;
                    if (selectedIngredientIDI) {
                      const optionEl = e.target.selectedOptions[0];
                      optionEl.classList.add("blink-option");
                      setTimeout(() => optionEl.classList.remove("blink-option"), 1000);
                      handleAddExtraIngredient(selectedIngredientIDI);
                    }
                  }}
                >
                  <option value="">Choose an extra topping</option>
                  {ingredientesActivos
                    .filter((ing) => ing.cantBySize?.[selectedSize] > 0)
                    .map((ing) => (
                      <option key={ing.IDI} value={ing.IDI}>
                        {ing.ingrediente} (x{ing.cantBySize[selectedSize]})
                      </option>
                    ))}
                </select>
              )}
            </div>



            <ul className="extra-ingredients-list">
              {extraIngredients.map((ing, index) => (
                <li key={index}>
                  {ing.nombre || ing.ingrediente} (
                  {typeof ing.precio === "number"
                    ? parseFloat(ing.precio).toFixed(2)
                    : "0.00"}€)
                  <button onClick={() => handleRemoveExtraIngredient(ing.IDI)}>
                    Del
                  </button>
                </li>
              ))}
            </ul>

            <div className="modal-actions">
              {isEditing ? (
                <button className="botonSeleccionarMenu" onClick={handleUpdateProduct}>
                  Edit Order
                </button>
              ) : (
                <button className="botonSeleccionarMenu" onClick={handleAddAnotherPizza}>
                  Add to Order
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
