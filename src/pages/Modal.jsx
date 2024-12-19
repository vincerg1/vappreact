import React, { useEffect } from 'react'; 
import '../styles/menu.css';

const Modal = ({
  onClose,
  content,
  onItemSelect,
  contentType,
  editingItem,
  setEditingItem,
  actualizarOrden,
  agregarItemAOrden,
  setIsModalVisible,
  pizzaSeleccionada, 
  esElegiblePara2x1,
  pizzasSugeridasPara2x1,
  cumpleCondicionesOferta,
  sessionData,
  pizzaMasCompradaEsActiva,
  ofertaPizzaMasCompradaDisponible
}) => {

  useEffect(() => {
    if (editingItem) {
    }
  }, [editingItem]);
  useEffect(() => {
    console.log('esElegiblePara2x1 en Modal:', esElegiblePara2x1 );
  }, [esElegiblePara2x1]);
  useEffect(() => {
    // console.log('pizzasSugeridasPara2x1 en Modal:', pizzasSugeridasPara2x1);
  }, [pizzasSugeridasPara2x1]);

  useEffect(() => {
    if (ofertaPizzaMasCompradaDisponible !== true) {
      console.log('ofertaPizzaMasCompradaDisponible ha cambiado a false');
    } else {
      console.log('ofertaPizzaMasCompradaDisponible sigue siendo true');
    }
  }, [ofertaPizzaMasCompradaDisponible]);
  const handleItemClick = (item, event) => {
    event.stopPropagation();
    
    // Verifica si el ítem clickeado es una oferta y si es la Oferta_Id 5
    if (item.Oferta_Id === 5) {
      // Verifica si la pizza seleccionada es la pizza más comprada y si la oferta está disponible
      const esElegibleParaOfertaId5 = pizzaSeleccionada?.id === sessionData.pizzaMasComprada.id && ofertaPizzaMasCompradaDisponible;
      
      if (!esElegibleParaOfertaId5) {
        alert('Esta oferta no está disponible para la pizza seleccionada.');
        return;
      }
    }
    
    // Si es elegible o si es cualquier otra oferta u ítem, procede normalmente
    onItemSelect(item);
  };
  const handleItemSelect = (item) => {
    // Suponiendo que item es el objeto seleccionado en el modal
    if (editingItem) {
      // Actualizamos el ítem existente
      const itemEditado = { ...editingItem, ...item };
      actualizarOrden(editingItem.id, itemEditado);
      setEditingItem(null); // Limpiamos el ítem de edición
    } else {
      // Añadimos un nuevo ítem
      agregarItemAOrden(item);
    }
    setIsModalVisible(false); // Cerramos el modal después de la selección o edición
  };

  const esPizzaMasCompradaYOfertaDisponible = (item) => {
    // Verifica si la oferta es la de pizza más comprada y si se cumplen las condiciones
    return item.Oferta_Id === 5 && 
           ofertaPizzaMasCompradaDisponible &&
           pizzaSeleccionada?.id === sessionData.pizzaMasComprada.id;
  };

  const contenidoFiltrado = content.filter((item) => {
    // Filtra solo si es tipo 'ofertas'
    if (contentType === 'ofertas') {
      if (item.Oferta_Id === 8) {
        // Para la oferta 2x1, verifica si la pizza seleccionada es elegible
        return pizzaSeleccionada?.esElegiblePara2x1;
      } else if (contentType === 'ofertas' && item.Oferta_Id === 5) {
        // Verifica si la oferta de la pizza más comprada está disponible
        return esPizzaMasCompradaYOfertaDisponible(item);
      }
    }
    return true;
  });
  
  

  return (
    <div className="modal">
      <div className="menu-Modalcontainer">
        <div className="close-button" onClick={onClose}>x</div>
        <h2 className='tituloModal'>
          {contentType === 'pizzas' ? 'Selecciona otra pizza' :
           contentType === 'ofertas' ? 'Selecciona una oferta' :
           'Selecciona un acompañante'}
        </h2>
        {contenidoFiltrado.map((item) => {
          let imageUrl = contentType === 'pizzas' || contentType === 'partners' ? `http://localhost:3001/${item.imagen}` : `http://localhost:3001${item.Imagen}`;
          return (
            <div className="menu-item" key={item.id || item.Oferta_Id}>
              <div className="menu-image">
                <img src={imageUrl} alt={item.nombre || item.Descripcion || item.NombrePartner} />
              </div>
              <div className="menu-details">
                <h3>{item.nombre || item.Descripcion || item.producto}</h3>
                {contentType === 'ofertas' && (
                  <p className={`cupones-disponibles ${item.Cupones_Semanales_Disponibles <= 10 ? 'alerta' : ''}`}>
                    Disponibles: {item.Cupones_Semanales_Disponibles}
                  </p>
                 )}
                <button className="botonSeleccionarMenu" onClick={(event) => handleItemClick(item, event)}>
                  {contentType === 'pizzas' ? 'Añadir esta pizza' :
                  contentType === 'ofertas' ? 'Tomar esta oferta' :
                  'Añadir este acompañante'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Modal;
