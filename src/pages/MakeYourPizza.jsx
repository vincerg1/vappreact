import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Swiper, SwiperSlide } from "swiper/react";
import DeliveryForm from './DeliveryForm';  
import _PizzaContext from './_PizzaContext';
import FloatingCart from './FloatingCart';
import '../styles/MakeYourPizza.css'; 
import moment from 'moment';


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
  const [isChoosingType, setIsChoosingType] = useState(true)
  const [isHalfAndHalf, setIsHalfAndHalf] = useState(false);
  const [leftPizza, setLeftPizza] = useState('');
  const [rightPizza, setRightPizza] = useState('');

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
  const navigate = useNavigate();
  
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
      id: 101, // ID genérico para Pizza Personalizada 1
      nombre: 'Pizza Personalizada 1',
      size: sizeSeleccionado,
      cantidad: 1,
      total: totalPrice,
      basePrice: preciosBase[sizeSeleccionado], 
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
        productos: [...(prevCompra.productos || []), {
          id_pizza: nuevaPizza.id,
          cantidad: nuevaPizza.cantidad,
          size: nuevaPizza.size,
          price: nuevaPizza.basePrice,
          extraIngredients: nuevaPizza.extraIngredients.map((ing) => ({
            IDI: ing.IDI,
            nombre: ing.nombre,
            precio: ing.precio,
          })),
        }],
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
    setIsEditing(true);
    setEditingProductId(productoEditado.id);
  
    if (productoEditado.halfAndHalf) {
      setLeftPizza(productoEditado.halfAndHalf.izquierda.id || "");
      setRightPizza(productoEditado.halfAndHalf.derecha.id || "");
      setIsHalfAndHalf(true);
    } else {
      setIsHalfAndHalf(false);
    }
  };
  const handleUpdateProduct = () => {
    setCompra((prevCompra) => {
      const nuevaVenta = prevCompra.venta.map((producto) => {
        if (producto.id === editingProductId) {
          // Caso para "Pizza Completa"
          if (!producto.halfAndHalf) {
            const precioBase = preciosBase[sizeSeleccionado];
            const nuevosIngredientes = ingredientesSeleccionados.map((ing) => {
              const nuevoPrecioIngrediente = parseFloat(
                (precioBase * PORCENTAJE_INGREDIENTE_EXTRA).toFixed(2)
              );
              return {
                ...ing,
                precio: nuevoPrecioIngrediente,
              };
            });
  
            const nuevoTotal = parseFloat(
              (
                precioBase +
                nuevosIngredientes.reduce((acc, ing) => acc + ing.precio, 0)
              ).toFixed(2)
            );
  
            return {
              ...producto,
              size: sizeSeleccionado,
              basePrice: precioBase,
              total: nuevoTotal,
              extraIngredients: nuevosIngredientes,
            };
          }
  
          // Caso para "Mitad y Mitad"
          const leftPizzaData = activePizzas.find((pizza) => pizza.id === leftPizza);
          const rightPizzaData = activePizzas.find((pizza) => pizza.id === rightPizza);
  
          const precioMitadIzquierda = leftPizzaData
            ? parseFloat(
                JSON.parse(leftPizzaData.PriceBySize || "{}")[sizeSeleccionado] / 2
              ) || 0
            : 0;
  
          const precioMitadDerecha = rightPizzaData
            ? parseFloat(
                JSON.parse(rightPizzaData.PriceBySize || "{}")[sizeSeleccionado] / 2
              ) || 0
            : 0;
  
          // Declarar y asignar `totalPrecio`
          const totalPrecio = parseFloat(
            (precioMitadIzquierda + precioMitadDerecha).toFixed(2)
          );
  
          return {
            ...producto,
            size: sizeSeleccionado,
            total: totalPrecio,
            halfAndHalf: {
              izquierda: {
                id: leftPizzaData?.id || producto.halfAndHalf.izquierda.id,
                nombre:
                  leftPizzaData?.nombre || producto.halfAndHalf.izquierda.nombre,
                precio: precioMitadIzquierda,
              },
              derecha: {
                id: rightPizzaData?.id || producto.halfAndHalf.derecha.id,
                nombre:
                  rightPizzaData?.nombre || producto.halfAndHalf.derecha.nombre,
                precio: precioMitadDerecha,
              },
            },
          };
        }
        return producto;
      });
  
      const nuevoTotalProductos = nuevaVenta.reduce(
        (acc, item) => acc + item.total,
        0
      );
  
      return {
        ...prevCompra,
        venta: nuevaVenta,
        total_productos: parseFloat(nuevoTotalProductos.toFixed(2)),
        total_a_pagar_con_descuentos: parseFloat(nuevoTotalProductos.toFixed(2)),
      };
    });
  
    // Limpieza del estado de edición
    setSizeSeleccionado("");
    setIngredientesSeleccionados([]);
    setLeftPizza("");
    setRightPizza("");
    setTotalPrice(0);
    setIsEditing(false);
    setEditingProductId(null);
    alert("Pizza actualizada correctamente.");
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
  const handleConfirmHalfAndHalf = () => {
    if (!sizeSeleccionado) {
      alert("Debes seleccionar el tamaño antes de confirmar.");
      return;
    }
  
    console.log("Tamaño seleccionado:", sizeSeleccionado);
    console.log("Left Pizza ID seleccionada:", leftPizza);
    console.log("Right Pizza ID seleccionada:", rightPizza);
  
    // Buscar pizzas predeterminadas que sean válidas para el tamaño seleccionado
    const leftPizzaDefault =
      activePizzas.find((pizza) => {
        const priceBySize = JSON.parse(pizza.PriceBySize || '{}');
        return JSON.parse(pizza.selectSize || '[]').includes(sizeSeleccionado) && priceBySize[sizeSeleccionado];
      }) || { id: null, nombre: 'Mitad predeterminada', PriceBySize: '{}' };
  
    const rightPizzaDefault =
      activePizzas.find((pizza) => {
        const priceBySize = JSON.parse(pizza.PriceBySize || '{}');
        return JSON.parse(pizza.selectSize || '[]').includes(sizeSeleccionado) && priceBySize[sizeSeleccionado];
      }) || { id: null, nombre: 'Mitad predeterminada', PriceBySize: '{}' };
  
    console.log("Left Pizza Default:", leftPizzaDefault);
    console.log("Right Pizza Default:", rightPizzaDefault);
  
    // Verificar las pizzas seleccionadas por el usuario
    const leftPizzaData =
      activePizzas.find(
        (pizza) =>
          pizza.id === leftPizza &&
          JSON.parse(pizza.selectSize || '[]').includes(sizeSeleccionado)
      ) || leftPizzaDefault;
  
    const rightPizzaData =
      activePizzas.find(
        (pizza) =>
          pizza.id === rightPizza &&
          JSON.parse(pizza.selectSize || '[]').includes(sizeSeleccionado)
      ) || rightPizzaDefault;
  
    console.log("Left Pizza Data encontrada:", leftPizzaData);
    console.log("Right Pizza Data encontrada:", rightPizzaData);
  
    if (!leftPizzaData || !rightPizzaData) {
      alert("No se encontraron pizzas válidas para el tamaño seleccionado.");
      return;
    }
  
    // Calcular precios de las mitades
    const precioMitadIzquierda = (() => {
      try {
        const priceBySize = JSON.parse(leftPizzaData.PriceBySize || '{}');
        return parseFloat(priceBySize[sizeSeleccionado] || 0) / 2;
      } catch (error) {
        console.error("Error al calcular el precio de la mitad izquierda:", error);
        return 0;
      }
    })();
  
    const precioMitadDerecha = (() => {
      try {
        const priceBySize = JSON.parse(rightPizzaData.PriceBySize || '{}');
        return parseFloat(priceBySize[sizeSeleccionado] || 0) / 2;
      } catch (error) {
        console.error("Error al calcular el precio de la mitad derecha:", error);
        return 0;
      }
    })();
  
    console.log("Precio Mitad Izquierda:", precioMitadIzquierda);
    console.log("Precio Mitad Derecha:", precioMitadDerecha);
  
    const totalPrecio = parseFloat(
      (precioMitadIzquierda + precioMitadDerecha).toFixed(2)
    );
  
    console.log("Total Precio Mitad y Mitad:", totalPrecio);
  
    // Crear el objeto de la pizza mitad y mitad
    const nuevaPizza = {
      id: 102,
      nombre: "Pizza Personalizada 2",
      size: sizeSeleccionado,
      cantidad: 1,
      total: totalPrecio,
      halfAndHalf: {
        izquierda: {
          id: leftPizzaData.id || null,
          nombre: leftPizzaData.nombre || "Mitad vacía",
          precio: precioMitadIzquierda,
        },
        derecha: {
          id: rightPizzaData.id || null,
          nombre: rightPizzaData.nombre || "Mitad vacía",
          precio: precioMitadDerecha,
        },
      },
    };
  
    console.log("Nueva Pizza Mitad y Mitad:", nuevaPizza);
  
    // Actualizar el estado del carrito
    setCompra((prevCompra) => {
      const nuevaVenta = [...prevCompra.venta, nuevaPizza];
      const nuevoTotalProductos = nuevaVenta.reduce(
        (acc, item) => acc + item.total,
        0
      );
  
      console.log("Nueva Venta:", nuevaVenta);
  
      return {
        ...prevCompra,
        venta: nuevaVenta,
        total_productos: parseFloat(nuevoTotalProductos.toFixed(2)),
        total_a_pagar_con_descuentos: parseFloat(nuevoTotalProductos.toFixed(2)),
      };
    });
  
    // Limpiar el formulario de "Mitad y Mitad"
    setSizeSeleccionado("");
    setLeftPizza("");
    setRightPizza("");
  
    alert("Pizza Mitad y Mitad añadida al carrito.");
  };
  const handleRarePizzaNavigation = () => {
    navigate('/rare-pizza'); // Redirigir a la ruta del módulo Make A Rare Pizza
  };
  
  return (
    <div className="make-your-pizza-container">
      {/* Carrito flotante siempre visible */}
      <FloatingCart
        compra={compra}
        setCompra={setCompra}
        handleEditProduct={handleEditProduct}
        handleNextStep={() => setShowDeliveryForm(true)} // Cambiar a DeliveryForm desde el botón "Siguiente" en el FC
      />
  
      {showDeliveryForm ? (
        // Formulario de entrega
        <DeliveryForm compra={compra} setCompra={setCompra} />
      ) : isChoosingType ? (
        // Antesala para elegir el tipo de pizza
        <div className="choose-type-container">
          <h2>Elige el tipo de pizza</h2>
          <div className="options">
            <button
              className="option-button"
              onClick={() => setIsChoosingType(false)} // Accede a crear pizza completa
            >
              Pizza Completa
            </button>
            <button
              className="option-button"
              onClick={() => {
                setIsChoosingType(false);
                setIsHalfAndHalf(true);
              }}
            >
              Pizza Mitad y Mitad
            </button>
            <button
            className="option-button"
            onClick={handleRarePizzaNavigation}
          >
            Pizza Random
          </button>
          </div>
        </div>



      ) : isHalfAndHalf ? (

        <div className="half-and-half-container">
          <h2>Selecciona las dos mitades de tu pizza</h2>
  
          {/* Dropdown para seleccionar el tamaño */}
          <div className="size-selection">
            <select
              value={sizeSeleccionado}
              onChange={(e) => setSizeSeleccionado(e.target.value)}
              className="size-dropdown"
            >
              <option value="" disabled>
                Seleccione el tamaño
              </option>
              {Array.from(
                new Set(
                  activePizzas.flatMap((pizza) =>
                    JSON.parse(pizza.selectSize || "[]")
                  )
                )
              ).map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        <div className="halves-container">
          {/* Lado izquierdo */}
          <div className="half-section">
            <Swiper
              direction="vertical"
              slidesPerView={1}
              navigation
              onSlideChange={(swiper) => {
                const selectedPizza = activePizzas
                  .filter((pizza) =>
                    JSON.parse(pizza.selectSize || "[]").includes(sizeSeleccionado)
                  )[swiper.activeIndex];
                console.log("Pizza seleccionada izquierda:", selectedPizza);
                setLeftPizza(selectedPizza?.id || "");
              }}
              className="swiper-container"
            >
              {activePizzas
                .filter((pizza) =>
                  JSON.parse(pizza.selectSize || "[]").includes(sizeSeleccionado)
                )
                .map((pizza, index) => (
                  <SwiperSlide key={index}>
                    <div className="pizza-slide">
                      <img
                        src={`http://localhost:3001/${pizza.imagen}`}
                        alt={pizza.nombre}
                        className="pizza-image"
                      />
                      <p>{pizza.nombre}</p>
                      <p>
                        ({sizeSeleccionado}) -{" "}
                        {(
                          JSON.parse(pizza.PriceBySize)?.[sizeSeleccionado] / 2
                        ).toFixed(2)}
                        €
                      </p>
                    </div>
                  </SwiperSlide>
                ))}
            </Swiper>
          </div>

          {/* Lado derecho */}
          <div className="half-section">
            <Swiper
              direction="vertical"
              slidesPerView={1}
              navigation
              onSlideChange={(swiper) => {
                const selectedPizza = activePizzas
                  .filter((pizza) =>
                    JSON.parse(pizza.selectSize || "[]").includes(sizeSeleccionado)
                  )[swiper.activeIndex];
                // console.log("Pizza seleccionada derecha:", selectedPizza);
                setRightPizza(selectedPizza?.id || "");
              }}
              className="swiper-container"
            >
              {activePizzas
                .filter((pizza) =>
                  JSON.parse(pizza.selectSize || "[]").includes(sizeSeleccionado)
                )
                .map((pizza, index) => (
                  <SwiperSlide key={index}>
                    <div className="pizza-slide">
                      <img
                        src={`http://localhost:3001/${pizza.imagen}`}
                        alt={pizza.nombre}
                        className="pizza-image"
                      />
                      <p>{pizza.nombre}</p>
                      <p>
                        ({sizeSeleccionado}) -{" "}
                        {(
                          JSON.parse(pizza.PriceBySize)?.[sizeSeleccionado] / 2
                        ).toFixed(2)}
                        €
                      </p>
                    </div>
                  </SwiperSlide>
                ))}
            </Swiper>
          </div>
        </div>
          <button
            className="confirm-button"
            onClick={isEditing ? handleUpdateProduct : handleConfirmHalfAndHalf}
            disabled={!sizeSeleccionado}
          >
            {isEditing ? "Editar Pizza" : "Confirmar y Añadir al Carrito"}
          </button>
        </div>

        
      ) : (

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
          <button
            onClick={isEditing ? handleUpdateProduct : handleConfirmarPizza}
          >
            {isEditing ? "Editar Pizza" : "Añadir al Carrito"}
          </button>
        </>
      )}
    </div>
  );
};

export default MakeYourPizza;
