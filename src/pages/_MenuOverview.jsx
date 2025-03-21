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
  


useEffect(() => {
  const fetchPizzas = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/menu_pizzas`);
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
        const respuesta = await axios.get(`${process.env.REACT_APP_API_URL}/PartnerData`);
        setPartners(respuesta.data.data);
        // console.log('Partners cargados:', respuesta.data.data);
      } catch (error) {
        console.error('Error al cargar partners:', error);
      }
    };

    cargarPartners();
}, []);
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
      await axios.delete(`${process.env.REACT_APP_API_URL}/menu_pizzas/${id}`);
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
      await axios.delete(`${process.env.REACT_APP_API_URL}/PartnerData/${id}`);
      // Actualiza el estado para reflejar el cambio en la UI
      setPartners(prevPartners => prevPartners.filter(partner => partner.id !== id));
    } catch (error) {
      console.error("Error al eliminar el partner:", error);
    }
  }
};

return (
<>
  <h1>Menu Overview</h1>  
  <div className="menu-container">
 
    <div className="menu-items">
      {/* Renderiza Pizzas */}
      {pizzasConEstadoActualizado && pizzasConEstadoActualizado.length > 0 ? (
        pizzasConEstadoActualizado.map((menu, index) => (
          <div className="menu-item" key={index}>
            <div className="menu-image">
              <img src={`${process.env.REACT_APP_API_URL}/${menu.imagen}`} alt={menu.nombre} />
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
              <p className='descripcion'>
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

      {/* Renderiza Partners con la label dentro del espacio de descripción */}
      {partners.map(partner => (
        <div className="menu-item">
        <div className="menu-image">
          <img src={`${process.env.REACT_APP_API_URL}/${partner.imagen}`} alt={partner.producto} />
        </div>
        <div className="menu-details">
          <h3>{partner.producto}</h3>
          <p className="partner-price">Precio: EUR {partner.precio}</p> 
          <div className="partner-label">PARTNER</div> 
        </div>
        <div className="menu-buttons">
          <button onClick={() => handleEditPartner(partner)}>Editar</button>
          <button onClick={() => handleDeletePartner(partner.id)}>Eliminar</button>
        </div>
      </div>
      ))}

    </div>
  </div>
</>
);
};
  export default MenuOverview;