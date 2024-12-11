import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { format, formatDistanceToNow,  parseISO } from 'date-fns';
import _PizzaContext from './_PizzaContext.jsx';
import _MiniGrafico from '../../src/pages/_MiniGrafico';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/invDB.css'

const ActualizaStock = () => {
  const [inventario, setInventario] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [isDesenfocado, setIsDesenfocado] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [currentDisponible, setCurrentDisponible] = useState(0);
  const [currentLimite, setCurrentLimite] = useState(0);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [lastId, setLastId] = useState(100);
  const [categorias, setCategorias] = useState({
    Ingredientes: {
      Lacteos: ['Queso Mozz Fresca', 'Queso Burrata', 'Queso Fior Di Late', 'Mozzarella'],
      'Fiambres y carnes': ['Peperonni', 'Chorizo', 'Bacon','Ternera','Jamon cocido'],
      Verduras: ['Albahaca', 'Rucula','Aceitunas Verdes', 'Aceitunas Negras', 'Champiñones', 'Cebolla'],
      Especias: ['Sal', 'Azucar', 'Pimineta', 'Oregano'],
      Salsas: ['Salsa Tomate Pizza', 'Salsa Barbacoa'],
      Frutas: ['Piña', 'Coco'],
      Pescado: ['Atun', 'Anchoas'],
    },
    Partner: { // Nueva categoría general para Partners
      Complementos: {
        Complementos: ['Pan de Ajo', 'Lasaña', 'Calzone Dulce', 'Ensalada'],
      },
      Bebidas: {
        Vinos: ['Lambrusco'],
        Refrescos: ['Coca Cola Original'],
      },
      Postres: {
        Helados: ['Chocolate', 'Coco'],
        Tarta: ['Tarta'],
      },
    },
    Publicidad: {
      Branding: ['Bolsas de Papel', 'Carton Porciones'],
    },
    Papeleria: {
      MaterialOficina: ['Boligrafos'],
    },
    'Seguridad y Emergencia': {
      'Equipo de seguridad': ['Kits de primeros auxilios'],
    },
    Limpieza: {
      Detergentes: ['FriegaSuelos'],
      'Herramientas de Limpieza': ['Esponjas'],
    },
    'Ropa de Trabajo y Protección': {
      Uniformes: ['Mandilones', 'Camiseta'],
    },
    Herramientas: {
      'Herramientas Menores': ['Palas de Pizza', 'Cortadores de Pizza'],
    },
    Otro: {
      'Cajas de Pizza': [
        'Cajas de Pizza S',
        'Cajas de Pizza M',
        'Cajas de Pizza L',
        'Cajas de Pizza XL',
        'Cajas de Pizza XXL',
      ],
    },

  });
  const [nuevoIngrediente, setNuevoIngrediente] = useState({
    categoria: '',
    subcategoria: '',
    producto: '',
    disponible: 0,
    // limite: 0,
    unidadMedida: '',
    referencia: '',
  });
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [filtrosubcategoria, setFiltrosubcategoria] = useState('Todos');
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [inventarioFinal, setInventarioFinal] = useState([]);
  const [inventarioFiltrado, setInventarioFiltrado] = useState([]);
  const [fechaCaducidad, setFechaCaducidad] = useState(new Date());
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [currentFechaCaducidad, setCurrentFechaCaducidad] = useState(new Date());
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [inventarioOriginal, setInventarioOriginal] = useState([]);
  const [esOrdenAlfabetico, setEsOrdenAlfabetico] = useState(false);


useEffect(() => {
    axios.get('http://localhost:3001/inventario')
         .then(response => {
             setInventario(response.data.data); 
             setInventarioOriginal(response.data.data)
            //  console.log(response.data.data)
         })
         .catch(error => {
             console.error('Hubo un error obteniendo los datos:', error);
         });
}, []);
useEffect(() => {
  // Comienza con el inventario completo
  let resultados = [...inventario];

  // Aplicar filtros de subcategoría
  if (filtrosubcategoria !== 'Todos') {
    resultados = resultados.filter(item => item.subcategoria === filtrosubcategoria);
  }

  // Aplicar filtros de ubicación
  if (ubicacionSeleccionada && ubicacionSeleccionada !== 'ver todas') {
    resultados = resultados.filter(item => item.ubicacion === ubicacionSeleccionada);
  }

  // Aplicar filtros de estado
  if (filtroEstado) {
    resultados = resultados.filter(item => item.estado.toString() === filtroEstado);
  }

  // Aplicar filtros de categoría
  if (categoriaSeleccionada) {
    resultados = resultados.filter(item => item.categoria === categoriaSeleccionada);
  }

  // Aplicar búsqueda por término
  if (terminoBusqueda) {
    resultados = resultados.filter(item =>
      item.producto.toLowerCase().includes(terminoBusqueda.toLowerCase())
    );
  }

  // Ordenar alfabéticamente si está activo
  if (esOrdenAlfabetico) {
    resultados.sort((a, b) => a.producto.localeCompare(b.producto));
  }

  // Actualizar el estado final con los resultados filtrados y ordenados
  setInventarioFinal(resultados);

}, [
  inventario, 
  filtrosubcategoria, 
  ubicacionSeleccionada, 
  filtroEstado, 
  categoriaSeleccionada, 
  esOrdenAlfabetico, 
  terminoBusqueda
]);

const handleChange = (e) => {
  const { name, value } = e.target;
  setNuevoIngrediente(prev => ({
      ...prev,
      [name]: name === 'disponible'  ? Number(value) : value
  }));
}
const agregarIngrediente = async (e) => {
  e.preventDefault();
  const { categoria, subcategoria, producto, disponible, unidadMedida, referencia } = nuevoIngrediente;
  const nuevoDisponible = Number(disponible);
  const ultimaModificacion = new Date().toISOString();

  const ingredienteParaEnviar = {
    categoria,
    subcategoria,
    producto,
    disponible: nuevoDisponible,
    unidadMedida,
    estadoForzado: false,
    fechaCaducidad: currentFechaCaducidad.toISOString(),
    referencia,
    ultimaModificacion
  };

  try {
    // Intentamos agregar el ingrediente al inventario
    const responseInventario = await fetch("http://localhost:3001/inventario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ingredienteParaEnviar)
    });

    const dataInventario = await responseInventario.json();
    if (!responseInventario.ok) throw new Error(dataInventario.error);

    const IDI = dataInventario.data.IDI;

    // Verificamos si ya existe un límite para este IDI
    const responseLimite = await fetch(`http://localhost:3001/limites/${IDI}`);
    if (!responseLimite.ok && responseLimite.status === 404) {  // Aquí se debe usar responseLimite en lugar de response
      console.log(`No se encontró el límite para el IDI: ${IDI}, se creará uno nuevo.`);
      const responseCrearLimite = await fetch("http://localhost:3001/limites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ IDI, TLimite: 0 })
      });
      if (!responseCrearLimite.ok) {
        const dataCrearLimite = await responseCrearLimite.json();
        throw new Error(dataCrearLimite.error);
      }
    }

    // Actualizamos el estado con el nuevo ingrediente
    setInventario(prevInventario => [
      ...prevInventario,
      { ...ingredienteParaEnviar, IDR: dataInventario.data.IDR, IDI }
    ]);

    // Reiniciamos el formulario y cerramos el modal o form
    setNuevoIngrediente({
      categoria: '',
      subcategoria: '',
      producto: '',
      disponible: 0,
      unidadMedida: '',
      referencia: '',
    });
    setMostrarFormulario(false);
    setIsDesenfocado(false);  
  } catch (error) {
    console.error("Error al añadir ingrediente al servidor:", error);
    alert(`Error al añadir ingrediente al servidor: ${error.message}`);
  }
};

const showForm = (IDR, disponible, fechaCaducidadStr) => {
  setCurrentId(IDR);
  setCurrentDisponible(disponible);
 

  if (fechaCaducidadStr) {
    const fecha = new Date(fechaCaducidadStr);
    if (!isNaN(fecha.getTime())) {
      setCurrentFechaCaducidad(fecha);
    } else {
      console.error('La fecha de caducidad proporcionada no es válida:', fechaCaducidadStr);
      setCurrentFechaCaducidad(new Date(fechaCaducidadStr)); 
    }
  } else {
    console.error('No se proporcionó fecha de caducidad.');
    setCurrentFechaCaducidad(new Date(fechaCaducidadStr)); 
  }

  setIsFormVisible(true);
}
const modificarIngrediente = async (IDR, currentDisponible, currentLimite, currentFechaCaducidad) => {
  const nuevoDisponible = Number(currentDisponible);
  const nuevoLimite = Number(currentLimite);

  if (isNaN(nuevoDisponible) || isNaN(nuevoLimite)) {
    alert("Uno de los valores introducidos no es un número válido.");
    return;
  }
  if (!(currentFechaCaducidad instanceof Date && !isNaN(currentFechaCaducidad.getTime()))) {
    alert("La fecha de caducidad no es válida.");
    return;
  }

  
  const nuevaFechaCaducidad = currentFechaCaducidad.toISOString();
  const ultimaModificacion = new Date().toISOString(); 

  const objetoParaEnviar = {
    disponible: nuevoDisponible,
    fechaCaducidad: nuevaFechaCaducidad,
    ultimaModificacion: ultimaModificacion,
  };

  console.log("Enviando al servidor:", objetoParaEnviar);
  // console.log(IDR)

  try {
    const response = await fetch(`http://localhost:3001/inventario/${IDR}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(objetoParaEnviar),
    });

    if (response.ok) {
      const updatedData = await response.json(); // Asumiendo que el servidor envía de vuelta los datos actualizados
      console.log('Respuesta del servidor:', updatedData);

      // Actualiza el estado aquí si es necesario
      setInventario((prevInventario) => {
        return prevInventario.map((ingrediente) => {
          if (ingrediente.IDR === IDR) {
            return { ...ingrediente, ...objetoParaEnviar };
          }
          return ingrediente;
        });
      });

      alert('Ingrediente modificado con éxito');
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el ingrediente');
    }
  } catch (error) {
    console.error('Error al modificar el ingrediente:', error);
    alert('Error al modificar el ingrediente: ' + error.message);
  }
};
const abrirFormulario = () => {
  setMostrarFormulario(true);
  setIsDesenfocado(true);
};
const cerrarFormulario = () => {
  setMostrarFormulario(false);
  setIsDesenfocado(false);
};
const eliminarIngrediente = (IDR) => {
  const esConfirmado = window.confirm("¿Estás seguro de que quieres eliminar este ingrediente?");
  if (esConfirmado) {
    axios.delete(`http://localhost:3001/inventario/${IDR}`)
      .then(response => {
        // Si el servidor responde con éxito, actualizamos el estado para eliminar el ingrediente de la interfaz de usuario
        setInventario(inventarioActual => {
          return inventarioActual.filter(ingrediente => ingrediente.IDR !== IDR);
        });
        console.log("Ingrediente eliminado correctamente:", response.data);
      })
      .catch(error => {
        console.error("Error al eliminar el ingrediente:", error);
      });
  }
};
const calcularConsumoU7D = () => {
  // Genera un valor aleatorio entre 1 y 1000 como consumo
  return Math.floor(Math.random() * 1000) + 1;
};
const handleUbicacionChange = (e) => {
    setUbicacionSeleccionada(e.target.value);
};
const calcularInventarioTotal = () => {
  return inventario.reduce((total, ingrediente) => total + ingrediente.disponible, 0);
};
const handleCategoriaChange = (e) => {
  const nuevaCategoriaSeleccionada = e.target.value;
  setCategoriaSeleccionada(nuevaCategoriaSeleccionada);
  setNuevoIngrediente(prev => ({
    ...prev,
    categoria: nuevaCategoriaSeleccionada // Asegúrate de actualizar la categoría aquí
  }));
};
const handleSubcategoriaChange = (e) => {
  const nuevaSubcategoriaSeleccionada = e.target.value;
  setSubcategoriaSeleccionada(nuevaSubcategoriaSeleccionada);
  setNuevoIngrediente(prev => ({
    ...prev,
    subcategoria: nuevaSubcategoriaSeleccionada
  }));
};
const handleProductoChange = (e) => {
  const nuevoProductoSeleccionado = e.target.value;
  setProductoSeleccionado(nuevoProductoSeleccionado);
  setNuevoIngrediente(prev => ({
    ...prev,
    producto: nuevoProductoSeleccionado
  }));
};
const handleUnidadMedidaChange = (e) => {
  const nuevaUnidadMedida = e.target.value;
  setNuevoIngrediente((prevIngrediente) => ({
    ...prevIngrediente,
    unidadMedida: nuevaUnidadMedida,
  }));
};
const handleEstadoChange = (e) => {
setFiltroEstado(e.target.value);
};
const formatearFecha = (fecha) => {
  if (!fecha) {
    return 'No aplica';
  }
  const fechaObj = new Date(fecha);
  if (isNaN(fechaObj.getTime())) {
    return 'Fecha inválida';
  }
  return format(fechaObj, 'dd/MM/yyyy');
};
const formatearUltimaModificacion = (timestampISO) => {
 
  if (!timestampISO) {
    return 'No aplica';
  }
  
  if (timestampISO === 'Fecha no válida') {
    return timestampISO;
  }

  try {
    const fecha = parseISO(timestampISO);
    if (isNaN(fecha)) {
      return 'Fecha no válida';
    }
    return formatDistanceToNow(fecha, { addSuffix: true });
  } catch (error) {
    console.error('Error al formatear la fecha:', error);
    return 'Error de formato';
  }
};
const toggleOrdenAlfabetico = () => {
  if (!esOrdenAlfabetico) {
    const inventarioOrdenado = [...inventario].sort((a, b) => a.producto.localeCompare(b.producto));
    setInventarioFinal(inventarioOrdenado);
  } else {
    setInventarioFinal(inventario);
  }
  setEsOrdenAlfabetico(!esOrdenAlfabetico); // Cambia el estado de orden alfabético
};
const handleSearchChange = (event) => {
  setTerminoBusqueda(event.target.value);
};

const inventarioFiltrados = useMemo(() => {
  // Asegúrate de que 'inventario' esté definido y no sea nulo o indefinido.
  if (!inventario) {
    return [];
  }

  // Realiza el filtrado y retorna el nuevo array filtrado
  return inventario.filter(item => {
    return filtrosubcategoria === 'Todos' || item.subcategoria === filtrosubcategoria;
  });
}, [inventario, filtrosubcategoria]); // Dependencias de useMemo
const inventarioFiltradoPorProducto = inventarioFiltrados.filter(inventario => {
  if (productoSeleccionado === 'ver todos') {
    return true; // No aplica ningún filtro, muestra todos los productos
  }
  return inventario.nombreProducto === productoSeleccionado; // Filtra basado en el producto seleccionado
});
const inventarioFiltradosPorEstado = inventarioFiltrados.filter(inventario => {
  // Si 'filtroEstado' es una cadena vacía, no se aplica ningún filtro y todos los ítems pasan.
  if (filtroEstado === "") {
    return true;
  }
  const estadoBooleano = filtroEstado === "true";
  return inventario.estado === estadoBooleano;
});
// const productosPorSubcategoria = {
//   Lacteos: ["Queso Mozz Fresca", "Queso Burrata"],
//   "Fiambres y carnes": ["Jamón", "Pepperoni" ],
//   Verduras: ["Albahaca", "Rucula"],
//   Especias: ["Sal", "Azucar"],
//   Salsas: ["Salsa Tomate Pizza", "Salsa Barbacoa"],
// };

return (
      <div className="contenido-principal">
      <h2 className="PDCRL">Gestion del Inventario</h2>
      <div>
      <div className='Filtros'>
          <button 
              className="boton-dashboard"
              onClick={() => window.location.href='http://localhost:3000/_Inicio/_InvIngDB'}>
              Ir al Dashboard
          </button>
          <button 
            className="boton-agregar"
            onClick={abrirFormulario}>
            Agregar Producto!
          </button>
          <button 
          className="boton-agregar"  
          onClick={toggleOrdenAlfabetico}>
            {esOrdenAlfabetico ? "Restablecer" : "Ordenar A-Z"}
          </button>
          <select  
          className="Filtro1" 
          onChange={handleUbicacionChange} 
          value={ubicacionSeleccionada}>
            <option value="">Seleccione Ubicación</option>
            <option value="mi ubicacion actual">Mi ubicación actual</option>
            <option value="ubicacion 1">Ubicación 1</option>
            <option value="ubicacion 2">Ubicación 2</option>
            <option value="ver todas">Ver todas</option>
          </select>
          <select 
          className="Filtro1"  
          onChange={handleCategoriaChange} 
          value={categoriaSeleccionada}>
            <option value="">Seleccione Categorias</option>
            {Object.keys(categorias).map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>
          <div >
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
          </div>
          

      </div>
          {mostrarFormulario && (
              <div className={`overlay ${mostrarFormulario ? 'visible' : ''}`}>
                  <form 
                    className='formulario-agregar'
                    onSubmit={agregarIngrediente}
                    onClick={(e) => e.stopPropagation()}
                    >
                       <label>
                    Categoria:
                    <select name="categoria" value={categoriaSeleccionada} onChange={handleCategoriaChange}>
                      <option value="">Seleccione una categoría</option>
                      {Object.keys(categorias).map((categoria) => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </label>

                  {categoriaSeleccionada && (
                    <label>
                      Subcategoria:
                      <select name="subcategoria" value={subcategoriaSeleccionada} onChange={handleSubcategoriaChange}>
                        <option value="">Seleccione una subcategoría</option>
                        {categorias[categoriaSeleccionada] && Object.keys(categorias[categoriaSeleccionada]).map((subcategoria) => (
                          <option key={subcategoria} value={subcategoria}>{subcategoria}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {subcategoriaSeleccionada && (
                    <label>
                      Producto:
                      <select name="producto" value={productoSeleccionado} onChange={handleProductoChange}>
                        <option value="">Seleccione un producto</option>
                        {Array.isArray(categorias[categoriaSeleccionada][subcategoriaSeleccionada]) ?
                          categorias[categoriaSeleccionada][subcategoriaSeleccionada].map((producto) => (
                            <option key={producto} value={producto}>{producto}</option>
                          )) :
                          Object.keys(categorias[categoriaSeleccionada][subcategoriaSeleccionada]).map((key) => (
                            categorias[categoriaSeleccionada][subcategoriaSeleccionada][key].map((producto) => (
                              <option key={producto} value={producto}>{producto}</option>
                            ))
                          ))
                        }
                      </select>
                    </label>
                  )}
                <label>
                    Unidad de Medida:
                    <select 
                      name="unidadMedida"
                      value={nuevoIngrediente.unidadMedida}
                      onChange={handleUnidadMedidaChange}
                      required
                    >
                      <option value="">Seleccione una unidad</option>
                      <option value="Gramos">Gramos</option>
                      <option value="Litros">Litros</option>
                      <option value="Unidad(es)">Unidad(es)</option>
                    </select>
                  </label>

                  {categoriaSeleccionada === 'Ingredientes' && (
                    <label>
                      Fecha de Caducidad:
                      <DatePicker 
                      selected={currentFechaCaducidad} 
                      onChange={date => setCurrentFechaCaducidad(date)} 
                      dateFormat="dd/MM/yyyy"
                    />
                    </label>
                  )}
                      <label>
                          Disponible:
                          <input 
                          type="number" 
                          name="disponible" 
                          value={nuevoIngrediente.disponible} 
                          onChange={handleChange} required />
                      </label>
                      {/* <label>
                          Límite:
                          <input 
                          type="number" 
                          name="limite" 
                          value={nuevoIngrediente.limite} 
                          onChange={handleChange} required />
                      </label> */}
                      <label>
                          Referencia:
                          <input 
                          type="number" 
                          name="referencia" 
                          value={nuevoIngrediente.referencia} 
                          onChange={handleChange} required />
                      </label>
                
                      <button 
                      type="submit"
                      >Guardar
                      </button>
                      <button 
                      onClick={cerrarFormulario}
                      >Cerrar
                      </button>
                  </form>
              </div>
          )}
          {isFormVisible && (
              <div className={`overlay ${isFormVisible ? 'visible' : ''}`}>
                <form 
                    className='formulario-modificar'
                    onSubmit={e => {
                    e.preventDefault();
                    modificarIngrediente(currentId, currentDisponible, currentLimite, currentFechaCaducidad);
                    setIsFormVisible(false); 
                    }}
                    onClick={(e) => e.stopPropagation()}
                    >
                      <label>
                      Disponible:
                        <input 
                          type="number" 
                          value={currentDisponible}
                          onChange={(e) => setCurrentDisponible(e.target.value)}
                        />
                      </label>
                      {/* <label>
                          Límite:
                          <input 
                            type="number" 
                            value={currentLimite}
                            onChange={(e) => setCurrentLimite(e.target.value)}
                          />
                      </label> */}
                      <label>
                        Fecha de Caducidad:
                        <DatePicker 
                          selected={currentFechaCaducidad} 
                          onChange={date => setCurrentFechaCaducidad(date)} 
                          dateFormat="dd/MM/yyyy"
                        />
                      </label>
                      <button type="submit">Guardar Cambios</button>
                      <button onClick={() => setIsFormVisible(false)}>Cancelar</button>
               </form>
            </div>
            )}
          <section className={`contenedorTabla ${isDesenfocado ? 'desenfocado' : ''}`}>
              <table className='tabla'>
                  <thead>
                      <tr>
                          <th>IDR</th>
                          <th>IDI</th>
                          <th>Categoria</th>
                          <th>Subcategoria</th>
                          <th>Producto</th>
                          <th>Unidad de Medida</th>
                          <th>FechaCaducidad</th>
                          <th>Disponible</th>
                          {/* <th>Limite</th> */}
                          <th>Acciones</th>
                          <th>Referencia</th>
                          <th>UltimaModificacion</th>
                      </tr>
                  </thead>
                  <tbody>
                    {inventarioFinal.map((ing) => {
                        return (
                            <tr key={ing.IDR} >
                                <td>{ing.IDR}</td>
                                <td>{ing.IDI}</td>
                                <td>{ing.categoria}</td>
                                <td>{ing.subcategoria}</td>
                                <td>{ing.producto}</td>
                                <td>{ing.unidadMedida}</td>
                                <td>{ing.categoria === 'Ingredientes' ? formatearFecha(ing.fechaCaducidad) : 'No aplica'}</td>
                                <td>{ing.disponible}</td>
                                {/* <td>{formatearLimite(ing.categoria, ing.limite)}</td> */}
                                <td>
                                    <button onClick={() => showForm(ing.IDR, ing.disponible, ing.fechaCaducidad)}>Modificar</button>
                                    <button onClick={() => eliminarIngrediente(ing.IDR)}>Eliminar</button>
                                </td>
                                <td>{ing.referencia}</td>
                                <td>{formatearUltimaModificacion(ing.ultimaModificacion)}</td>
                            </tr>
                        );
                    })}
                </tbody>
              </table>
          </section>
      </div>
  </div>
);
};
export default ActualizaStock;
