import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';  
import { parseISO, formatDistanceToNow, differenceInDays } from 'date-fns';
import _PizzaContext from './_PizzaContext.jsx';
import _MiniGrafico from '../../src/pages/_MiniGrafico';
import axios from 'axios';

export const determinarZonaRiesgo = (disponible, limite, fechaCaducidad, estadoForzado, TDisponible, TLimite) => {

  const fechaCaducidadParsed = parseISO(fechaCaducidad);
  const fechaActual = new Date();

  let zonaRiesgo;

  // Primero se chequea si el producto está forzado a inactivo
  if (estadoForzado === 1) {
    zonaRiesgo = 6; // Inactivo forzado
  }
  // Luego si el producto ya caducó
  else if (fechaCaducidadParsed < fechaActual) {
    zonaRiesgo = 5; // Caducado
  } else {
    // Calcular la diferencia en días hasta la caducidad
    const diasHastaCaducidad = differenceInDays(fechaCaducidadParsed, fechaActual);
    
    // Aquí se aplican las condiciones de cantidad disponible
    if (disponible <= limite) {
      zonaRiesgo = 4; // Inactivo por escasez
    } else if (disponible <= limite * 1.25) {
      zonaRiesgo = 3; // Riesgo alto
    } else if (disponible <= limite * 2) {
      zonaRiesgo = 2; // Riesgo medio
    } else if (disponible <= limite * 3) {
      zonaRiesgo = 1; // Riesgo bajo
    } else {
      zonaRiesgo = 0; // Seguro
    }

    // Finalmente, se sobreescribe a riesgo 3 si la fecha de caducidad es igual o menor a 7 días
    // y el producto no ha sido marcado previamente como caducado o inactivo forzado
    if (diasHastaCaducidad <= 7) {
      zonaRiesgo = 3; // Riesgo alto por fecha de caducidad cercana
    }
  }

  return zonaRiesgo;
};
export const determinarEstadoDelProducto = (zonaRiesgo) => {
  const esActivo = zonaRiesgo <= 4;
  // console.log(`El producto con zona de riesgo ${zonaRiesgo} es: ${esActivo ? 'Activo' : 'Inactivo'}`);
  return esActivo;
};
export const zonaDeRiesgoToString = (zonaRiesgo) => {
  const mapeo = {
    0: 'sinRiesgo',
    1: 'bajo',
    2: 'medio',
    3: 'alto',
    4: 'inactivo', // Asumiendo que 4 representa inactivo
  };
  return mapeo[zonaRiesgo] || 'desconocido';
}
export const calcularZonaRiesgoIDI = (ingredientesPorIDI, TLimite) => {
  //  console.log('ingredientesPorIDI:', ingredientesPorIDI);
  // console.log('TLimite recibido:', TLimite);

  if (!Array.isArray(ingredientesPorIDI) || ingredientesPorIDI.length === 0) {
    console.error("Error: 'ingredientesPorIDI' debe ser un arreglo no vacío.");
    return 6; // Estado inactivo forzado por falta de datos
  }

  const todosInactivos = ingredientesPorIDI.every(ing => ing.estadoForzado === 1);
  if (todosInactivos) {
    return 6; // Todos los ingredientes están forzados a inactivo
  }

  const IDIactual = ingredientesPorIDI[0].IDI;
  const TLimiteActual = typeof TLimite === 'number' ? TLimite : undefined;

  if (TLimiteActual === undefined) {
    console.error(`Error: No se encontró TLimite para el IDI: ${IDIactual}.`);
    return 6; // Estado inactivo forzado por falta de límite
  }

  const TDisponible = ingredientesPorIDI
    .filter(ing => ing.estadoForzado !== 1)
    .reduce((total, ing) => total + ing.disponible, 0);

  const fechaCaducidad = ingredientesPorIDI.find(ing => ing.estadoForzado !== 1)?.fechaCaducidad;
  if (!fechaCaducidad) {
    console.error(`Error: No se encontró fecha de caducidad para los ingredientes activos del IDI: ${IDIactual}.`);
    return 6; // Estado inactivo forzado por falta de fecha de caducidad
  }

  // Asumiendo que la función determinarZonaRiesgo ya está definida y exportada correctamente
  const zonaRiesgoIDI = determinarZonaRiesgo(TDisponible, TLimiteActual, fechaCaducidad);

  return zonaRiesgoIDI;
};
export const calcularTotalesPorIDI = (ingredientes) => {
  const TDisponible = ingredientes.reduce((total, ing) => {
    const caducado = new Date(ing.fechaCaducidad) < new Date();
    const desactivado = ing.estadoForzado === 1;
    return total + (caducado || desactivado ? 0 : ing.disponible);
  }, 0);

  let diasHastaCaducidad = Infinity;
  let cantidadEnRiesgo = 0;

  ingredientes.forEach(ing => {
    const caducado = new Date(ing.fechaCaducidad) < new Date();
    const dias = differenceInDays(parseISO(ing.fechaCaducidad), new Date());
    if (dias < diasHastaCaducidad) {
      diasHastaCaducidad = dias;
    }
    if (dias <= 7 && !caducado) {
      cantidadEnRiesgo += ing.disponible;
    }
  });

  const porcentajeRiesgoCaducidad = TDisponible > 0 ? (cantidadEnRiesgo / TDisponible) * 100 : 0;
  const porcentajeRiesgoCorrecto = Math.min(porcentajeRiesgoCaducidad, 100); // Nunca más de 100%

  return { TDisponible, porcentajeRiesgoCaducidad: porcentajeRiesgoCorrecto, diasHastaCaducidad };
};

const _ListaIngredientes = () => {
  const [inventario, setInventario] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [isDesenfocado, setIsDesenfocado] = useState(false);
  const [nuevoIngrediente, setNuevoIngrediente] = useState({
     subcategoria: '',
     producto: '',
     disponible: 0,
     limite: 0,
   });
  const subcategoria = ['Lacteos', 'Fiambres y carnes', 'Verduras', 'Especias', 'Salsas', 'Otros'];
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [filtrosubcategoria, setFiltrosubcategoria] = useState('Todos');
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [inventarioFinal, setInventarioFinal] = useState([]);
  const [fechaHoraActual, setFechaHoraActual] = useState('');
  const { setIngredientesInactivos, setZonasDeRiesgoPorIDI} = useContext(_PizzaContext);
  const [limites, setLimites] = useState({});
  const [idiExpandido, setIdiExpandido] = useState(null);
  const [zonaRiesgoPorIDI, setZonaRiesgoPorIDI] = useState({});
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [esOrdenAlfabetico, setEsOrdenAlfabetico] = useState(false);
  const [inventarioAgrupadoPorIDI, setInventarioAgrupadoPorIDI] = useState({});
  const navigate = useNavigate();  

useEffect(() => {
    const actualizarFechaHora = () => {
      const ahora = new Date();
      const fechaFormateada = ahora.toLocaleDateString();
      const horaFormateada = ahora.toLocaleTimeString();
      setFechaHoraActual(`${fechaFormateada} ${horaFormateada}`);
    };
   // Actualizar la fecha y hora inmediatamente y luego cada 60 segundos
   actualizarFechaHora();
   const intervalo = setInterval(actualizarFechaHora, 60000);

   // Limpiar el intervalo cuando el componente se desmonte
   return () => clearInterval(intervalo);
 }, []);

useEffect(() => {
  let resultados = [...inventario];

  // Filtrar por subcategoría
  if (filtrosubcategoria !== 'Todos') {
    resultados = resultados.filter(item => item.subcategoria === filtrosubcategoria);
  }

  // Filtrar por ubicación
  if (ubicacionSeleccionada !== '' && ubicacionSeleccionada !== 'ver todas') {
    resultados = resultados.filter(item => item.ubicacion === ubicacionSeleccionada);
  }

  // Filtrar por estado
  if (filtroEstado !== '') {
    const estadoBooleano = filtroEstado === 'true';
    resultados = resultados.filter(item => item.estado === estadoBooleano);
  }

  // Filtrar por término de búsqueda
  if (terminoBusqueda) {
    resultados = resultados.filter(item =>
      item.producto.toLowerCase().includes(terminoBusqueda.toLowerCase())
    );
  }

  // Ordenar alfabéticamente si está activo
  if (esOrdenAlfabetico) {
    resultados.sort((a, b) => a.producto.localeCompare(b.producto));
  }

  setInventarioFinal(resultados);

  // Agrupar después de aplicar los filtros
  const agrupadoPorIDI = resultados.reduce((acc, ing) => {
    const { IDI } = ing;
    if (!acc[IDI]) {
      acc[IDI] = [];
    }
    acc[IDI].push(ing);
    return acc;
  }, {});

  setInventarioAgrupadoPorIDI(agrupadoPorIDI);

}, [inventario, filtrosubcategoria, ubicacionSeleccionada, filtroEstado, terminoBusqueda, esOrdenAlfabetico]);

useEffect(() => {
  axios.get('http://localhost:3001/inventario')
    .then(response => {
      const ingredientes = response.data.data.filter(item => item.categoria === "Ingredientes");
      const ingredientesConZRyEstado = ingredientes.map(ing => {
        const zonaRiesgo = ing.estadoForzado ? 6 : determinarZonaRiesgo(ing.disponible, ing.limite, ing.fechaCaducidad, ing.estadoForzado);
        const esActivo = determinarEstadoDelProducto(zonaRiesgo); // Usa la función existente para determinar si es activo
        return {
          ...ing,
          zonaRiesgo,
          estado: esActivo, 
        };
      });
      setInventario(ingredientesConZRyEstado);
    })
    .catch(error => {
      console.error('Hubo un error obteniendo los datos:', error);
    });
}, []);

useEffect(() => {
  fetchLimits();
}, []); 

useEffect(() => {
  if (Object.keys(limites).length > 0 && inventario.length > 0) {
    const nuevaZonaRiesgoPorIDI = {};
    Object.entries(inventarioAgrupadoPorIDI).forEach(([IDI, ingredientesPorIDI]) => {
      // console.log(`Calculando ZR para IDI: ${IDI}`);
      const TLimiteActual = limites[IDI];
      if (TLimiteActual === undefined) {
        console.error(`Error: No se encontró TLimite para el IDI: ${IDI}.`);
        nuevaZonaRiesgoPorIDI[IDI] = 'Error'; // O alguna otra señal de que hay un error
      } else {
        const zonaRiesgo = calcularZonaRiesgoIDI(ingredientesPorIDI, TLimiteActual);
        nuevaZonaRiesgoPorIDI[IDI] = zonaRiesgo;
      }
    });
    setZonaRiesgoPorIDI(nuevaZonaRiesgoPorIDI);
  }
}, [limites, inventarioAgrupadoPorIDI]);

const fetchLimits = async () => {
  try {
    const response = await axios.get('http://localhost:3001/limites');
    // console.log("Datos de límites cargados del servidor:", response.data);
    
    // Construir el nuevo objeto de límites
    const newLimits = response.data.reduce((acc, limit) => {
      acc[limit.IDI] = limit.TLimite;
      return acc;
    }, {});

    // Actualizar el estado con los nuevos límites
    setLimites(newLimits);
  } catch (error) {
    console.error('Error al cargar los límites:', error);
  }
}

const handleChange = (e) => {
  const { name, value } = e.target;
  setNuevoIngrediente(prev => ({
      ...prev,
      [name]: name === 'disponible' || name === 'limite' ? Number(value) : value
  }));
}

const handleEstadoIDI = async (IDI, esActivo) => {
  const mensaje = esActivo
    ? "¿Estás seguro de que quieres desactivar todos los lotes de este ingrediente?"
    : "¿Quieres restablecer todos los lotes de este ingrediente a activo?";

  if (!window.confirm(mensaje)) return;

  try {
    const estadoForzadoInt = esActivo ? 1 : 0; // 1 para inactivo, 0 para activo
    const response = await fetch(`http://localhost:3001/inventario/por-idi/${IDI}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        estadoForzado: estadoForzadoInt,
      }),
    });

    if (response.status === 200) {
      alert("El estado de todos los lotes ha sido actualizado correctamente.");
      // Aquí actualizas el estado de tu aplicación para reflejar los cambios
      setInventario(prevInventario =>
        prevInventario.map(item => {
          if (item.IDI === IDI) {
            // Asignar zona de riesgo a 6 si se desactiva, o recalcular si se reactiva
            const nuevaZonaRiesgo = esActivo ? 6 : determinarZonaRiesgo(item.disponible, item.limite, item.fechaCaducidad);
            // El estado es inactivo si zona de riesgo es 6, activo de lo contrario
            const nuevoEstado = nuevaZonaRiesgo === 6 ? false : determinarEstadoDelProducto(nuevaZonaRiesgo);
            return { ...item, estadoForzado: estadoForzadoInt, zonaRiesgo: nuevaZonaRiesgo, estado: nuevoEstado };
          }
          return item;
        })
      );
     } else {
      alert("No se pudo actualizar el estado. Por favor, inténtalo de nuevo.");
    }
  } catch (error) {
    alert(`Error al intentar actualizar el estado: ${error}`);
  }
};

const handleEstadoLoteClick = async (IDR, esActivo) => {
  const ingrediente = inventario.find(ing => ing.IDR === IDR);
  if (!ingrediente) {
    console.error('Ingrediente no encontrado');
    return;
  }
  const mensajeConfirmacion = esActivo 
    ? "¿Estás seguro de que quieres desactivar este lote?" 
    : "¿Quieres restablecer este lote a activo?";
    
  if (!window.confirm(mensajeConfirmacion)) return;

  try {
    const estadoForzadoInt = esActivo ? 1 : 0; // 1 para inactivo, 0 para activo
    const response = await fetch(`http://localhost:3001/inventario/${IDR}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        disponible: ingrediente.disponible,
        limite: ingrediente.limite,
        fechaCaducidad: ingrediente.fechaCaducidad,
        ultimaModificacion: new Date().toISOString(),
        estadoForzado: estadoForzadoInt,
      }),
    });

    if (response.status === 200) {
      alert("El estado del lote ha sido actualizado correctamente.");
      
      // Actualiza el estado de tu inventario aquí
      setInventario(prevInventario =>
        prevInventario.map(item => {
          if (item.IDR === IDR) {
            // Determinar la nueva zona de riesgo y el estado
            const nuevaZonaRiesgo = estadoForzadoInt === 1 ? 6 : determinarZonaRiesgo(item.disponible, item.limite, item.fechaCaducidad);
            const nuevoEstado = determinarEstadoDelProducto(nuevaZonaRiesgo);
            return { ...item, estadoForzado: estadoForzadoInt, zonaRiesgo: nuevaZonaRiesgo, estado: nuevoEstado };
          }
          return item;
        })
      );
    } else {
      console.error("No se pudo actualizar el estado del lote.");
      alert("No se pudo actualizar el estado. Por favor, inténtalo de nuevo.");
    }
  } catch (error) {
    console.error("Error al intentar actualizar el estado del lote:", error);
    alert(`Error al intentar actualizar el estado: ${error}`);
  }
};

const handlesubcategoriaChange = (e) => {
  setFiltrosubcategoria(e.target.value);
};
const handleUbicacionChange = (e) => {
    setUbicacionSeleccionada(e.target.value);
};
const calcularInventarioTotal = () => {
  return inventario.reduce((total, ingrediente) => total + ingrediente.disponible, 0);
};
const handleEstadoChange = (e) => {
  setFiltroEstado(e.target.value);
};
const calcularTiempoUso = (fechaCaducidad) => {
  const fecha = parseISO(fechaCaducidad);
  if (isNaN(fecha)) return 'Fecha no válida';
  if (fecha < new Date()) return 'Caducado';
  return formatDistanceToNow(fecha, { addSuffix: false });
};
const toggleExpandido = (IDI) => {
    setIdiExpandido(IDI === idiExpandido ? null : IDI);
};
const handleLimiteChange = (IDI, value) => {
  const numeroLimite = Number(value);
  if (!isNaN(numeroLimite) && numeroLimite >= 0) {
    // Esto debería actualizar el estado con el nuevo valor del límite para el IDI dado.
    setLimites(prevLimites => ({
      ...prevLimites,
      [IDI]: numeroLimite // asegúrate de que esto sea solo un número, no un objeto
    }));
  } else {
    console.error("El valor ingresado no es un número válido");
  }
};
const handleGuardarClick = (IDI) => {
  const nuevoLimite = limites[IDI] ?? 0;
  // console.log(`En handleGuardarClick, IDI: ${IDI}, nuevoLimite: ${nuevoLimite}`);
  
  if (nuevoLimite >= 0) {
    actualizarTLimite(IDI, nuevoLimite).then(() => {
      // Llamada para cerrar el formulario expandido
      toggleExpandido(null);
    }).catch((error) => {
      console.error("Error al actualizar límite:", error);
    });
  } else {
    alert('Por favor, ingrese un valor de límite válido.');
  }
};
const actualizarTLimite = async (IDI, nuevoLimite) => {
  // console.log(`En actualizarTLimite, IDI: ${IDI}, nuevoLimite: ${nuevoLimite}`);
  if (nuevoLimite >= 0) {
    try {
      const response = await axios.patch(`http://localhost:3001/limites/${IDI}`, { TLimite: nuevoLimite });
      // console.log('Respuesta del servidor:', response.data);
      if (response.status === 200) {
        alert('Límite actualizado con éxito');
        setLimites(prevLimites => ({
          ...prevLimites,
          [IDI]: nuevoLimite
        }));
        return Promise.resolve(); // Se resuelve la promesa después de una actualización exitosa
      } else {
        return Promise.reject(new Error('La actualización del límite no fue exitosa.'));
      }
    } catch (error) {
      console.error("Error al actualizar límite:", error);
      alert(`Error al actualizar límite: ${error}`);
      return Promise.reject(error); // Se rechaza la promesa si hay un error
    }
  } else {
    alert('El límite debe ser un número válido y mayor que cero.');
    return Promise.reject(new Error('Límite inválido'));
  }
};

const handleSearchChange = (event) => {
  setTerminoBusqueda(event.target.value);
};
const toggleOrdenAlfabetico = () => {
  setEsOrdenAlfabetico(!esOrdenAlfabetico);
};

return (
      <div className="contenido-principal">
      <h2 className="PDCRL">Gestiona Lista de Ingredientes</h2>
      <h1>Lista Ingredientes en Seguimiento</h1>
      <div>
      <div className='Filtros'>

      <button 
          className="boton-dashboard"
          onClick={() => navigate(-1)} // Cambiar para regresar al historial anterior
        >
          Devolver
        </button>
        <button 
            className="boton-agregar"  
            onClick={toggleOrdenAlfabetico}>
              {esOrdenAlfabetico ? "Restablecer" : "Ordenar A-Z"}
          </button>
          
          <input
            type="text"
            placeholder="¡Buscador de Productos!"
            className="buscador-productos"
            onChange={handleSearchChange}
            value={terminoBusqueda}
            style={{
              padding: '15px 50px',
            }}
          />
   

          <select  className="boton-agregar" onChange={handlesubcategoriaChange} value={filtrosubcategoria}>
              <option value="Todos">Todas las Subcategorías</option>
              {subcategoria.map(subcategoria => (
                <option key={subcategoria} value={subcategoria}>{subcategoria}</option>
              ))}
          </select>

    
          <select className="boton-agregar" onChange={handleEstadoChange} value={filtroEstado}>
            <option value="">Seleccione Estado</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>

          <div className="fechayhora">
            {fechaHoraActual}
          </div>
    </div>
          <section className={`contenedorTabla ${isDesenfocado ? 'desenfocado' : ''}`}>
              <table key={Date.now()} className='tabla'>
                  <thead>
                      <tr>
                          <th>IDI</th>
                          <th>Producto</th>
                          <th>Subcategoria</th>
                          <th>TDisponible</th>
                          <th>TLimite</th>
                          <th>%Riesgo/cad</th>
                          <th>ZRiesgo</th>
                          <th>Estado</th>
                          <th>Escasez de Uso</th>
                          <th>Acciones</th>
                          <th>DetallesLote</th>
                      </tr>
                  </thead>
                  <tbody>
                  {Object.entries(inventarioAgrupadoPorIDI).map(([IDI, ingredientesPorIDI]) => {
                    const { TDisponible, porcentajeRiesgoCaducidad, diasHastaCaducidad } = calcularTotalesPorIDI(ingredientesPorIDI);
                    const zonaRiesgoIDI = zonaRiesgoPorIDI[IDI] !== undefined ? zonaRiesgoPorIDI[IDI] : "Cargando...";
                    const todosInactivos = ingredientesPorIDI.every(ing => !determinarEstadoDelProducto(ing.zonaRiesgo));
                    const estadoActual = todosInactivos ? "Inactivo" : "Activo";
                    const representanteIngrediente = ingredientesPorIDI[0];
                    const nombreProducto = representanteIngrediente.producto;
                    const subcategoriaProducto = representanteIngrediente.subcategoria;

                      return (
                        <>
                        <tr key={IDI}>
                          <td>{IDI}</td>
                          <td>{nombreProducto}</td>
                          <td>{subcategoriaProducto}</td>
                          <td>{TDisponible}</td>
                          <td>{limites[IDI] ?? 'No definido'}</td>
                          <td>{`${porcentajeRiesgoCaducidad.toFixed(2)}% - ${diasHastaCaducidad} días`}</td>
                          <td>{zonaRiesgoIDI}</td>
                          <td>{estadoActual}</td>
                          <td>{/* Consumo U7D */}</td>
                          <td>
                          <button onClick={() => handleEstadoIDI(IDI, !todosInactivos)}>
                            {todosInactivos ? "Restablecer" : "Desactivar"}
                          </button>
                          </td>
                          <td>
                            <button onClick={() => toggleExpandido(IDI)}>
                              {idiExpandido === IDI ? "Ocultar Detalles" : "Ver Detalles"}
                            </button>
                          </td>
                        </tr>
                        {idiExpandido === IDI && ingredientesPorIDI.map((ing, index) => (
                          <tr key={ing.IDR} style={{ backgroundColor: '#e7f281' }}>
                             <td colSpan="1">{"IDR: " + ing.IDR}</td>
                            <td>{"--"}</td>
                            <td>{"--"}</td>
                            <td>{ing.disponible}</td>
                            <td>
                              <input
                                type="number"
                                value={limites[IDI]?.TLimite ?? 0}
                                onChange={(e) => handleLimiteChange(IDI, e.target.value)}
                              />
                              <button onClick={() => handleGuardarClick(IDI)}>Actualizar Límite</button>
                            </td>
                            <td>{calcularTiempoUso(ing.fechaCaducidad)}</td>
                            <td>{ing.zonaRiesgo}</td>
                            <td>{"--"}</td>
                            <td>{"--"}</td>
                            <td>
                            <button
                              onClick={() => handleEstadoLoteClick(ing.IDR, ing.estadoForzado !== 1)}
                            >
                              {ing.estadoForzado === 1 ? "Restablecer Lote" : "Desactivar Lote"}
                            </button>
                            </td>
                            <td>{"--"}</td>
                          </tr>
                        ))}
                      </>
                      );
                    })}
                  </tbody>
              </table>
          </section>
      </div>
  </div>
);

};


export default _ListaIngredientes;
