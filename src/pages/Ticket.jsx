import React, { useEffect, useState } from 'react';
import moment from 'moment';  // Importa moment para el formateo correcto
import 'moment/locale/es';  // Asegura que el idioma sea español
import '../styles/Ticket.css'; 
import voltaLogo from '../img/voltaLogo.png';
import axios from 'axios';
import QRCode from 'qrcode.react'; // Asegúrate de importar QRCode

const Ticket = ({ order }) => {
  console.log("Orden recibida:", order);
  const [pizzas, setPizzas] = useState([]); // Para almacenar los nombres de las pizzas
  const [qrData, setQrData] = useState(''); // Estado para el contenido del QR
  const [storeContactInfo, setStoreContactInfo] = useState(null); // Para almacenar la información de la tienda principal
  const productos = Array.isArray(JSON.parse(order.productos)) ? JSON.parse(order.productos) : [];

  useEffect(() => {
    const fetchPizzas = async () => {
      try {
        const response = await axios.get('http://localhost:3001/menu_pizzas'); // Ajusta la URL según tu API
        if (Array.isArray(response.data.data)) {
          setPizzas(response.data.data); // Almacena las pizzas en el estado
        } else {
          console.error('La respuesta no contiene un array de pizzas:', response.data);
        }
      } catch (error) {
        console.error('Error al obtener las pizzas:', error);
      }
    };

    fetchPizzas();
  }, []);

  useEffect(() => {
    // Obtener la información de la tienda principal (ID = 1)
    const fetchStoreContactInfo = async () => {
      try {
        console.log(`Haciendo solicitud para la información de la tienda principal con ID: 1`);
        const response = await axios.get('http://localhost:3001/api/info-empresa/1'); // Endpoint para obtener la información de la tienda principal
        
        if (response.data && response.data.data) {
          console.log("Información de la tienda principal obtenida:", response.data.data);
          setStoreContactInfo(response.data.data); // Almacenar la información de la tienda principal
        } else {
          console.error('No se encontró información para la tienda principal con ID: 1');
        }
      } catch (error) {
        console.error('Error al obtener la información de la tienda principal:', error);
      }
    };
    fetchStoreContactInfo();
  }, []);

  // Función para crear el contenido del QR
  const getQRCodeData = () => {
    const metodoEntrega = JSON.parse(order.metodo_entrega);
    let data = '';

    if (metodoEntrega?.PickUp) {
      const pickUp = metodoEntrega.PickUp;
      data = `PickUp\nCliente: ${pickUp.nombre}\nTeléfono: ${pickUp.telefono}\nFecha y Hora: ${pickUp.fechaYHoraPrometida}\nTicketExpress: ${pickUp.TicketExpress ? 'Sí' : 'No'}`;
    } else if (metodoEntrega?.Delivery) {
      const delivery = metodoEntrega.Delivery;
      data = `Delivery\nCliente: ${delivery.nombre}\nTeléfono: ${delivery.telefono}\nDirección: ${delivery.address}\nFecha y Hora: ${delivery.fechaYHoraPrometida}\nTicketExpress: ${delivery.TicketExpress ? 'Sí' : 'No'}`;
    }

    return data;
  };

  // Establecer el contenido del QR cuando el componente se renderiza
  useEffect(() => {
    setQrData(getQRCodeData());
  }, [order]); // Actualizar cuando cambie la orden

  // Formateamos la fecha y hora usando moment, con zona horaria correcta
  const formattedDate = moment.utc(order.fecha).tz('Europe/Madrid').locale('es').format('dddd, D MMMM YYYY, HH:mm:ss');

  // Extraer el TicketExpress desde el método de entrega
  const metodoEntrega = JSON.parse(order.metodo_entrega);
  const isTicketExpress = metodoEntrega?.PickUp?.TicketExpress || metodoEntrega?.Delivery?.TicketExpress || false;
  
  // Obtener los IDs de los incentivos
  const incentivos = order.incentivos ? JSON.parse(order.incentivos) : [];
  const incentivosIds = Array.isArray(incentivos) && incentivos.length > 0 
    ? incentivos.map(inc => inc.id).join(', ') 
    : 'No'; // Mostrar "No" si no hay incentivos

  return (
    <div className="ticket">
      <div className="timestamp">
        <div className="day-and-date">
          <p>{moment(order.fecha).locale('es').format('ddd')}</p>
          <p>{moment(order.fecha).locale('es').format('DD/MM/YY')}</p>
        </div>
        <p>Hr: {order.hora}</p> 
        <p>ID: {order.id_cliente}</p>
      </div>
  
      <div className="details">
        <h3>Detalles de tu compra:</h3>
        <ul>
          {productos.length > 0 ? (
            productos.map((producto, index) => {
              const pizza = pizzas.find(p => p.id === Number(producto.id_pizza));
              const customPizzaNames = {
                101: 'PP1',
                102: 'PP2',
                103: 'PP3',
              };
              let nombrePizza = 'Desconocida';
              if (pizza) {
                nombrePizza = pizza.nombre;
              } else if (customPizzaNames[producto.id_pizza]) {
                nombrePizza = customPizzaNames[producto.id_pizza];
              }

              // Verificar si es una pizza mitad y mitad
              if (producto.id_pizza === 102 && producto.halfAndHalf) {
                return (
                  <li key={index} className="producto-item">
                    Cant: {producto.cantidad} / Size: {producto.size}
                    <br />
                    Pizza: {nombrePizza} 
                    <ul>
                      <li>Mitad: {producto.halfAndHalf.izquierda.nombre} </li>
                      <li>Mitad: {producto.halfAndHalf.derecha.nombre} </li>
                    </ul>
                  </li>
                );
              }

              // Caso general para otras pizzas
              return (
                <li key={index} className="producto-item">
                  Cant: {producto.cantidad} / Size: {producto.size}
                  <br />
                  Pizza: {pizza ? `${pizza.nombre}` : nombrePizza}
                  {producto.extraIngredients && producto.extraIngredients.length > 0 && (
                    <ul>
                      {producto.extraIngredients.map((ing, idx) => (
                        <li key={idx}>+IE: {ing.nombre}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })
          ) : (
            <li>No hay productos en esta orden.</li>
          )}
        </ul>
        <p>Total a Pagar: {parseFloat(order.total_con_descuentos).toFixed(2)}€</p>
      </div>

      <div className="qr-code">
        <p>Order Track <br /> 
          ({order.id_order})</p>
        <p><strong>{metodoEntrega?.PickUp ? 'PICKUP' : 'DELIVERY'}</strong></p>
        <QRCode value={qrData} size={128} />
      </div>

      <div className="express-info">
        <p>TExpress:  <br />{isTicketExpress ? 'Sí' : 'No'}</p>
        <p>Incentivos:  <br /> {incentivosIds}</p>
      </div>
      
      <p>Observaciones: <br />{order.observaciones || 'Ninguna'}</p>

      <div className="company-info">
        <img src={voltaLogo} alt="Volta Logo" />
        <p className="company-info2">Contactos</p>
        {storeContactInfo ? (
          <>
            {/* <p>Dirección: {storeContactInfo.direccion || 'No disponible'}</p> */}
            <p>Tlf: {storeContactInfo.telefono_contacto || 'No disponible'}</p>
            <p>{storeContactInfo.correo_contacto || 'No disponible'}</p>
          </>
        ) : (
          <>
            <p>Dirección: No disponible</p>
            <p>Tlf: No disponible</p>
            <p>Correo: No disponible</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Ticket;
