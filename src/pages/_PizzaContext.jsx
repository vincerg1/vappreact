import { createContext, useState, useCallback,  useEffect, useContext, useMemo, useRef  } from 'react';
import { determinarZonaRiesgo, determinarEstadoDelProducto, calcularZonaRiesgoIDI, calcularTotalesPorIDI } from './_ListaIngredientes';
import { generarDescripcion} from './_MenuOverview'
import { useRanking  } from './RankING'
import axios from 'axios';
import moment from 'moment';

export const _PizzaContext = createContext({
  currentPizza: null,
  setCurrentPizza: () => {},
  riesgos: { sinRiesgo: 0, bajo: 0, medio: 0, alto: 0, inactivo: 0 },
  setRiesgos: () => {},
  ingredientes: [],
  setIngredientes: () => {},
  inventario: [],
  setInventario: () => {},
  cargarInventario: () => {},
  actualizarEstadoIngredientes: () => {},
  ingredientesInactivos: [],
  setIngredientesInactivos: () => {}, 
  actualizarEstadoPizzas: () => {},
  pizzas: [],
  setPizzas: () => {},
  activePizzas: [],
  setActivePizzas: () => {},
  cart: [],
  addPizzaToOrder: () => {},
  sessionData: {
    nombre: null, 
    segmento: null,
    token: null,
    esCumpleanos: false,
    numeroDeCompras: 0,
    ticketPromedio: 0,
    pizzaMasComprada: null,
    comentariosPositivosRecientes: 0, 
  },
  updateSessionData: () => {},
  ofertasPorSegmento: [],
  setOfertasPorSegmento: () => {},
  pizzasConEstadoActualizado: [],
  ingredientesProximosACaducar: [], 
  setIngredientesProximosACaducar:  () => {},
  ranking: [],
  pizzasSugeridasPara2x1: [],
  setPizzasSugeridasPara2x1: () => {},
  ofertaPizzaMasCompradaDisponible: false,
  setOfertaPizzaMasCompradaDisponible: () => {},
  compra: {
    id_orden: '',
    fecha: '',
    hora: '',
    id_cliente: '',
    DescuentosCupon: 0,
    DescuentosDailyChallenge: 0,
    Max_Amount: 0,
    Oferta_Id: null,
    total_sin_descuento: 0,
    total_a_pagar_con_descuentos: 0,
    venta: [],
    Delivery: { opcion: false, costo: 0 },
  },
  setCompra: () => {}, 
  isServiceSuspended: false, 
  suspensionEndTime: null,   
  setSuspensionState: () => {},  
});

const getSessionData = () => {
  // Lee los datos de la sesión desde sessionStorage
  const sessionDataString = sessionStorage.getItem('sessionUserData');
  if (sessionDataString) {
    return JSON.parse(sessionDataString);
  }
  // Si no hay datos en sessionStorage, devuelve valores por defecto
  return {
    nombre: null,
    segmento: null,
    token: null,
    esCumpleanos: false,
    numeroDeCompras: 0,
    pizzaMasComprada: null,
    ticketPromedio: 0,
    comentariosPositivosRecientes: 0
  };
}

export const PizzaProvider = ({ children }) => {
  
  const [currentPizza, setCurrentPizza] = useState(null);
  const [riesgos, setRiesgos] = useState({ sinRiesgo: 0, bajo: 0, medio: 0, alto: 0, inactivo: 0 });
  const [ingredientesPorZonaRiesgo, setIngredientesPorZonaRiesgo] = useState({
    sinRiesgo: [],
    bajo: [],
    medio: [],
    alto: [],
    inactivo: []
  });
  const [ingredientes, setIngredientes] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [ingredientesInactivos, setIngredientesInactivos] = useState([]); 
  const [nombresDeProductos, setNombresDeProductos] = useState([]);
  const [pizzas, setPizzas] = useState([]);
  const [activePizzas, setActivePizzas] = useState([]);
  const [cart, setCart] = useState([]);
  const [sessionData, setSessionData] = useState(getSessionData());
  const [ofertasPorSegmento, setOfertasPorSegmento] = useState([]);
  const [zonasDeRiesgoPorIDI, setZonasDeRiesgoPorIDI] = useState({});
  const [limites, setLimites] = useState({});
  const [estaCargandoLimites, setEstaCargandoLimites] = useState(false);
  const [errorLimites, setErrorLimites] = useState(null);
  const [pizzasConEstadoActualizado, setPizzasConEstadoActualizado] = useState([]);
  const [ingredientesProximosACaducar, setIngredientesProximosACaducar] = useState([]);
  const cargarOfertasPorSegmento = useCallback(async (segmento) => {
    // console.log(`Cargando ofertas para el segmento: ${segmento}`);
    try {
      const response = await axios.get(`http://localhost:3001/ofertas/${segmento}`);
      if (response.data) {
        // console.log('Ofertas cargadas:', response.data.data);
        setOfertasPorSegmento(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar ofertas por segmento:', error);
    }
  }, []);
  const ranking = useRanking();
  const [pizzasSugeridasPara2x1, setPizzasSugeridasPara2x1] = useState([]);
  const [ofertaPizzaMasCompradaDisponible , setOfertaPizzaMasCompradaDisponible ] = useState(false);
  const [isServiceSuspended, setIsServiceSuspended] = useState(false);
  const [suspensionEndTime, setSuspensionEndTime] = useState(null);
  const [compra, setCompra] = useState({
    id_orden: '',
    fecha: moment().format('YYYY-MM-DD'),
    hora: moment().format('HH:mm:ss'),
    id_cliente: '',
    DescuentosCupon: 0,
    DescuentosDailyChallenge: 0,
    Max_Amount: 0,
    Oferta_Id: null,
    total_sin_descuento: 0,
    total_a_pagar_con_descuentos: 0,
    venta: [],
    Delivery: { opcion: false, costo: 0 },
  });

// console.log('pizzasSugeridasPara2x1 desde el contexto', pizzasSugeridasPara2x1)
// console.log("ofertas por segmento desde el contexto", ofertasPorSegmento)
// console.log("Datos de la sesión:", sessionData);



//sesion Data
useEffect(() => {
  if (sessionData.segmento) {
    cargarOfertasPorSegmento(sessionData.segmento);
  }
}, [sessionData.segmento, cargarOfertasPorSegmento]);
useEffect(() => {
  const cargarInventario = async () => {
    try {
      const response = await axios.get('http://localhost:3001/inventario');
      const inventarioCargado = response.data.data; 
      const ingredientesCargados = inventarioCargado.filter(item => item.categoria === "Ingredientes");
      // console.log('Inventario de ingredientes cargado en el context:', ingredientesCargados);
      setIngredientes(ingredientesCargados); 
      calcularRiesgos(ingredientesCargados);
      const nombres = ingredientesCargados.map(ing => ing.producto);
      setNombresDeProductos(nombres); 
      const ingredientesInactivosCalculados = ingredientesCargados.filter(ing => {
        const zonaRiesgo = determinarZonaRiesgo(ing.disponible, ing.limite, ing.fechaCaducidad);
        const esProductoInactivo = !determinarEstadoDelProducto(zonaRiesgo);
        const estaForzadoInactivo = ing.estadoForzado === 1;
      return esProductoInactivo || estaForzadoInactivo;
      });

      // Finalmente, actualizamos el estado con los ingredientes inactivos
      setIngredientesInactivos(ingredientesInactivosCalculados);

      // console.log("Ingredientes inactivos calculados:", ingredientesInactivosCalculados);  
    } catch (error) {
      console.error('Hubo un error obteniendo los datos del inventario:', error);
    }
  };
cargarInventario();
}, []);
useEffect(() => {
  setSessionData(getSessionData());
}, []);
useEffect(() => {
  const cargarLimites = async () => {
    setEstaCargandoLimites(true);
    try {
      const response = await axios.get('http://localhost:3001/limites');
      if (Array.isArray(response.data)) {
        // console.log(response.data)
        const limitesObj = response.data.reduce((obj, item) => {
          obj[item.IDI] = item.TLimite;
          return obj;
        }, {});
        setLimites(limitesObj);
        // console.log("TLimites en el context",limitesObj)
      } else {
        throw new Error('La respuesta de la API no es un array.');
      }
    } catch (error) {
      setErrorLimites(error.message || 'Error desconocido al cargar límites');
    }
    setEstaCargandoLimites(false);
  };
  cargarLimites();
}, []);
useEffect(() => {
  if (typeof limites === 'object' && !Array.isArray(limites) && Array.isArray(ingredientes)) {
    const zonasDeRiesgoPorIDI = {};

    // Agrupa los ingredientes por IDI
    const ingredientesPorIDI = ingredientes.reduce((acc, ing) => {
      const { IDI } = ing;
      if (!acc[IDI]) acc[IDI] = [];
      acc[IDI].push(ing);
      return acc;
    }, {});

    Object.entries(ingredientesPorIDI).forEach(([IDI, ingredientesDelIDI]) => {
      // Calcula el TDisponible y otros totales usando calcularTotalesPorIDI
      const { TDisponible } = calcularTotalesPorIDI(ingredientesDelIDI);
      const TLimite = limites[IDI];

      if (TLimite !== undefined) {
        // Calcula la zona de riesgo con todos los ingredientes del IDI y el TLimite correspondiente
        zonasDeRiesgoPorIDI[IDI] = calcularZonaRiesgoIDI(ingredientesDelIDI, TLimite);
      } else {
        console.error(`Error: No se encontró límite para el IDI: ${IDI}`);
        zonasDeRiesgoPorIDI[IDI] = 'Error';
      }
    });

    setZonasDeRiesgoPorIDI(zonasDeRiesgoPorIDI);
    // console.log("Zonas de riesgo por IDI calculadas en el contexto:", zonasDeRiesgoPorIDI);
  } else {
    console.error('Error: la estructura de limites o ingredientes no es la esperada.');
  }
}, [ingredientes, limites]);
useEffect(() => {
  const calcularRiesgosPorIDI = () => {
    const estadoRiesgos = {
      contadores: { sinRiesgo: 0, bajo: 0, medio: 0, alto: 0, inactivo: 0 },
      listas: { sinRiesgo: [], bajo: [], medio: [], alto: [], inactivo: [] }
    };

    const ingredientesPorIDI = agruparPorIDI(ingredientes);
    
    Object.entries(ingredientesPorIDI).forEach(([IDI, ingredientesDelIDI]) => {
      const TDisponible = ingredientesDelIDI.reduce((total, ing) => total + ing.disponible, 0);
      const TLimite = limites[IDI] ?? 0; 
      const zonaRiesgo = determinarZonaRiesgo(TDisponible, TLimite, ingredientesDelIDI[0].fechaCaducidad, ingredientesDelIDI[0].estadoForzado);
      const zonaRiesgoKey = zonaRiesgoToString(zonaRiesgo);

      estadoRiesgos.contadores[zonaRiesgoKey] += 1;
      if (!estadoRiesgos.listas[zonaRiesgoKey]) {
        estadoRiesgos.listas[zonaRiesgoKey] = [];
      }
      estadoRiesgos.listas[zonaRiesgoKey].push(...ingredientesDelIDI);
    });

    // Actualizamos el estado con los nuevos valores
    setRiesgos(estadoRiesgos.contadores);
    // console.log("riesgos segun zona",estadoRiesgos.contadores)
    setIngredientesPorZonaRiesgo(estadoRiesgos.listas);
  };

  // Solo ejecutamos calcularRiesgosPorIDI si limites e ingredientes están definidos
  if (Object.keys(limites).length > 0 && ingredientes.length > 0) {
    calcularRiesgosPorIDI();
  }
}, [ingredientes, limites]); 
useEffect(() => {
  if (Object.keys(zonasDeRiesgoPorIDI).length > 0) {
    // Filtrar los IDI que tienen una zona de riesgo mayor a 4 (inactivos)
    const ingredientesInactivosCalculados = Object.entries(zonasDeRiesgoPorIDI)
      .filter(([IDI, zonaRiesgo]) => zonaRiesgo > 4)
      .map(([IDI]) => IDI); // Esto asume que solo necesitas el IDI del ingrediente inactivo

    // Si necesitas más información del ingrediente, puedes buscarla usando los IDI obtenidos:
     const ingredientesInactivosDetallados = ingredientes.filter(ing => ingredientesInactivosCalculados.includes(ing.IDI));

    setIngredientesInactivos(ingredientesInactivosCalculados);
    //  console.log("Ingredientes inactivos calculados:", ingredientesInactivosCalculados);
  }
}, [zonasDeRiesgoPorIDI, setIngredientesInactivos]);
useEffect(() => {
  const cargarPizzas = async () => {
    try {
      const response = await axios.get('http://localhost:3001/menu_pizzas');
      // console.log('Datos de pizzas cargadas:', response.data);
      setPizzas(response.data); 
    } catch (error) {
      console.error('Error al cargar las pizzas:', error);
    }
  };
  if (pizzas.length === 0) {
    cargarPizzas();
  }
}, [pizzas]);
useEffect(() => {
  //  console.log('Ingredientes inactivos:', ingredientesInactivos);
  // console.log('Lista de pizzas antes de actualizar el estado:', pizzas);

  // Cambio importante aquí: no dependes de que haya ingredientes inactivos para actualizar el estado
  if (pizzas.data && pizzas.data.length > 0) {
    const pizzasConEstado = pizzas.data.map(pizza => {
      const ingredientesPizza = JSON.parse(pizza.ingredientes); // Asegúrate de que esto es un array de objetos de ingredientes
      // Si no hay ingredientes inactivos, asumimos que la pizza está activa
      const esPizzaActiva = ingredientesInactivos.length === 0 || ingredientesPizza.every(ingrediente => 
        !ingredientesInactivos.includes(ingrediente.IDI)
      );
      return {
        ...pizza,
        estado: esPizzaActiva ? 'Activa' : 'Inactiva',
        descripcion: generarDescripcion(ingredientesPizza)
      };
    });

    // console.log('Pizzas con estado actualizado:', pizzasConEstado);
    setPizzasConEstadoActualizado(pizzasConEstado);
  }
}, [ingredientesInactivos, pizzas]);
useEffect(() => {
  const activePizzas = pizzasConEstadoActualizado.filter(pizza => pizza.estado === 'Activa');
  // console.log("pizzas activas calculadas en el contexto:", activePizzas);
  setActivePizzas(activePizzas);
}, [pizzasConEstadoActualizado]);
useEffect(() => {
  const cargarProximosACaducar = async () => {
    try {
      const response = await axios.get('http://localhost:3001/inventario');
      if (response.data && Array.isArray(response.data.data)) {
        const inventarioCargado = response.data.data;

        // Filtramos los ingredientes que están próximos a caducar
        const proximosACaducar = inventarioCargado.filter(item => {
          if (item.categoria === "Ingredientes") {
            const fechaCaducidad = new Date(item.fechaCaducidad);
            const diferenciaDias = (fechaCaducidad - new Date()) / (1000 * 3600 * 24);
            return diferenciaDias <= 7; // Ingredientes a 7 días o menos de caducar
          }
          return false;
        });

        // console.log("ingredientes proximos a caducar en el context", proximosACaducar);
        setIngredientesProximosACaducar(proximosACaducar);
      } else {
        throw new Error("La respuesta no contiene un arreglo de inventario.");
      }
    } catch (error) {
      console.error('Error al cargar los ingredientes próximos a caducar:', error);
    }
  };

  cargarProximosACaducar();
// Dependencias del efecto; asegúrate de que 'inventario' sea parte de tu estado o contexto si es necesario
}, []); 
useEffect(() => {
//  console.log('Ranking de ingredientes actualizado EN EL CONTEXT:', ranking);
}, [ranking]);
useEffect(() => {
  const esPizzaMasCompradaActiva = activePizzas.some(pizza => pizza.id === sessionData.pizzaMasComprada?.id);
  const cumpleCondicionesOferta = sessionData.numeroDeCompras > 5 && sessionData.ticketPromedio > 10;
  const ofertaDisponible = esPizzaMasCompradaActiva && cumpleCondicionesOferta;
  setOfertaPizzaMasCompradaDisponible(ofertaDisponible);
}, [activePizzas, sessionData.numeroDeCompras, sessionData.ticketPromedio, sessionData.pizzaMasComprada]);
useEffect(() => {
  // Cargar datos de la sesión al iniciar
  const storedSessionData = getSessionData();
  setSessionData(storedSessionData);
}, []);


const setSuspensionState = (isSuspended, endTime) => {
  // console.log("Estado de suspensión actualizado:", isSuspended, endTime); 
  setIsServiceSuspended(isSuspended);
  setSuspensionEndTime(endTime);
};
const agruparPorIDI = (inventario) => {
  return inventario.reduce((acc, item) => {
    if (!acc[item.IDI]) acc[item.IDI] = [];
    acc[item.IDI].push(item);
    return acc;
  }, {});
};
const calcularRiesgos = (ingredientesCargados) => {
    const estadoRiesgos = {
      contadores: { sinRiesgo: 0, bajo: 0, medio: 0, alto: 0, inactivo: 0 },
      listas: { sinRiesgo: [], bajo: [], medio: [], alto: [], inactivo: [] }
    };
    
    ingredientesCargados.forEach(ing => {
      const zonaRiesgo = determinarZonaRiesgo(ing.disponible, ing.limite, ing.fechaCaducidad, ing.estadoForzado);
      const zonaRiesgoKey = zonaRiesgoToString(zonaRiesgo); // Convertimos el número a string para la clave
      estadoRiesgos.contadores[zonaRiesgoKey] += 1;
      estadoRiesgos.listas[zonaRiesgoKey].push(ing);
    });
    
    setRiesgos(estadoRiesgos.contadores);
    setIngredientesPorZonaRiesgo(estadoRiesgos.listas);
    //  console.log(estadoRiesgos.contadores)
    //  console.log(estadoRiesgos.listas)
};
function zonaRiesgoToString(zonaRiesgo) {
    const mapeo = {
      0: 'sinRiesgo',
      1: 'bajo',
      2: 'medio',
      3: 'alto',
      // Asumimos que cualquier número >= 4 es 'inactivo'
    };
    return mapeo[zonaRiesgo] || 'inactivo';
}
const addPizzaToOrder  = (pizza) => {
    setCart(currentCart => {
      const updatedCart = [...currentCart, pizza];
      // console.log("Carrito en el context después de añadir:", updatedCart);
      return updatedCart;
    });
};
const updateSessionData = useCallback((data) => {
  setSessionData(prevData => {
    const newData = { ...prevData, ...data };
  
    if (newData.ticketPromedio) {
      newData.ticketPromedio = parseFloat(newData.ticketPromedio).toFixed(2);
      newData.ticketObjetivo = Math.round(newData.ticketPromedio * 1.1 * 100) / 100;  // Mantener 2 decimales
    }
    
    // Guardar los datos en sessionStorage
    sessionStorage.setItem('sessionUserData', JSON.stringify(newData));
    // console.log('SessionData actualizada con Ticket Objetivo:', newData);
    return newData;
  });
}, []);
const agruparInventarioPorIDI = (inventario) => {
    const inventarioAgrupado = {};
  
    inventario.forEach(ingrediente => {
      const { IDI } = ingrediente;
      if (!inventarioAgrupado[IDI]) {
        inventarioAgrupado[IDI] = [];
      }
      inventarioAgrupado[IDI].push(ingrediente);
    });
  
    // Agregar console.log para ver la salida de la función
    // console.log('Inventario agrupado por IDI en el context:', inventarioAgrupado);
  
    return inventarioAgrupado;
};
const calcularPromedioReviewsUsuario = useCallback(async (email) => {
  try {
    // console.log(`Calculando promedio de reviews para el usuario con email: ${email}`);
    const response = await axios.get(`http://localhost:3001/api/reviews/${email}`);
    const reviews = response.data;

    // console.log('Reviews obtenidas:', reviews);

    if (reviews.length > 0) {
      // Filtrar solo las reviews que tienen un rating válido
      const validReviews = reviews.filter(review => typeof review.rating === 'number' && !isNaN(review.rating));

      if (validReviews.length > 0) {
        // Calcular el promedio de las calificaciones de las reviews válidas
        const sumRatings = validReviews.reduce((sum, review) => sum + review.rating, 0);
        const promedioRating = (sumRatings / validReviews.length).toFixed(1);

        // Obtener la fecha de la última review y procesar el campo 'created_at'
        const ultimaReviewFecha = new Date(validReviews[validReviews.length - 1].created_at);

        if (isNaN(ultimaReviewFecha.getTime())) {
          console.error('La fecha de la última review no es válida.');
        } else {
          const hoy = new Date();
          const diferenciaDias = Math.floor((hoy - ultimaReviewFecha) / (1000 * 60 * 60 * 24));

          // console.log(`Promedio de reviews: ${promedioRating}`);
          // console.log(`Días desde la última review: ${diferenciaDias}`);

          // Si han pasado más de 5 días, motivar a dejar una nueva review
          const necesitaNuevaReview = diferenciaDias > 5;

          // Actualizar sessionData con el promedio y la fecha de la última review
          updateSessionData({
            nivelSatisfaccion: promedioRating,
            ultimaReview: ultimaReviewFecha.toISOString().split('T')[0], // Guardar la fecha como cadena
            necesitaNuevaReview: necesitaNuevaReview,
          });

          // console.log('Datos de sesión actualizados con el promedio de reviews y la última fecha');
        }
      } else {
        console.log('No hay reviews válidas para calcular el promedio.');
        updateSessionData({
          nivelSatisfaccion: 0,
          ultimaReview: null,
          necesitaNuevaReview: true,
        });
      }
    } else {
      // Si no tiene reviews, reiniciar valores en sessionData
      updateSessionData({
        nivelSatisfaccion: 0,
        ultimaReview: null,
        necesitaNuevaReview: true,
      });
      // console.log('No hay reviews disponibles. Se reinician los valores en sessionData.');
    }
  } catch (error) {
    console.error('Error al calcular el promedio de reviews del usuario:', error);
  }
}, [updateSessionData]);

 
useEffect(() => {
  if (sessionData.email) {
    // console.log('ID del cliente disponible. Ejecutando cálculo de reviews...');
    calcularPromedioReviewsUsuario(sessionData.email);
  } else {
    // console.log('ID del cliente no disponible.');
  }
}, [sessionData.email, calcularPromedioReviewsUsuario]);
 
  return (
    <_PizzaContext.Provider value={{
      currentPizza,
      setCurrentPizza,
      riesgos,
      setRiesgos,
      ingredientes,
      setIngredientes,
      ingredientesPorZonaRiesgo,
      inventario,
      setInventario,
      ingredientesInactivos, 
      nombresDeProductos,
      pizzas,
      setPizzas,
      activePizzas,
      setActivePizzas,
      cart, 
      addPizzaToOrder,
      sessionData,
      updateSessionData,
      ofertasPorSegmento,
      setOfertasPorSegmento,
      cargarOfertasPorSegmento,
      zonasDeRiesgoPorIDI,
      setZonasDeRiesgoPorIDI,
      limites, 
      setLimites,
      pizzasConEstadoActualizado,
      setPizzasConEstadoActualizado,
      ingredientesProximosACaducar, 
      setIngredientesProximosACaducar,
      ranking,
      pizzasSugeridasPara2x1,
      setPizzasSugeridasPara2x1,
      ofertaPizzaMasCompradaDisponible,
      setOfertaPizzaMasCompradaDisponible,
      compra, 
      setCompra,
      isServiceSuspended,
      suspensionEndTime,
      setSuspensionState, 
    }}>
      {children}
    </_PizzaContext.Provider>
  );
};


export default _PizzaContext;

