import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/menu.css';
import axios from 'axios';
import { _PizzaContext } from './_PizzaContext';



export const generarDescripcion = (ingredientesPizza) => {
  if (!Array.isArray(ingredientesPizza) || ingredientesPizza.length === 0) {
    return 'No se pudo generar una descripción.';
  }

const listaNombresIngredientes = ingredientesPizza.map(ing => ing.ingrediente);
const sinonimosDeliciosa = ['Deliciosa', 'Exquisita', 'Sabrosa', 'Espectacular', 'Irresistible', 'Maravillosa'];
const palabraFinal = sinonimosDeliciosa[Math.floor(Math.random() * sinonimosDeliciosa.length)];
const descripcion = listaNombresIngredientes.join(', ').replace(/, (?=[^,]*$)/, ' y ');

return `Esta pizza está elaborada con ${descripcion}. ¡${palabraFinal}!`;

};


const MenuOverview = () => {
  const navigate = useNavigate();
  const { ingredientesInactivos, 
    setActivePizzas, 
    activePizzas, 
    pizzasConEstadoActualizado, 
    setPizzasConEstadoActualizado   } = useContext(_PizzaContext);
  const [menus, setMenus] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedItem, setSelectedItem] = useState({tipo: 'default'});
  const [isFormVisible, setFormVisible] = useState(false);
  



  // useEffect(() => {
  //   console.log('Pizzas con estado actualizado en MenuOverview:', pizzasConEstadoActualizado);
  // }, [pizzasConEstadoActualizado]);

// useEffect(() => {
//     const fetchPizzas = async () => {
//       try {
//         const response = await axios.get('http://localhost:3001/menu_pizzas');
//         // Suponiendo que la respuesta tiene un campo `data` que es un objeto que contiene un arreglo de pizzas
//         const pizzasData = response.data.data; // Ajusta esto según la estructura real de tu respuesta
        
//         if (Array.isArray(pizzasData)) { // Verifica si pizzasData es realmente un arreglo
//           // Procesa las pizzas aquí...
//         } else {
//           throw new Error("La respuesta no contiene un arreglo de pizzas.");
//         }
//       } catch (error) {
//         console.error('Error al obtener las pizzas:', error);
//       }
//     };
  
//     fetchPizzas();
// }, []);

// useEffect(() => {
//     const fetchPizzas = async () => {
//       try {
//         const response = await axios.get('http://localhost:3001/menu_pizzas');
//         if (response.data && Array.isArray(response.data.data)) {
//           const pizzasData = response.data.data; // Obtiene el arreglo de pizzas
          
//           const menusActualizados = pizzasData.map(pizza => {
//             let ingredientesPizza;
//             try {
//               ingredientesPizza = typeof pizza.ingredientes === 'string' ? JSON.parse(pizza.ingredientes) : pizza.ingredientes;
//             } catch (e) {
//               ingredientesPizza = [];
//             }

//             const descripcion = generarDescripcion(ingredientesPizza); // Genera una descripción basada en los ingredientes
//             return { ...pizza, descripcion }; // Retorna la pizza con su descripción añadida
//           });

//           setMenus(menusActualizados); // Actualiza el estado local con las pizzas procesadas
//           setActivePizzas(menusActualizados); 
//           // console.log(menusActualizados)// Actualiza el estado en el contexto si es necesario
//         } else {
//           throw new Error("La respuesta no contiene un arreglo de pizzas.");
//         }
//       } catch (error) {
//         console.error('Error al obtener las pizzas:', error);
//       }
//     };

//     fetchPizzas();
// }, [setActivePizzas]);

useEffect(() => {
  const fetchPizzas = async () => {
    try {
      const response = await axios.get('http://localhost:3001/menu_pizzas');
      if (response.status === 200 && response.data && Array.isArray(response.data.data)) {
        const pizzasData = response.data.data.map(pizza => {
          let ingredientesPizza = [];
          try {
            ingredientesPizza = typeof pizza.ingredientes === 'string' ? JSON.parse(pizza.ingredientes) : pizza.ingredientes;
          } catch (e) {
            console.error('Error parsing ingredients', e);
          }

          const descripcion = generarDescripcion(ingredientesPizza);
          return { ...pizza, descripcion };
        });

        setMenus(pizzasData); // Aquí actualizas el estado de tu componente con las pizzas procesadas
      } else {
        throw new Error('Respuesta no válida del servidor');
      }
    } catch (error) {
      console.error('Error al cargar las pizzas:', error);
    }
  };

  fetchPizzas();
}, []);




useEffect(() => {
    const cargarPartners = async () => {
      try {
        const respuesta = await axios.get('http://localhost:3001/PartnerData');
        setPartners(respuesta.data.data);
        // console.log('Partners cargados:', respuesta.data.data);
      } catch (error) {
        console.error('Error al cargar partners:', error);
      }
    };

    cargarPartners();
}, []);

// useEffect(() => {
//   const cargarPizzasConEstado = async () => {
//     try {
//       const responsePizzas = await axios.get('http://localhost:3001/menu_pizzas');
//       if (responsePizzas.data && Array.isArray(responsePizzas.data.data)) {
//         // Extracción de los IDIs de los ingredientes inactivos
//         const IDIsInactivos = ingredientesInactivos.map(ing => ing.IDI);
      
//         // Actualización del estado de las pizzas
//         const pizzasConEstado = responsePizzas.data.data.map(pizza => {
//           // Parseo de la propiedad ingredientes si es una cadena JSON
//           const ingredientesPizza = Array.isArray(pizza.ingredientes) 
//             ? pizza.ingredientes 
//             : JSON.parse(pizza.ingredientes);

//           // Verificación de si todos los ingredientes de la pizza están activos
//           const esActiva = ingredientesPizza.every(ing => 
//             !IDIsInactivos.includes(ing.IDI)
//           );

//           return {
//             ...pizza,
//             estado: esActiva ? 'Activa' : 'Inactiva',
//             descripcion: generarDescripcion(ingredientesPizza)
//           };
//         });

//         console.log('Pizzas con estado actualizado:', pizzasConEstado);
//         setActivePizzas(pizzasConEstado.filter(p => p.estado === 'Activa'));
//       } else {
//         throw new Error('La respuesta no contiene un array de pizzas.');
//       }
//     } catch (error) {
//       console.error('Error al cargar las pizzas con estado:', error);
//     }
//   };

//   // Solo ejecutar si hay ingredientes inactivos
//   if (ingredientesInactivos && ingredientesInactivos.length > 0) {
//     cargarPizzasConEstado();
//   }
// }, [ingredientesInactivos]);


// En tu componente MenuOverview




// console.log("ingredientes inactivos", ingredientesInactivos)

// useEffect(() => {
//   const fetchPizzas = async () => {
//     try {
//       const response = await axios.get('http://localhost:3001/menu_pizzas');
//       if (response.status === 200 && response.data && Array.isArray(response.data.data)) {
//         // Suponemos que la respuesta es un objeto que contiene un array bajo la propiedad 'data'
//         setMenus(response.data.data); // Aquí actualizas el estado de tu componente con las pizzas
//       } else {
//         throw new Error('Respuesta no válida del servidor');
//       }
//     } catch (error) {
//       console.error('Error al cargar las pizzas:', error);
//     }
//   };

//   fetchPizzas();
// }, []); 

useEffect(() => {
  const actualizarEstadoPizzas = () => {
    if (pizzasConEstadoActualizado.length > 0) {
      // Aquí asumimos que ya tienes un estado 'menus' con las pizzas y quieres actualizar su estado de activación
      const menusActualizados = menus.map(menu => {
        const esActiva = pizzasConEstadoActualizado.some(pizza => pizza.id === menu.id && pizza.activa);
        return { ...menu, activa: esActiva };
      });

      setMenus(menusActualizados); 
    }
  };

  actualizarEstadoPizzas();
}, [pizzasConEstadoActualizado]); 


const handleCreatePizza = () => {
  navigate('/_Inicio/_Menu_p1/_Menu_p2_crearMenu');
};
const handleEdit = (menu) => {
  navigate(`/editarPizza/${menu.id}`);
};
const handleDelete = async (id) => {
  if (window.confirm('¿Estás seguro de que deseas eliminar esta pizza?')) {
    try {
      // Asegúrate de que la URL coincida con la configurada en el servidor
      await axios.delete(`http://localhost:3001/menu_pizzas/${id}`);
      // Actualiza el estado para reflejar el cambio en la UI
      setMenus(prevMenus => prevMenus.filter(menu => menu.id !== id));
    } catch (error) {
      console.error("Error al eliminar la pizza:", error);
    }
  }
};
const handleSelectPartner = partner => {
  setSelectedItem({...partner, tipo: 'partner'});
  setFormVisible(true);
};
const handleEditPartner = (partner) => {
  // Navegar a una ruta de edición de partner (asegúrate de tener una ruta y componente para editar)
  navigate(`/editarPartner/${partner.id}`);
};
const handleDeletePartner = async (id) => {
  if (window.confirm('¿Estás seguro de que deseas eliminar este partner?')) {
    try {
      // Asegúrate de que la URL coincida con la configurada en el servidor
      await axios.delete(`http://localhost:3001/PartnerData/${id}`);
      // Actualiza el estado para reflejar el cambio en la UI
      setPartners(prevPartners => prevPartners.filter(partner => partner.id !== id));
    } catch (error) {
      console.error("Error al eliminar el partner:", error);
    }
  }
};



  return (
    <div>
    {/* <h1 className="PDCRL">Panel de Control / Menú</h1> */}
    <h1 className="h1m">Menú Overview</h1>
    <button onClick={handleCreatePizza}>Crear una Nueva Pizza</button>
    <div className="menu-container">

    <>
    {pizzasConEstadoActualizado && pizzasConEstadoActualizado.length > 0 ? (
          pizzasConEstadoActualizado.map((menu, index) =>  (
      <div className="menu-item" key={index}>
        <div className="menu-image">
          <img src={`http://localhost:3001/${menu.imagen}`} alt={menu.nombre} />
        </div>
        <div className="menu-details">
          <h3>{menu.nombre}</h3>
          <p>Categoría: {menu.categoria}</p>
          <p>Tipo de cocción: {menu.metodoCoccion}</p>
          <p>Precio por tamaño:</p>
          <ul>
            {menu.PriceBySize
              ? Object.entries(JSON.parse(menu.PriceBySize)).map(([size, price]) => (
                  <li key={size}>{size.toUpperCase()}: EUR {price}</li>
                ))
              : <li>No hay precios disponibles</li>
            }
          </ul>
          <p className='Descripcion'>
            Descripción: {menu.descripcion}
          </p>
          <p>Estado: {menu.estado}</p>
        </div>
        <div className="menu-buttons">
          <button onClick={() => handleEdit(menu)}>Editar</button>
          <button onClick={() => handleDelete(menu.id)}>Eliminar</button>
        </div>
      </div>
    ))
  ) : (
    <p>No hay pizzas disponibles.</p>
  )}
</>


      <div className="menu-container">
      {partners.map(partner => (
        <div className="menu-item" key={partner.id}>
          <h6 className="labelPartnerbox">Acompañates</h6>
          <div className="menu-image">
            <img src={`http://localhost:3001/${partner.imagen}`} alt={partner.producto} />
          </div>
          <div className="menu-details">
            <h3>{partner.producto}</h3>
            <p>Precio: EUR {partner.precio}</p> {/* Asegúrate de que el precio esté disponible en el objeto partner */}
            <div className="menu-buttons">
              <button onClick={() => handleEditPartner(partner)}>Editar</button>
              <button onClick={() => handleDeletePartner(partner.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      ))}
    </div>
    </div>
  </div>
);
};
  export default MenuOverview;