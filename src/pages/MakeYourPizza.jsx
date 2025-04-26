import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Swiper, SwiperSlide } from "swiper/react";
import DeliveryForm from './DeliveryForm';  
import _PizzaContext from './_PizzaContext';
import { PurchaseContext } from './PurchaseContext'; 
import FloatingCart from './FloatingCart';
import '../styles/MakeYourPizza.css'; 
import moment from 'moment';
import axios from 'axios';

const MakeYourPizza = () => {
  const { activePizzas, sessionData } = useContext(_PizzaContext);
  const { compra, setCompra } = useContext(PurchaseContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sizeSeleccionado, setSizeSeleccionado] = useState('');
  const [ingredientesDisponibles, setIngredientesDisponibles] = useState([]);
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]);
  const [ingredientesExtraPrecios, setIngredientesExtraPrecios] = useState({});
  const [preciosBase, setPreciosBase] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [isChoosingType, setIsChoosingType] = useState(true);
  const [isHalfAndHalf, setIsHalfAndHalf] = useState(false);
  const [leftPizza, setLeftPizza] = useState('');
  const [rightPizza, setRightPizza] = useState('');
  const [ofertas, setOfertas] = useState([]);
  const [menuPizzas, setMenuPizzas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [isRandomPizzaDisabled, setIsRandomPizzaDisabled] = useState(true);
  const [infoEmpresa, setInfoEmpresa] = useState(null);
  
  
  const safeFixed = (val, digits = 2) =>
  Number.isFinite(val) ? Number(val).toFixed(digits) : '0.00';
  
  useEffect(() => {
    if (location.state?.compra) {
      setCompra((prev) => ({
        ...prev,
        ...location.state.compra,
      }));
    }
  }, [location.state?.compra, setCompra]);
  useEffect(() => {
    setCompra((prev) => ({ ...prev, origen: '' })); 
  }, [setCompra]);
  useEffect(() => {
    console.log('Estado de compra (global) en MYPizza:', compra);
  }, [compra]);
  useEffect(() => {
    if (activePizzas && activePizzas.length > 0) {
      const preciosBaseCalculados = {};
      activePizzas
        .filter((pizza) => pizza.categoria === 'Base Pizza')
        .forEach((pizza) => {
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
    console.groupCollapsed("🔍 Recalculando Precio Total");
    console.log("📏 Tamaño seleccionado:", sizeSeleccionado);
    console.log("📦 Precios base:", preciosBase);
    console.log("🧾 Ingredientes seleccionados:", ingredientesSeleccionados);
  
    if (!sizeSeleccionado) {
      console.warn("⚠️ No hay tamaño seleccionado");
      setTotalPrice(0);
      console.groupEnd();
      return;
    }
  
    const precioBase = preciosBase[sizeSeleccionado] || 0;
    console.log("💸 Precio base:", precioBase);
  
    const precioIngredientes = ingredientesSeleccionados.reduce(
      (acc, ing) =>
        acc + (ing.precio ?? calcularPrecioIngrediente(sizeSeleccionado)),
      0
    );
    console.log("💰 Total ingredientes:", precioIngredientes);
  
    const nuevoTotal = Math.round((precioBase + precioIngredientes) * 100) / 100;
    console.log("🧮 Total final:", nuevoTotal);
  
    setTotalPrice(nuevoTotal);
    console.groupEnd();
  }, [sizeSeleccionado, preciosBase, ingredientesSeleccionados, ingredientesExtraPrecios]);  
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
        console.error('Error al obtener los precios de ingredientes extras:', error);
      }
    };
    fetchExtraPrices();
  }, []);
  useEffect(() => {
    const fetchOfertas = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/ofertas`);
        console.log("Ofertas recibidas:", response.data);

        if (Array.isArray(response.data.data)) {
          setOfertas(response.data.data);
        } else {
          console.error("Error: 'ofertas' no es un array:", response.data);
          setOfertas([]);
        }
      } catch (error) {
        console.error("Error al obtener las ofertas:", error);
      }
    };
    fetchOfertas();
  }, []);
  useEffect(() => {
    if (!Array.isArray(ofertas)) return;
    const ofertaRandomPizza = ofertas.find(
      (oferta) => oferta.Tipo_Oferta === 'Random Pizza'
    );
    if (ofertaRandomPizza) {
      const cuponesOk = ofertaRandomPizza.Cupones_Disponibles > 0;
      const estadoOk = ofertaRandomPizza.Estado === "Activa";
      setIsRandomPizzaDisabled(!(cuponesOk && estadoOk));
    } else {
      setIsRandomPizzaDisabled(true);
    }
  }, [ofertas]);
  useEffect(() => {
    const fetchMenuPizzas = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/menu_pizzas`);
        setMenuPizzas(response.data.data);
        console.log("✅ menu_pizzas:", response.data.data);
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
        setInventario(response.data.data);
        console.log("✅ Inventario:", response.data.data);
      } catch (error) {
        console.error("❌ Error al obtener inventario:", error);
      }
    };
    fetchInventario();
  }, []);
  useEffect(() => {
    if (!sizeSeleccionado || menuPizzas.length === 0 || inventario.length === 0) {
      setIngredientesDisponibles([]);
      return;
    }

    let allIngredientes = [];

    menuPizzas
      .filter((pizza) =>
        pizza.categoria !== "Base Pizza" &&
        ![101, 102, 103].includes(pizza.id)
      )
      .forEach((pizza) => {
        const ingredientes = JSON.parse(pizza.ingredientes || "[]");
        ingredientes.forEach((ing) => {
          const stock = ing.cantBySize?.[sizeSeleccionado] || 0;
          const estadoGEN = inventario.find(inv => inv.IDI === ing.IDI)?.estadoGEN || 0;
          if (stock > 0 && estadoGEN === 0) {
            allIngredientes.push({
              nombre: ing.ingrediente,
              IDI: ing.IDI,
              cantidad: stock,
            });
          }
        });
      });

    const uniqueIngredientes = allIngredientes.filter(
      (ing, index, self) =>
        index === self.findIndex((t) => t.IDI === ing.IDI)
    );

    setIngredientesDisponibles(uniqueIngredientes);
  }, [sizeSeleccionado, menuPizzas, inventario]);
  useEffect(() => {
    if (sizeSeleccionado && activePizzas.length > 0) {
      const pizzasValidas = activePizzas.filter(
        (pizza) =>
          pizza.categoria !== "Base Pizza" &&
          JSON.parse(pizza.selectSize || "[]").includes(sizeSeleccionado)
      );
  
      if (pizzasValidas.length > 0) {
        setLeftPizza(pizzasValidas[0].id);
        setRightPizza(pizzasValidas[0].id);
      }
    }
  }, [sizeSeleccionado, activePizzas]);
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/info-empresa`)
      .then((res) => {
        const empresaActiva = res.data.find(e => e.estado === 'activo');
        if (empresaActiva) setInfoEmpresa(empresaActiva);
      })
      .catch((err) => console.error("Error al cargar info de empresa", err));
  }, []);

  const calcularPrecioIngrediente = (size) => {
    return ingredientesExtraPrecios[size] || 0;
  };
  const enrichIngredient = (ing) => ({
      ...ing,
      precio: calcularPrecioIngrediente(sizeSeleccionado),
  });
  const handleAgregarIngrediente = (ingrediente) => {
    if (!sizeSeleccionado) {
      alert('Debes seleccionar un tamaño antes de agregar ingredientes.');
      return;
    }
    if (ingredientesSeleccionados.some((ing) => ing.IDI === ingrediente.IDI)) {
      return; 
    }
        setIngredientesSeleccionados((prev) => [
            ...prev,
            enrichIngredient(ingrediente),
          ]);
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

    // Crear objeto pizza personalizada
    const nuevaPizza = {
      uuid: uuidv4(),
      id: 101,
      nombre: 'PP1',
      size: sizeSeleccionado,
      cantidad: 1,
      total: totalPrice,
      basePrice: preciosBase[sizeSeleccionado],
      extraIngredients: ingredientesSeleccionados.map((ing) => {
        const matchingIngredient = activePizzas
          .flatMap(pizza => JSON.parse(pizza.ingredientes))
          .find(item => item.IDI === ing.IDI);
        return {
          IDI: ing.IDI,
          nombre: ing.nombre,
          cantBySize: matchingIngredient?.cantBySize?.[sizeSeleccionado] || 0,
          precio: ing.precio,
        };
      }),
    };

    // Añadimos la pizza al array `venta` del contexto
    setCompra((prevCompra) => {
      const nuevaVenta = [...prevCompra.venta, nuevaPizza];
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

    // Limpiar estado local
    setSizeSeleccionado('');
    setIngredientesSeleccionados([]);
    setTotalPrice(0);
    setIsEditing(false);
    setEditingProductId(null);
    alert('Pizza añadida al carrito');
    console.log('Pizza añadida al carrito:', nuevaPizza);
  };
  const handleEditProduct = (productoEditado) => {
    console.groupCollapsed("🛠️ handleEditProduct");
    console.log("🍕 Producto Editado:", productoEditado);
    console.log("➡️ Tamaño:", productoEditado.size);
    console.log("➡️ Ingredientes recibidos:", productoEditado.extraIngredients);
  
    // ✅ Establecemos primero el tamaño
    setSizeSeleccionado(productoEditado.size);
  
    // ✅ Enriquecemos con el tamaño explícito
    const enrichWithSize = (ing, size) => ({
      ...ing,
      precio: calcularPrecioIngrediente(size),
    });
  
    const enriquecidos = (productoEditado.extraIngredients || []).map((ing) =>
      enrichWithSize(ing, productoEditado.size)
    );
    console.log("✅ Ingredientes enriquecidos:", enriquecidos);
  
    setIngredientesSeleccionados(enriquecidos);
  
    // 🔁 Podrías omitir setTotalPrice y dejar que el useEffect lo calcule automáticamente
    // setTotalPrice(productoEditado.total);
  
    setIsEditing(true);
    setEditingProductId(productoEditado.uuid || productoEditado.id); // usa uuid si está disponible
  
    if (productoEditado.halfAndHalf) {
      console.log("🌓 Modo Half & Half");
      setLeftPizza(productoEditado.halfAndHalf.izquierda.id || "");
      setRightPizza(productoEditado.halfAndHalf.derecha.id || "");
      setIsHalfAndHalf(true);
    } else {
      console.log("🍕 Modo Pizza Completa");
      setIsHalfAndHalf(false);
    }
  
    console.groupEnd();
  };  
  const handleUpdateProduct = () => {
    setCompra((prevCompra) => {
      const nuevaVenta = prevCompra.venta.map((producto) => {
        const esProductoEditado = (producto.uuid && producto.uuid === editingProductId) || producto.id === editingProductId;
  
        if (!esProductoEditado) return producto;
  
        if (!producto.halfAndHalf) {
          const precioBase = preciosBase[sizeSeleccionado];
          const nuevosIngredientes = ingredientesSeleccionados.map(enrichIngredient);
          const precioExtras = nuevosIngredientes.reduce((acc, ing) => acc + ing.precio, 0);
          const nuevoTotal = Math.round((precioBase + precioExtras) * 100) / 100;
  
          return {
            ...producto,
            size: sizeSeleccionado,
            basePrice: precioBase,
            total: nuevoTotal,
            extraIngredients: nuevosIngredientes,
          };
        }
  
        // Caso Half and Half
        const leftPizzaData = activePizzas.find(
          (pizza) =>
            pizza.id === leftPizza &&
            JSON.parse(pizza.selectSize || '[]').includes(sizeSeleccionado)
        );
  
        const rightPizzaData = activePizzas.find(
          (pizza) =>
            pizza.id === rightPizza &&
            JSON.parse(pizza.selectSize || '[]').includes(sizeSeleccionado)
        );
  
        if (!leftPizzaData || !rightPizzaData) {
          alert("Por favor selecciona ambas mitades antes de confirmar.");
          return producto;
        }
  
        const precioMitadIzquierda = parseFloat(JSON.parse(leftPizzaData.PriceBySize || "{}")[sizeSeleccionado] / 2) || 0;
        const precioMitadDerecha = parseFloat(JSON.parse(rightPizzaData.PriceBySize || "{}")[sizeSeleccionado] / 2) || 0;
        const totalPrecio = parseFloat((precioMitadIzquierda + precioMitadDerecha).toFixed(2));
  
        return {
          ...producto,
          size: sizeSeleccionado,
          total: totalPrecio,
          halfAndHalf: {
            izquierda: {
              id: leftPizzaData?.id || producto.halfAndHalf.izquierda.id,
              nombre: leftPizzaData?.nombre || producto.halfAndHalf.izquierda.nombre,
              precio: precioMitadIzquierda,
            },
            derecha: {
              id: rightPizzaData?.id || producto.halfAndHalf.derecha.id,
              nombre: rightPizzaData?.nombre || producto.halfAndHalf.derecha.nombre,
              precio: precioMitadDerecha,
            },
          },
        };
      });
  
      const nuevoTotalProductos = nuevaVenta.reduce((acc, item) => acc + item.total, 0);
  
      return {
        ...prevCompra,
        venta: nuevaVenta,
        total_productos: parseFloat(nuevoTotalProductos.toFixed(2)),
        total_a_pagar_con_descuentos: parseFloat(nuevoTotalProductos.toFixed(2)),
      };
    });
  
    // Limpieza
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
  };
  const handleNextStep = () => {
    if (compra.venta.length === 0) {
      alert('Debes añadir al menos una pizza al carrito antes de continuar.');
      return;
    }
    setShowDeliveryForm(true);
  };
  const handleConfirmHalfAndHalf = () => {

    if (!sizeSeleccionado) {
      alert("Debes seleccionar el tamaño antes de confirmar.");
      return;
    }
    const leftPizzaData = activePizzas.find((pz) => pz.id === leftPizza);
    const rightPizzaData = activePizzas.find((pz) => pz.id === rightPizza);

    const precioMitadIzquierda = leftPizzaData
      ? parseFloat(
          JSON.parse(leftPizzaData.PriceBySize || '{}')[sizeSeleccionado] / 2
        ) || 0
      : 0;

    const precioMitadDerecha = rightPizzaData
      ? parseFloat(
          JSON.parse(rightPizzaData.PriceBySize || '{}')[sizeSeleccionado] / 2
        ) || 0
      : 0;

    const totalPrecio = parseFloat(
      (precioMitadIzquierda + precioMitadDerecha).toFixed(2)
    );

    const nuevaPizza = {
      uuid: uuidv4(),
      id: 102,
      nombre: "PP2",
      size: sizeSeleccionado,
      cantidad: 1,
      total: totalPrecio,
      halfAndHalf: {
        izquierda: {
          id: leftPizzaData?.id || null,
          nombre: leftPizzaData?.nombre || "Mitad vacía",
          precio: precioMitadIzquierda,
        },
        derecha: {
          id: rightPizzaData?.id || null,
          nombre: rightPizzaData?.nombre || "Mitad vacía",
          precio: precioMitadDerecha,
        },
      },
    };
    console.log('🍕 Pizza mitad y mitad creada:', {
      sizeSeleccionado,
      leftPizzaData,
      rightPizzaData,
      precioMitadIzquierda,
      precioMitadDerecha,
    });
    setCompra((prev) => {
      const nuevaVenta = [...prev.venta, nuevaPizza];
      const nuevoTotalProductos = nuevaVenta.reduce((acc, item) => acc + item.total, 0);
      return {
        ...prev,
        venta: nuevaVenta,
        total_productos: parseFloat(nuevoTotalProductos.toFixed(2)),
        total_a_pagar_con_descuentos: parseFloat(nuevoTotalProductos.toFixed(2)),
      };
    });
    console.log("✅ ConfirmHalfAndHalf ejecutado");
console.log("leftPizza:", leftPizza);
console.log("rightPizza:", rightPizza);

    setSizeSeleccionado("");
    setLeftPizza("");
    setRightPizza("");
    alert("Pizza Mitad y Mitad añadida al carrito.");
  };
  const handleRarePizzaNavigation = () => {
    if (isRandomPizzaDisabled) {
      alert('No hay cupones disponibles para Pizza Random o la oferta está inactiva.');
      return;
    }
    navigate('/rare-pizza');
  };

  // -----------------------------------------------------------------------
  //  Render principal
  // -----------------------------------------------------------------------
  return (
    <div className="make-your-pizza-container">
      <FloatingCart
        compra={compra}     
        setCompra={setCompra}
        handleEditProduct={handleEditProduct}
        handleNextStep={() => setShowDeliveryForm(true)}
      />

      {showDeliveryForm ? (
        <DeliveryForm
          compra={compra}
          setCompra={setCompra}
        />
      ) : isChoosingType ? (
        <div className="choose-type-container">
          <h2>Choose the type</h2>
          <div className="options">
            <button
              className="option-button"
              onClick={() => setIsChoosingType(false)} // Ir a crear pizza completa
            >
              Full Pizza
            </button>
            <button
              className="option-button"
              onClick={() => {
                setIsChoosingType(false);
                setIsHalfAndHalf(true);
              }}
            >
              Half and Half Pizza
            </button>
          </div>
        </div>
      ) : isHalfAndHalf ? (
        <div className="half-and-half-container">
          <h2>Choose your two pizza halves</h2>

          {/* Dropdown para seleccionar el tamaño */}
          <div className="size-selection">
            <select
              value={sizeSeleccionado}
              onChange={(e) => setSizeSeleccionado(e.target.value)}
              className="size-dropdown"
            >
              <option value="" disabled>
                Select the size
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
          <div className="half-section">
            <h4 className="half-label">Half 1</h4>
            {activePizzas.filter(
              (pz) =>
                pz.categoria !== "Base Pizza" &&
                JSON.parse(pz.selectSize || "[]").includes(sizeSeleccionado)
            ).length === 0 ? (
              <div className="empty-pizza-placeholder">
                  <img
                    src={infoEmpresa?.logo_url || "/default-logo.png"}
                    alt="Logo Pizzería"
                    className="pizza-placeholder-logo"
                  />
                </div>
            ) : (
              <Swiper
                direction="vertical"
                slidesPerView={1}
                navigation
                onSlideChange={(swiper) => {
                  const filteredPizzas = activePizzas.filter(
                    (pz) =>
                      pz.categoria !== "Base Pizza" &&
                      JSON.parse(pz.selectSize || "[]").includes(sizeSeleccionado)
                  );
                  if (filteredPizzas.length > 0 && swiper.activeIndex < filteredPizzas.length) {
                    const selectedPizza = filteredPizzas[swiper.activeIndex];
                    setLeftPizza(selectedPizza?.id || "");
                  }
                }}
                className="swiper-container"
              >
                {activePizzas
                  .filter(
                    (pz) =>
                      pz.categoria !== "Base Pizza" &&
                      JSON.parse(pz.selectSize || "[]").includes(sizeSeleccionado)
                  )
                  .map((pizza, index) => (
                    <SwiperSlide key={index}>
                      <div className="pizza-slide">
                        <img
                          src={`${process.env.REACT_APP_API_URL}/${pizza.imagen}`}
                          alt={pizza.nombre}
                          className="pizza-image"
                        />
                        <p>{pizza.nombre}</p>
                        <p>
                          ({sizeSeleccionado}) -{" "}
                          {safeFixed(
                           JSON.parse(pizza.PriceBySize || '{}')[sizeSeleccionado] / 2
                          )}€
                        </p>
                      </div>
                    </SwiperSlide>
                  ))}
              </Swiper>
            )}
          </div>

  <div className="half-section">
    <h4 className="half-label">Half 2</h4>
    {activePizzas.filter(
      (pz) =>
        pz.categoria !== "Base Pizza" &&
        JSON.parse(pz.selectSize || "[]").includes(sizeSeleccionado)
    ).length === 0 ? (
      <div className="empty-pizza-placeholder">
        <img
          src={infoEmpresa?.logo_url}
          alt="Logo Pizzería"
          className="pizza-placeholder-logo"
        />
      </div>
    ) : (
      <Swiper
        direction="vertical"
        slidesPerView={1}
        navigation
        onSlideChange={(swiper) => {
          const filteredPizzas = activePizzas.filter(
            (pz) =>
              pz.categoria !== "Base Pizza" &&
              JSON.parse(pz.selectSize || "[]").includes(sizeSeleccionado)
          );
          if (filteredPizzas.length > 0 && swiper.activeIndex < filteredPizzas.length) {
            const selectedPizza = filteredPizzas[swiper.activeIndex];
            setRightPizza(selectedPizza?.id || "");
          }
        }}
        className="swiper-container"
      >
        {activePizzas
          .filter(
            (pz) =>
              pz.categoria !== "Base Pizza" &&
              JSON.parse(pz.selectSize || "[]").includes(sizeSeleccionado)
          )
          .map((pizza, index) => (
            <SwiperSlide key={index}>
              <div className="pizza-slide">
                <img
                  src={`${process.env.REACT_APP_API_URL}/${pizza.imagen}`}
                  alt={pizza.nombre}
                  className="pizza-image"
                />
                <p>{pizza.nombre}</p>
                <p>
                  ({sizeSeleccionado}) -{" "}
                  {(JSON.parse(pizza.PriceBySize)?.[sizeSeleccionado] / 2).toFixed(2)}€
                </p>
              </div>
            </SwiperSlide>
          ))}
      </Swiper>
    )}
  </div>
</div>


          <button
            className="confirm-button"
            onClick={isEditing ? handleUpdateProduct : handleConfirmHalfAndHalf}
            disabled={!sizeSeleccionado}
          >
            {isEditing ? "Edit Pizza" : "Add to Cart"}
          </button>
        </div>
      ) : (
        <>
          <h2>Create Your Pizza</h2>

          {/* Selección de tamaño */}
          <div className="size-selection">
            <h3>Select the size:</h3>
            <select
              value={sizeSeleccionado}
              onChange={(e) => setSizeSeleccionado(e.target.value)}
            >
              <option value="">size</option>
              {Object.keys(preciosBase).map((size) => (
                <option key={size} value={size}>
                  {size} - {safeFixed(preciosBase[size])}€
                </option>
              ))}
            </select>
          </div>

          {sizeSeleccionado && (
            <>
              <div className="ingredientes-panel">
                <h3>Choose your toppings:</h3>
                <div className="ingredientes-grid">
                  {ingredientesDisponibles.map((ingrediente) => (
                    <button
                      key={ingrediente.IDI}
                      className={`ingrediente-boton ${
                        ingredientesSeleccionados.some((ing) => ing.IDI === ingrediente.IDI)
                          ? "seleccionado"
                          : ""
                      }`}
                      onClick={() => handleAgregarIngrediente(ingrediente)}
                    >
                      <span>{ingrediente.nombre}</span>
                      <span>
                        (
                        {sizeSeleccionado && ingredientesExtraPrecios[sizeSeleccionado]
                          ? `${safeFixed(ingredientesExtraPrecios[sizeSeleccionado])}€`
                          : "0.00€"}
                        )
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="ingredientes-seleccionados-contenedor">
                <h4>Choose your toppings:</h4>
                <div className="ingredientes-horizontales">
                  {/* Base de la pizza */}
                  <div className="ingrediente-cuadro">
                    <span>
                      Base de Pizza <br />
                      ({sizeSeleccionado}) ➡️ {safeFixed(preciosBase[sizeSeleccionado])}€
                    </span>
                  </div>

                  {/* Separador si hay ingredientes */}
                  {ingredientesSeleccionados.length > 0 && (
                    <span className="separador">➕</span>
                  )}

                  {/* Render de ingredientes seleccionados */}
                  {ingredientesSeleccionados.map((ing, index) => (
                    <React.Fragment key={ing.IDI}>
                      <div className="ingrediente-cuadro">
                        <span>{ing.nombre}</span>
                        <span>({safeFixed(ing.precio)}€)</span>
                        <button
                          className="boton-eliminar"
                          onClick={() => handleEliminarIngrediente(ing.IDI)}
                        >
                          Delete
                        </button>
                      </div>
                      {index < ingredientesSeleccionados.length - 1 && (
                        <span className="separador">➕</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <h3>Total: {safeFixed(totalPrice)}€</h3>
              <button className= "myp_fp_button" onClick={isEditing ? handleUpdateProduct : handleConfirmarPizza}>
                {isEditing ? "Edit Pizza" : "Add to Cart"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MakeYourPizza;
