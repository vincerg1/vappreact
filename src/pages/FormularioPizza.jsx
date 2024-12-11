import React, { useState, useEffect, useContext  } from 'react'; 
import { generarDescripcion } from './_MenuOverview';
import { _PizzaContext } from './_PizzaContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from './Modal';
import OrdenActual from './OrdenActual';
import '../styles/menu.css';

const FormularioPizza = (
  { item, 
    setItem, 
    onClose, 
    onAddPizza, 
    setSelectedPizza, 
    partners, 
    onSelectPartner,
    ofertas,
    ofertasDisponibles,
    esElegiblePara2x1,
    cumpleCondicionesOferta,
    pizzaMasCompradaEsActiva,
    ofertaPizzaMasCompradaDisponible
   }) => {
 



  const [selectedSize, setSelectedSize] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [complementos, setComplementos] = useState([]);
  const [bebidas, setBebidas] = useState([]);
  const [postres, setPostres] = useState([]);
  const [showFirstLayer, setShowFirstLayer] = useState(true);
  const [showSecondLayer, setShowSecondLayer] = useState(false);
  const [showThirdLayer, setShowThirdLayer] = useState(false);
  const [showFourthLayer, setShowFourthLayer] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pizzas, setPizzas] = useState([]);
  const [tempPizza, setTempPizza] = useState(null);
  const navigate = useNavigate();
  const isPizza = item && item.PriceBySize;
  const availableSizes = isPizza ? JSON.parse(item.selectSize) : [];
  const priceBySize = isPizza ? JSON.parse(item.PriceBySize) : {};
  const { 
    activePizzas , 
    addPizzaToCart, 
    sessionData, 
    updateSessionData,
   } = useContext(_PizzaContext);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolderName: '',
  });
  const [isPartnerModalVisible, setIsPartnerModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState('pizzas');
  const [ordenActual, setOrdenActual] = useState({
    items: [], 
    total: 0, 
    totalDescuentos: 0,
    descuentosAplicados: [],
  });
  const [precioSeleccionado, setPrecioSeleccionado] = useState(null);
  const [showOfertasModal, setShowOfertasModal] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [descuentosAplicados, setDescuentosAplicados] = useState([]); 
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState(null);
  const [pizzaSeleccionada, setPizzaSeleccionada] = useState(null);
  const { pizzasSugeridasPara2x1 } = useContext(_PizzaContext);
  const [totales, setTotales] = useState({
    totalSinDescuentos: 0,
    totalDescuentos: 0,
    totalAPagar: 0
  });
  



  useEffect(() => {
    if (item) {
      // console.log('contenido objeto item',item)
      try {
        // console.log('Pizza antes de parsear:', item.ingredientes);
        const availableSizes = JSON.parse(item.selectSize || '[]');
        setSelectedSize(availableSizes[0] || '');
    
        const ingredientesParsed = JSON.parse(item.ingredientes || '[]');
        // console.log('Ingredientes parseados:', ingredientesParsed);
        const descripcionGenerada = generarDescripcion(ingredientesParsed);
        // console.log('Descripcion generada:', descripcionGenerada);
        setDescripcion(descripcionGenerada);
      } catch (error) {
        console.error("Error al analizar datos de pizza o al generar descripción:", error);
      }
    }
  }, [item]);
  useEffect(() => {
    const cargarInventario = async () => {
      try {
        const response = await axios.get('http://localhost:3001/inventario');
        const inventario = response.data.data;
        // console.log(response.data.data)
        const complementos = inventario.filter(item => item.categoria === 'Complementos');
        const bebidas = inventario.filter(item => item.categoria === 'Bebidas');
        const postres = inventario.filter(item => item.categoria === 'Postres');
        setComplementos(complementos);
        setBebidas(bebidas);
        setPostres(postres);
      } catch (error) {
        console.error('Error al cargar el inventario:', error);
      }
    };

    cargarInventario();
  }, []);
  useEffect(() => {
    console.log('Orden actualizada:', ordenActual);
  }, [ordenActual]);
  useEffect(() => {
    if (item && item.tipo === 'pizza') {
      setShowFirstLayer(true);
    }
  }, [item]);
  useEffect(() => {
    // console.log('pizzasSugeridasPara2x1 en FormularioPizza:', pizzasSugeridasPara2x1);
  }, [pizzasSugeridasPara2x1])
  useEffect(() => {
    const nuevoTotalSinDescuentos = calcularTotalSinDescuentos(ordenActual.items);
    const nuevoTotalDescuentos = calcularTotalDescuentos(ordenActual.descuentosAplicados || [], nuevoTotalSinDescuentos);
    const nuevoTotalAPagar = nuevoTotalSinDescuentos - nuevoTotalDescuentos;
  
    if (!isNaN(nuevoTotalAPagar) && nuevoTotalAPagar >= 0) {
      setTotales({
        totalSinDescuentos: nuevoTotalSinDescuentos,
        totalDescuentos: nuevoTotalDescuentos,
        totalAPagar: nuevoTotalAPagar
        
      });
    } else {
      console.error('Se encontró un error al calcular el total a pagar');
    }
  }, [ordenActual]);
  useEffect(() => {
    console.log('La oferta para la pizza más comprada está disponible en el FORM:', ofertaPizzaMasCompradaDisponible);
  }, [ofertaPizzaMasCompradaDisponible]);
  
//////////////zonas de pruebas//////////////////////////////////////////////////////
  // console.log('ofertasDisponibles desde el formulario', ofertasDisponibles )
  // console.log ("SD DESDE F",sessionData)
  // console.log('ofertas desde el formulario', ofertas )
  // console.log('pizzaSeleccionada', pizzaSeleccionada )
  // console.log('itemSeleccionado', itemSeleccionado )
  // console.log ('ordenActual', ordenActual)
  // console.log('ofertaSeleccionada', ofertaSeleccionada)
  // console.log("pizzas activas en el Form", activePizzas)

  const handleAddMorePizzas = () => {
    setModalContent('pizzas');
    setIsModalVisible(true);
  };
  const handleAddMorePartners = () => {
    setModalContent('partners');
    setIsModalVisible(true);
  };
  const handlePartnerSelect = (partner) => {
    // console.log(partner); 
    setItem({
      ...partner,
      tipo: 'partner',
    
    });
    setCantidad(1); 
    setShowFirstLayer(true);
    setShowSecondLayer(false);
    setIsModalVisible(false);
  };
  const handleSelectPizzaFromModal = (selectedPizza) => {
    // Asegúrate de que el ítem tiene la propiedad tipo establecida como 'pizza'
    const updatedItem = { ...selectedPizza, tipo: 'pizza' };
  
    setTempPizza({ ...updatedItem, quantity: 1 });
    setShowSecondLayer(false);
    setShowFirstLayer(true);
    setIsModalVisible(false);
    setSelectedPizza(updatedItem); // Asumiendo que necesitas actualizar un estado de pizza seleccionada
    setItem(updatedItem); // Actualizar el estado del ítem con la propiedad tipo
  };
  const calcularDescuentoParaOfertaId1 = (ordenActual, cuponesDisponibles) => {
    if (cuponesDisponibles > 0) {
      const descuento = ordenActual.total * 0.5; // 50% descuento
      return descuento;
    } else {
      return 0; 
    }
  }
  const calcularDescuentoParaOfertaId2 = (ordenActual, cuponesDisponibles) => {
    if (cuponesDisponibles > 0) {
      const descuento = ordenActual.total * 0.25;
      return descuento;
    } else {
      return 0; 
    }
  };
  const calcularDescuentoParaOfertaId3 = (ordenActual, cuponesDisponibles) => {
    if (cuponesDisponibles > 0) {
      const descuento = ordenActual.total * 0.10;
      return descuento;
    } else {
      return 0; 
    }
  };
  const calcularDescuentoParaOfertaId4 = (ordenActual, ticketPromedio, compraMinima) => {
    const ticketObjetivo = ticketPromedio * 1.25; // Ticket Objetivo es 25% más alto que el promedio.
    if (ordenActual.total >= compraMinima && ordenActual.total >= ticketObjetivo) {
      return 0; // No se cobran gastos de envío.
    }
    // Aquí regresarías el costo de envío estándar si no se cumplen las condiciones.
  };
  const calcularDescuentoParaOfertaId5 = (sessionData) => {
    // Asumiendo que ya se ha verificado que la pizza más comprada está activa
    if (sessionData.numeroDeCompras > 5 && sessionData.ticketPromedio > 10) {
      const pizzaMasComprada = sessionData.pizzaMasComprada; // Asegúrate de que esta propiedad exista
      const descuentoAplicado = pizzaMasComprada.price * 0.25;
      console.log(`Descuento del 25% aplicado a la pizza más comprada ${descuentoAplicado}`);
      return descuentoAplicado;
    } else {
      console.log('No se cumplen las condiciones para aplicar el descuento a la pizza más comprada.');
      return 0; // O manejarlo como null o como consideres apropiado
    }
  };
  const calcularDescuentoParaOfertaId6 = (ordenActual) => {
    const descuentoAleatorio = (Math.floor(Math.random() * 8) + 1) / 100;
    return ordenActual.total * descuentoAleatorio;
  };
  const calcularDescuentoParaOfertaId7 = (ordenActual, sessionData) => {
    // Verificamos las condiciones: más de 5 compras y un ticket promedio mayor a 10 euros
    if (sessionData.numeroDeCompras > 5 && sessionData.ticketPromedio > 10) {
      // Asumimos que las pizzas están ordenadas y que la segunda está en la posición 1 (index 0 es la primera)
      let pizzas = ordenActual.items.filter(item => item.categoria === 'Pizza');
      let descuento = 0;
  
      // Aplicamos el descuento del 50% a la segunda pizza (y cada segunda pizza adicional en pares)
      for (let i = 1; i < pizzas.length; i += 2) {
        descuento += pizzas[i].precio * 0.5;
      }
  
      return descuento; // Devolvemos el total del descuento
    } else {
      // Si no se cumplen las condiciones, no hay descuento
      return 0;
    }
  };
  const calcularDescuentoParaOfertaId8 = (ordenActual) => {
    const nuevaOrden = {
      ...ordenActual,
      pizzas: ordenActual.pizzas.map(pizza => ({
        ...pizza,
        cantidad: pizza.cantidad * 2, 
      })),
    };
    return nuevaOrden;
  };
  const calcularDescuentoParaOfertaId9 = (ordenActual) => {
  const horaActual = new Date().getHours();
  
  if (horaActual < 20) {
    return ordenActual.total * 0.05; // Devuelve el 5% del total actual
  } else {
    return 0; // Si es después de las 19 hrs, no hay descuento
  }
  };
  const calcularDescuentoParaOfertaId10 = (sessionData, ordenActual) => {
    // Calcula los días desde el registro del cliente
    const diasDesdeRegistro = (new Date() - new Date(sessionData.fechaRegistro)) / (1000 * 60 * 60 * 24);
    
    // Verifica si es el cumpleaños del cliente y si ha estado registrado por más de 30 días
    if (sessionData.esCumpleanos && diasDesdeRegistro > 30) {
      const descuentoMaximo = sessionData.ticketPromedio * 2;
      const descuentoAplicado = ordenActual.total * 0.5;
      
      // El descuento aplicado no debe exceder el máximo permitido
      return descuentoAplicado > descuentoMaximo ? descuentoMaximo : descuentoAplicado;
    }
  
    // Si no se cumplen las condiciones, no se aplica descuento
    return 0;
  };
  const calcularDescuento = (oferta, ordenActual, sessionData, setOrdenActual) => {
   
    if (!oferta || !ordenActual || !sessionData) {
      console.error('Datos necesarios para calcular el descuento no están definidos.');
      return 0; // Si falta algo, retorna 0
    }
    let descuento = 0;

  if (!oferta || !ordenActual || !sessionData) {
    console.error('Datos necesarios para calcular el descuento no están definidos.');
    return descuento;
  }

  if (typeof oferta.Cupones_Semanales_Disponibles !== 'number' || typeof ordenActual.total !== 'number') {
    console.error('Datos no válidos para calcular el descuento:', {
      oferta,
      total: ordenActual.total,
      sessionData
    });
    return descuento;
  }

  switch (oferta.Oferta_Id) {
    case 1:
      let descuentoAplicado;
      if (typeof oferta.Cupones_Semanales_Disponibles === 'number' && typeof ordenActual.total === 'number') {
        const descuentoAplicado = calcularDescuentoParaOfertaId1(ordenActual, oferta.Cupones_Semanales_Disponibles);
        console.log('Descuento Aplicado:', descuentoAplicado);
        if (!isNaN(descuentoAplicado) && descuentoAplicado !== undefined) {
          setOrdenActual(prevOrden => ({
            ...prevOrden,
            totalDescuentos: prevOrden.totalDescuentos + descuentoAplicado,
            total: prevOrden.total - descuentoAplicado,
            descuentosAplicados: [...prevOrden.descuentosAplicados, { Oferta_Id: oferta.Oferta_Id, descuentoAplicado: descuentoAplicado }]
          }));
        }
      } else {
        console.error('El descuento aplicado no es un número:', descuentoAplicado); 
      }
      break;
      case 2:
      if (typeof oferta.Cupones_Semanales_Disponibles === 'number' && typeof ordenActual.total === 'number') {
        const descuentoAplicado = calcularDescuentoParaOfertaId2(ordenActual, oferta.Cupones_Semanales_Disponibles);
        console.log('Descuento Aplicado:', descuentoAplicado);
        if (!isNaN(descuentoAplicado) && descuentoAplicado !== undefined) {
          setOrdenActual(prevOrden => ({
            ...prevOrden,
            totalDescuentos: prevOrden.totalDescuentos + descuentoAplicado,
            total: prevOrden.total - descuentoAplicado,
            descuentosAplicados: [...prevOrden.descuentosAplicados, { Oferta_Id: oferta.Oferta_Id, descuentoAplicado: descuentoAplicado }]
          }));
        }
      } else {
        console.error('El descuento aplicado no es un número:', descuentoAplicado);
      }
      break;
      case 3:
        if (typeof oferta.Cupones_Semanales_Disponibles === 'number' && typeof ordenActual.total === 'number') {
          const descuentoAplicado = calcularDescuentoParaOfertaId3(ordenActual, oferta.Cupones_Semanales_Disponibles);
          console.log('Descuento Aplicado para la oferta 3:', descuentoAplicado);
          if (!isNaN(descuentoAplicado) && descuentoAplicado !== undefined) {
            setOrdenActual(prevOrden => ({
              ...prevOrden,
              totalDescuentos: prevOrden.totalDescuentos + descuentoAplicado,
              total: prevOrden.total - descuentoAplicado,
              descuentosAplicados: [...prevOrden.descuentosAplicados, { Oferta_Id: oferta.Oferta_Id, descuentoAplicado }]
            }));
          }
        } else {
          console.error('El descuento aplicado para la oferta 3 no es un número:', descuentoAplicado);
        }
        break;
      case 4:
        // Deberás pasar los parámetros adicionales necesarios para calcular los gastos de envío.
        descuento = calcularDescuentoParaOfertaId4(ordenActual, sessionData.ticketPromedio, /* compraMinima */);
        break;
          case 5:
            // Verificamos si el usuario cumple con las condiciones de la oferta
            if (sessionData.numeroDeCompras > 5 && sessionData.ticketPromedio > 10) {
              // Calculamos el descuento aplicado
              const descuentoAplicado = calcularDescuentoParaOfertaId5(sessionData);
              console.log('Descuento Aplicado para la oferta 5:', descuentoAplicado);
          
              // Si hay un descuento válido, actualizamos la orden
              if (descuentoAplicado > 0) { // Asumiendo que el descuentoAplicado es el monto del descuento
                setOrdenActual(prevOrden => ({
                  ...prevOrden,
                  totalDescuentos: prevOrden.totalDescuentos + descuentoAplicado,
                  total: prevOrden.total - descuentoAplicado,
                  descuentosAplicados: [...prevOrden.descuentosAplicados, { Oferta_Id: 5, descuentoAplicado }]
                }));
              } else {
                console.error('No se aplicó descuento para la oferta 5.');
              }
            } else {
              console.log('No se cumplen las condiciones para la oferta 5.');
            }
            break;        
      case 6:
        descuento = calcularDescuentoParaOfertaId6(ordenActual);
        break;
      case 7:
        descuento = calcularDescuentoParaOfertaId7(ordenActual, sessionData);
        break;
      case 8:
        // Necesitarás una forma de saber qué pizzas son elegibles para la oferta 2x1.
        descuento = calcularDescuentoParaOfertaId8(ordenActual, /* pizzasElegiblesPara2x1 */);
        break;
      case 9:
        descuento = calcularDescuentoParaOfertaId9(ordenActual);
        break;
      case 10:
        descuento = calcularDescuentoParaOfertaId10(sessionData, ordenActual);
        break;
      default:
        // Manejo de un id de oferta desconocido o inesperado.
        console.error(`Oferta desconocida con id: ${oferta.Oferta_Id}`);
        break;
    }

    if (typeof descuento === 'number' && descuento !== 0) {
      setOrdenActual(prevOrden => ({
        ...prevOrden,
        totalDescuentos: prevOrden.totalDescuentos + descuento,
        total: prevOrden.total - descuento,
        descuentosAplicados: [...prevOrden.descuentosAplicados, oferta]
      }));
    }
  
    return descuento;
  };
  const handleSeleccionarOferta = (oferta) => {
    if (ordenActual.descuentosAplicados.length >= 1) {
      alert('Solo se puede aplicar un cupón de descuento por compra.');
      return;
    }

    if (!oferta || !ordenActual || typeof ordenActual.total !== 'number') {
      console.error('Datos necesarios para calcular el descuento no están definidos.');
      return;
    }


    calcularDescuento(oferta, ordenActual, sessionData, setOrdenActual);

    // Actualizar la oferta seleccionada y manejar el UI.
    setOfertaSeleccionada(oferta);
    setShowOfertasModal(false);
    alert('Oferta añadida a la orden correctamente.');
  };
  const mostrarModalOfertas = () => {
    const yaTieneOferta = ordenActual.items.some(item => item.tipo === 'oferta');
    if (yaTieneOferta) {
      alert('Ya has seleccionado una oferta. No puedes seleccionar más de una.');
    } else {
      setShowOfertasModal(true);
    }
  };
  const handleNextToSecondLayer = () => {
    setShowFirstLayer(false);
    setShowSecondLayer(true);
  };
  const handleNextToThirdLayer = () => {
    setShowSecondLayer(false);
    setShowThirdLayer(true);
  };
  const handlePreviousToFirstLayer = () => {
    setShowSecondLayer(false);
    setShowFirstLayer(true);
  };
  const handlePreviousToSecondLayer = () => {
    setShowThirdLayer(false);
    setShowSecondLayer(true);
  };
  const handlePreviousToThirdLayer = () => {
    setShowFourthLayer(false);
    setShowThirdLayer(true);
  };
  const handleProceedToPayment = () => {
    setShowThirdLayer(false);
    setShowFourthLayer(true);
  }
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCardDetails(prevDetails => ({
      ...prevDetails,
      [name]: value,
    }));
  };
  const agregarItemAOrden = (itemSeleccionado) => {
    // Verifica si la pizza está en la lista de sugeridas para 2x1 para determinar su elegibilidad
    const esElegiblePara2x1 = pizzasSugeridasPara2x1.some(p => p.id === itemSeleccionado.id);
    
    // Aquí agregarías una verificación similar para la Oferta_Id 5
    const esElegibleParaOfertaId5 = itemSeleccionado.id === sessionData.pizzaMasComprada.id && ofertaPizzaMasCompradaDisponible;
  
    // Construye el objeto con la información de elegibilidad para las ofertas
    const itemConElegibilidad = {
      ...itemSeleccionado,
      esElegiblePara2x1,
      esElegibleParaOfertaId5,
    };
  
    // Actualiza la orden actual con el nuevo item y calcula el nuevo total
    setOrdenActual(prevOrden => ({
      ...prevOrden,
      items: [...prevOrden.items, itemConElegibilidad],
      total: prevOrden.total + (itemConElegibilidad.precio * itemConElegibilidad.cantidad),
    }));
  };
  const eliminarItemDeOrden = (itemId) => {
    setOrdenActual(prevOrden => ({
      ...prevOrden,
      items: prevOrden.items.filter(item => item.id !== itemId),
    }));
  };
  const handleSeguirComprando = () => {
    if (!item) {
      console.error('No se ha seleccionado ningún ítem.');
      return;
    }
  
    let precio;
    let nombre;
    
    // Establece el nombre y el precio dependiendo del tipo de ítem
    if (item.tipo === 'partner') {
      nombre = item.producto; // Asumiendo que el nombre del partner está en producto
      precio = Number(item.precio); // Convierte el precio a número si es necesario
    } else if (item.tipo === 'pizza') {
      if (typeof item.PriceBySize !== 'string' || !selectedSize) {
        console.error('Datos incompletos para seguir comprando.');
        return;
      }
  
      try {
        const preciosPorSize = JSON.parse(item.PriceBySize);
        if (!preciosPorSize[selectedSize]) {
          console.error(`No hay precio para el tamaño seleccionado: ${selectedSize}`);
          return;
        }
        precio = Number(preciosPorSize[selectedSize]); // Convierte el precio a número si es necesario
        nombre = item.nombre;
      } catch (e) {
        console.error('Error al parsear PriceBySize:', e);
        return;
      }
    } else {
      console.error('Tipo de ítem desconocido.');
      return;
    }
  
    // Crea el objeto itemSeleccionado con una estructura consistente
    const itemSeleccionado = {
      tipo: item.tipo,
      id: item.id,
      nombre: nombre,
      precio: precio,
      cantidad: Number(cantidad), // Convierte la cantidad a número si es necesario
      size: item.tipo === 'pizza' ? selectedSize : undefined,
      esElegiblePara2x1: pizzasSugeridasPara2x1.some(p => p.id === item.id),
      esElegibleParaOfertaId5: item.id === sessionData.pizzaMasComprada.id && ofertaPizzaMasCompradaDisponible 
    };
    setPizzaSeleccionada(itemSeleccionado);
    agregarItemAOrden(itemSeleccionado);
    handleNextToSecondLayer();
  };
  const handleShowOrderSummary = (event) => {
    event.preventDefault(); // Esto evitará el envío del formulario
    setShowOrderSummary(true);
  };
  const handleBackToForm = (event) => {
    event.preventDefault(); // Esto evitará el envío del formulario
    setShowOrderSummary(false);
  };
  const actualizarOrden = (itemEditado) => {

  };
  const eliminarItem = itemId => {
    setOrdenActual(prevOrden => ({
      ...prevOrden,
      items: prevOrden.items.filter(item => item.id !== itemId),
      total: prevOrden.items
        .filter(item => item.id !== itemId)
        .reduce((total, item) => total + item.precio * item.cantidad, 0),
    }));
  };
  const startEditing = (item) => {
  setEditingItem(item);
  setIsModalVisible(true);
  };


 // calculos finales..


 const calcularTotalSinDescuentos = (items) => {
  return items.reduce((acum, item) => acum + item.precio * item.cantidad, 0);
 };
 const calcularTotalDescuentos = (descuentoAplicado) => {
  let totalDescuentos = 0;

  descuentoAplicado.forEach((oferta) => {
    // Asegúrate de que Oferta_Id y descuentoAplicado son propiedades definidas y son números
    if ('Oferta_Id' in oferta && 'descuentoAplicado' in oferta && typeof oferta.descuentoAplicado === 'number') {
      console.log(`Descuento aplicado para oferta con id ${oferta.Oferta_Id}: ${oferta.descuentoAplicado}`);
      totalDescuentos += oferta.descuentoAplicado;
    } else {
      console.error(`La oferta con id ${oferta.Oferta_Id} no tiene un descuento aplicable o es NaN.`);
    }
  });

  return totalDescuentos;
 };
 const procesarPago = () => {
  const registroVenta = {
    items: ordenActual.items,
    descuentosAplicados: descuentosAplicados,
    totalSinDescuentos: totalSinDescuentos,
    totalDescuentos: totalDescuentos,
    totalAPagar: totalAPagar,
    // Agrega aquí los métodos de entrega e IVA
  };
  // Aquí enviarías `registroVenta` a tu backend o base de datos
 };

const totalSinDescuentos = calcularTotalSinDescuentos(ordenActual.items);
const totalDescuentos = calcularTotalDescuentos(descuentosAplicados, totalSinDescuentos);
const totalAPagar = totalSinDescuentos - totalDescuentos;






  return (
    <div className="form-container"> 
      <div className="formulario-pizza">
        <h2> ¡Ajusta Tu Pedido!</h2>
        <form 
        className='form' 
        key={item ? item.id : 'initial'}
        >
          {showFirstLayer && (
    <>
      {item && item.tipo === 'pizza'  && (
        <>
        {/* { console.log('Item seleccionado:', item) } */}
              <label htmlFor="descripcion">Descripción:</label>
              <p id="descripcion" className="highlighted">{descripcion}</p>

          <div className="form-group">
            <label htmlFor="size-select">Selecciona precio y tamaño:</label>
            <select
              id="size-select"
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
            >
              {availableSizes.map(size => (
                <option key={size} value={size}>
                  Size {size.toUpperCase()}: EUR {priceBySize[size]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="cantidad-select">Cantidad:</label>
            <select
              id="cantidad-select"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            >
              {[...Array(10).keys()].map(n => ( 
                <option key={n + 1} value={n + 1}>
                  {n + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="metodo-coccion">Método de cocción:</label>
            <p id="metodo-coccion">{item.metodoCoccion}</p>
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoría:</label>
            <p id="categoria">{item.categoria}</p>
          </div>
        </>
      )}
    
      {item && item.tipo === 'partner' && (
        <>
           <label htmlFor="nombre-partner">Descripcion:</label>
            <p id="nombre-partner" className="highlighted">{item.producto}</p>
              
          <div className="form-group">
            <label>Precio:</label>
            <p>{item.precio} EUR</p>
          </div>

          <div className="form-group">
            <label htmlFor="cantidad-select">Cantidad:</label>
            <select
              id="cantidad-select"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            >
              {[...Array(10).keys()].map(n => ( 
                <option key={n + 1} value={n + 1}>
                  {n + 1}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="form-actions">
        <button type="button" onClick={handleSeguirComprando}>Seguir Comprando</button>
        <button onClick={onClose}>Cerrar</button>
      </div>
    </>
          )}
          {showSecondLayer && (
            <>
              <div className="form-actions">
                <button type="button" className="AgregaOtraPizza" onClick={handleAddMorePizzas}> Agregar Pizza </button>
                <button type="button" className="AgregaOtraPizza" onClick={handleAddMorePartners}> Agregar Acompañantes </button>
                <button type="button" onClick={handleNextToThirdLayer}>Continuar a Caja</button>
                <button type="button" onClick={handlePreviousToFirstLayer}>Atrás</button>
              </div>
    
              {isModalVisible && (
                <Modal
                content={modalContent === 'pizzas' ? activePizzas : partners}
                onItemSelect={modalContent === 'pizzas' ? handleSelectPizzaFromModal : handlePartnerSelect}
                contentType={modalContent}
                onClose={() => setIsModalVisible(false)}
                onOfferSelect={handleSeleccionarOferta}
                pizzaSeleccionada={pizzaSeleccionada}
                pizzasSugeridasPara2x1={pizzasSugeridasPara2x1}
                esElegiblePara2x1={pizzaSeleccionada?.esElegiblePara2x1}
                ofertaPizzaMasCompradaDisponible={ofertaPizzaMasCompradaDisponible}
                />
              )}
            </>
          )}
          {showThirdLayer && !showOrderSummary && (
              <>
                <h3>Confirmación y Ofertas</h3>
                <button onClick={(event) => { event.preventDefault(); mostrarModalOfertas(); }}>
                  Ver Ofertas Disponibles
                </button>
                <button onClick={handleShowOrderSummary}>
                  Verificar Orden
                </button>
              </>
            )}

           
            {showOrderSummary && (
              <OrdenActual
              orden={ordenActual}
              actualizarOrden={actualizarOrden}
              eliminarItem={eliminarItem}
              startEditing={startEditing} 
              onBack={handleBackToForm}
              totalSinDescuentos={totales.totalSinDescuentos}
              totalDescuentos={totales.totalDescuentos}
              totalAPagar={totales.totalAPagar}
              oferta={ofertaSeleccionada}
            />
            )}

            {showOfertasModal && (
              <Modal
                content={ofertasDisponibles}
                onItemSelect={handleSeleccionarOferta}
                contentType='ofertas'
                editingItem={editingItem}
                onClose={() => setShowOfertasModal(false)}
                pizzaSeleccionada={pizzaSeleccionada}
                pizzasSugeridasPara2x1={pizzasSugeridasPara2x1}
                esElegiblePara2x1={pizzaSeleccionada?.esElegiblePara2x1}
                cumpleCondicionesOferta={cumpleCondicionesOferta}
                sessionData={sessionData}
                pizzaMasCompradaEsActiva={pizzaMasCompradaEsActiva}
                ofertaPizzaMasCompradaDisponible={ofertaPizzaMasCompradaDisponible}
              />
            )}
            {/* <button onClick={procesarPago}>Proceder al pago</button> */}


          {showFourthLayer && (
              <div className="payment-details">
                <h3>Detalles de Pago</h3>
                {/* Formulario de detalles de pago */}
              </div>
          )}
        </form>
      </div>
    </div>
  );
  
  
};

export default FormularioPizza;
