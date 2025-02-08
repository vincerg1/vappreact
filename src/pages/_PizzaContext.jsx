import { createContext, useState, useCallback,  useEffect, } from 'react';
import { determinarZonaRiesgo, determinarEstadoDelProducto, calcularZonaRiesgoIDI, calcularTotalesPorIDI } from './_ListaIngredientes';
import { generarDescripcion} from './_MenuOverview'
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
    email: null,
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
  compra: {
    id_order: '',
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
export const PizzaProvider = ({ children }) => {
  
  const [currentPizza, setCurrentPizza] = useState(null);
  const [riesgos, setRiesgos] = useState({ sinRiesgo: 0, bajo: 0, medio: 0, alto: 0, inactivo: 0 });
  const [ingredientes, setIngredientes] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [ingredientesInactivos, setIngredientesInactivos] = useState([]); 
  const [nombresDeProductos, setNombresDeProductos] = useState([]);
  const [pizzas, setPizzas] = useState([]);
  const [activePizzas, setActivePizzas] = useState([]);
  const [cart, setCart] = useState([]);
  const [ofertasPorSegmento, setOfertasPorSegmento] = useState([]);
  const [zonasDeRiesgoPorIDI, setZonasDeRiesgoPorIDI] = useState({});
  const [limites, setLimites] = useState({});
  const [estaCargandoLimites, setEstaCargandoLimites] = useState(false);
  const [errorLimites, setErrorLimites] = useState(null);
  const [pizzasConEstadoActualizado, setPizzasConEstadoActualizado] = useState([]);
  const [ingredientesProximosACaducar, setIngredientesProximosACaducar] = useState([]);
  const [isServiceSuspended, setIsServiceSuspended] = useState(false);
  const [suspensionEndTime, setSuspensionEndTime] = useState(null);
  const [compra, setCompra] = useState({
    id_order: '',
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
  const [sessionData, setSessionData] = useState(() => {
    const storedData = localStorage.getItem('sessionData');
    return storedData
      ? JSON.parse(storedData)
      : {
          nombre: null,
          segmento: null,
          email: null,
          token: null,
          esCumpleanos: false,
          numeroDeCompras: 0,
          ticketPromedio: 0,
          pizzaMasComprada: null,
          comentariosPositivosRecientes: 0,
        };
  });
  const [ingredientesPorZonaRiesgo, setIngredientesPorZonaRiesgo] = useState({
    sinRiesgo: [],
    bajo: [],
    medio: [],
    alto: [],
    inactivo: []
  });

  const updateSessionData = useCallback((data) => {
    setSessionData((prevData) => {
      const newData = { ...prevData, ...data };
      localStorage.setItem('sessionData', JSON.stringify(newData)); // Guardamos en localStorage
      return newData;
    });
  }, []);
  const fetchClientData = useCallback(async (id) => {
    try {
      // console.log(`Fetching client data for id_cliente: ${id}`);
      const { data } = await axios.get(`http://localhost:3001/clientes/${id}`);
      // console.log('Data fetched from backend:', data);

      // Convertir `ofertaMasUsada` a número si es necesario
      if (data.ofertaMasUsada) {
        data.ofertaMasUsada = parseInt(data.ofertaMasUsada, 10);
      }

      updateSessionData(data); // Actualizamos sessionData y localStorage
    } catch (err) {
      console.error('Error fetching client data:', err);
    }
  }, [updateSessionData]);
  const clearSessionData = useCallback(() => {
    localStorage.removeItem('sessionData');
    setSessionData({
      nombre: null,
      segmento: null,
      email: null,
      token: null,
      esCumpleanos: false,
      numeroDeCompras: 0,
      ticketPromedio: 0,
      pizzaMasComprada: null,
      comentariosPositivosRecientes: 0,
    });
  }, []);
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

useEffect(() => {
    if (sessionData.id_cliente) {
      fetchClientData(sessionData.id_cliente);
    }
}, [sessionData.id_cliente, fetchClientData]);
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
          setInventario(inventarioCargado);
      } catch (error) {
          console.error('❌ Error obteniendo los datos del inventario:', error);
      }
  };
  cargarInventario();
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
  // console.log("📌 [LOG] Iniciando actualización de pizzas...");
  // console.log("🛠️ [LOG] Lista de pizzas cargadas:", pizzas);
  // console.log("🛠️ [LOG] Inventario actual:", inventario);

  if (!pizzas || !pizzas.data || !Array.isArray(pizzas.data) || pizzas.data.length === 0) {
    console.warn("⚠️ No hay pizzas en el array o la estructura es incorrecta.");
    return;
  }

  const pizzasConEstado = pizzas.data.map(pizza => {
    try {
      // console.log(`🔎 Analizando pizza: ${pizza.nombre} (ID: ${pizza.id})`);
      // console.log("🔹 Ingredientes en JSON (sin parsear):", pizza.ingredientes);

      // 🔥 Verificar si `pizza.ingredientes` es un JSON válido antes de parsear
      let ingredientesPizza;
      try {
        ingredientesPizza = JSON.parse(pizza.ingredientes);
        if (!Array.isArray(ingredientesPizza)) {
          throw new Error("No es un array de ingredientes");
        }
      } catch (error) {
        console.error(`❌ Error parseando ingredientes de ${pizza.nombre}:`, error);
        return { ...pizza, estado: 'Inactiva' };  // Si hay error, la marcamos como inactiva
      }

      // console.log("🧑‍🍳 Ingredientes de la pizza después de parsear:", ingredientesPizza);

      // ✅ Verificamos qué ingredientes están inactivos según estadoGEN en inventario
      const ingredientesInactivos = ingredientesPizza.filter(ingrediente =>
        inventario.some(inv => inv.IDI === ingrediente.IDI && inv.estadoGEN === 1)
      );

      // console.log("⚠️ Ingredientes inactivos en esta pizza:", ingredientesInactivos);

      // ✅ Si algún ingrediente base está inactivo, la pizza se considera inactiva
      const esActiva = ingredientesInactivos.length === 0;
      console.log(`✅ Estado de la pizza ${pizza.nombre}: ${esActiva ? 'Activa' : 'Inactiva'}`);

      // 🔥 Nueva lógica para ingredientes extra
      const ingredientesExtrasDisponibles = ingredientesPizza.filter(ingrediente =>
        inventario.some(inv => inv.IDI === ingrediente.IDI && inv.estadoGEN === 0)
      );

      console.log("✅ Ingredientes extras disponibles:", ingredientesExtrasDisponibles);

      return {
        ...pizza,
        estado: esActiva ? 'Activa' : 'Inactiva',
        ingredientesExtras: ingredientesExtrasDisponibles, // Ahora filtramos solo los activos
        descripcion: generarDescripcion(ingredientesPizza)
      };
    } catch (error) {
      console.error("❌ Error procesando ingredientes de la pizza:", error);
      return { ...pizza, estado: 'Inactiva' };  // Fallback a inactiva si hay error
    }
  });

  // console.log("📊 [LOG] Resultado final de pizzasConEstadoActualizado:", pizzasConEstado);
  setPizzasConEstadoActualizado(pizzasConEstado);
}, [pizzas, inventario]);
useEffect(() => {
  const activePizzas = pizzasConEstadoActualizado.filter(pizza => pizza.estado === 'Activa');
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

}, []); 
useEffect(() => {
  // console.log('sessionData.id_cliente:', sessionData.id_cliente); 
  if (sessionData.id_cliente) {
    fetchClientData(sessionData.id_cliente);
  }
}, [sessionData.id_cliente, fetchClientData]);
useEffect(() => {
  if (inventario.length > 0) {
    const ingredientesExtraidos = inventario.filter(ing => ing.categoria === 'Ingredientes');
    setIngredientes(ingredientesExtraidos);
    console.log("✅ Ingredientes extraídos desde el inventario:", ingredientesExtraidos);
  }
}, [inventario]);



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
      clearSessionData,
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
