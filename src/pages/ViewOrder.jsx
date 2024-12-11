import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Ticket from './Ticket'; // Asegúrate de importar el componente Ticket
import '../styles/ViewOrder.css';  // Asegúrate de crear este archivo de estilos

const ViewOrder = () => {
  const [orders, setOrders] = useState([]);
  const [pizzas, setPizzas] = useState([]); // Para almacenar los nombres de las pizzas
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [locations, setLocations] = useState([]); // Para almacenar las ubicaciones extraídas de las órdenes
  const [selectedLocation, setSelectedLocation] = useState(''); // Ubicación seleccionada para filtrar

  // Obtener las órdenes y extraer las ubicaciones
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get('http://localhost:3001/registro_ventas');
        if (Array.isArray(response.data.data)) {
          const pendingOrders = response.data.data.filter(order => order.venta_procesada === 0);
          setOrders(pendingOrders);
          
          // Extraer ubicaciones de las órdenes
          const extractedLocations = new Set(); // Usamos un Set para evitar duplicados
          pendingOrders.forEach(order => {
            const metodoEntrega = JSON.parse(order.metodo_entrega);
            let nombreEmpresa = '';

            if (metodoEntrega.PickUp && metodoEntrega.PickUp.puntoRecogida && metodoEntrega.PickUp.puntoRecogida.nombre_empresa) {
              nombreEmpresa = metodoEntrega.PickUp.puntoRecogida.nombre_empresa;
            } else if (metodoEntrega.Delivery && metodoEntrega.Delivery.tiendaSalida && metodoEntrega.Delivery.tiendaSalida.nombre_empresa) {
              nombreEmpresa = metodoEntrega.Delivery.tiendaSalida.nombre_empresa;
            }

            if (nombreEmpresa) {
              extractedLocations.add(nombreEmpresa);
            }
          });

          setLocations([...extractedLocations]); // Convertimos el Set en un array y lo guardamos en el estado
        } else {
          console.error('La respuesta no es un array:', response.data);
        }
      } catch (error) {
        console.error('Error al obtener las órdenes:', error);
      }
    };

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

    fetchOrders();
    fetchPizzas();
  }, []);

  // Función para marcar una venta como procesada
  const markOrderAsProcessed = async (id_venta) => {
    try {
      await axios.patch(`http://localhost:3001/registro_ventas/${id_venta}/procesar`);
      setOrders(orders.filter(order => order.id_venta !== id_venta));
      alert('Orden marcada como completada.');
    } catch (error) {
      console.error('Error al procesar la orden:', error);
      alert('Hubo un error al procesar la orden.');
    }
  };

  // Función para mostrar el modal con el ticket
  const showTicketModal = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  // Función para cerrar el modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  // Ordenar las órdenes, primero los Ticket Express
  const sortedOrders = orders.sort((a, b) => {
    const metodoEntregaA = JSON.parse(a.metodo_entrega);
    const metodoEntregaB = JSON.parse(b.metodo_entrega);
    
    const isTicketExpressA = metodoEntregaA.PickUp?.TicketExpress || metodoEntregaA.Delivery?.TicketExpress;
    const isTicketExpressB = metodoEntregaB.PickUp?.TicketExpress || metodoEntregaB.Delivery?.TicketExpress;
    
    return isTicketExpressB - isTicketExpressA; // Primero los express
  });

  // Filtrar las órdenes por la ubicación seleccionada
  const filteredOrders = selectedLocation
    ? sortedOrders.filter(order => {
        const metodoEntrega = JSON.parse(order.metodo_entrega);
        let nombreEmpresa = '';

        if (metodoEntrega.PickUp && metodoEntrega.PickUp.puntoRecogida && metodoEntrega.PickUp.puntoRecogida.nombre_empresa) {
          nombreEmpresa = metodoEntrega.PickUp.puntoRecogida.nombre_empresa;
        } else if (metodoEntrega.Delivery && metodoEntrega.Delivery.tiendaSalida && metodoEntrega.Delivery.tiendaSalida.nombre_empresa) {
          nombreEmpresa = metodoEntrega.Delivery.tiendaSalida.nombre_empresa;
        }

        return nombreEmpresa === selectedLocation;
      })
    : sortedOrders;

  return (
    <div>
      <h2>Pending Orders</h2>

      {/* Selector de ubicación para filtrar las órdenes */}
      <div className="filter-container">
        <label htmlFor="location-filter">Filtrar por ubicación: </label>
        <select
          id="location-filter"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          <option value="">Todas las ubicaciones</option>
          {locations.map((location, index) => (
            <option key={index} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <p>No hay órdenes pendientes para la ubicación seleccionada.</p>
      ) : (
        <div className="table-container"> 
          <table>
            <thead>
              <tr>
                <th>ID Orden</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Productos</th>
                <th>Total</th>
                <th>TicketExpress</th>
                <th>Incentivos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const productos = JSON.parse(order.productos); 
                const metodoEntrega = JSON.parse(order.metodo_entrega);
                const isPickup = metodoEntrega.PickUp; // Verificar si existe Pickup
                const isDelivery = metodoEntrega.Delivery; // Verificar si existe Delivery
                const isTicketExpress = isPickup ? metodoEntrega.PickUp.TicketExpress : (isDelivery ? metodoEntrega.Delivery.TicketExpress : false); 
                const fechaYHoraPrometida = isPickup 
                  ? metodoEntrega.PickUp.fechaYHoraPrometida 
                  : isDelivery 
                  ? metodoEntrega.Delivery.fechaYHoraPrometida 
                  : 'N/A';  // Obtén la fecha y hora prometida para Delivery también
                const metodo = isPickup ? 'Pickup' : 'Delivery'; // Determina el método de entrega
             
                // Convertir la cadena de incentivos a un array
                const incentivos = order.incentivos ? JSON.parse(order.incentivos) : [];

                // Obtener los IDs de los incentivos
                const incentivosIds = Array.isArray(incentivos) && incentivos.length > 0 
                  ? incentivos.map(inc => inc.id).join(', ') 
                  : 'No'; // Mostrar "No" si no hay incentivos
            
                return (
                  <tr key={order.id_venta}>
                    <td>{order.id_venta}</td>
                    <td>{new Date(order.fecha).toLocaleDateString('es-ES')}</td>
                    <td>{order.hora}</td>
                    <td>{`${order.id_cliente} - (${fechaYHoraPrometida}) - ${metodo}`}</td> {/* Mostrar id_cliente, hora de recogida y método de entrega */}
                    <td>
                      <ul>
                        {productos.map((producto) => {
                          const pizza = pizzas.find(p => p.id === Number(producto.id_pizza));
                          return (
                            <li key={producto.id_pizza}>
                              Cant: {producto.cantidad}, Size: {producto.size}, Nombre: {pizza ? pizza.nombre : 'Desconocida'} ({producto.price}€)
                              {producto.extraIngredients && producto.extraIngredients.length > 0 && (
                                <ul>
                                  {producto.extraIngredients.map((extra, idx) => (
                                    <li key={idx}>+IE: {extra.nombre} ({extra.precio}€)</li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td>{parseFloat(order.total_con_descuentos).toFixed(2)}€</td>
                    <td>{isTicketExpress ? 'Sí' : 'No'}</td> 
                    <td>{incentivosIds}</td> {/* Muestra los ID de incentivos si existen */}
                    <td>
                      <button onClick={() => markOrderAsProcessed(order.id_venta)}>Ready</button>
                      <button onClick={() => showTicketModal(order)}>Print</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para visualizar el ticket */}
      {showModal && selectedOrder && (
        <div className="modal">
          <div className="modal-content">
            <Ticket order={selectedOrder} />
            <button onClick={() => window.print()}>Imprimir</button>
            <button onClick={closeModal}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewOrder;
