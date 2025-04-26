import React, { useState, useEffect, useContext } from 'react';
import { _PizzaContext } from './_PizzaContext';
import axios from 'axios';
import Ticket from './Ticket'; 
import moment from 'moment';
import '../styles/ViewOrder.css'; 

const ViewOrder = () => {
  const { sessionData } = useContext(_PizzaContext);
  const [orders, setOrders] = useState([]);
  const [pizzas, setPizzas] = useState([]); 
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(''); 
  const [updateTime, setUpdateTime] = useState(Date.now());

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/registro_ventas`);
        if (Array.isArray(response.data.data)) {
          const pendingOrders = response.data.data.filter(order => order.venta_procesada === 0);
          setOrders(pendingOrders);

          const extractedLocations = new Set();
          pendingOrders.forEach(order => {
            const metodoEntrega = JSON.parse(order.metodo_entrega);
            let nombreEmpresa = '';

            if (metodoEntrega.PickUp?.puntoRecogida?.nombre_empresa) {
              nombreEmpresa = metodoEntrega.PickUp.puntoRecogida.nombre_empresa;
            } else if (metodoEntrega.Delivery?.tiendaSalida?.nombre_empresa) {
              nombreEmpresa = metodoEntrega.Delivery.tiendaSalida.nombre_empresa;
            }

            if (nombreEmpresa) {
              extractedLocations.add(nombreEmpresa);
            }
          });

          setLocations([...extractedLocations]);
        } else {
          console.error('La respuesta no es un array:', response.data);
        }
      } catch (error) {
        console.error('Error al obtener las órdenes:', error);
      }
    };

    const fetchPizzas = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/menu_pizzas`);
        if (Array.isArray(response.data.data)) {
          setPizzas(response.data.data);
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

  useEffect(() => {
    const intervalId = setInterval(() => {
      setUpdateTime(Date.now());
    }, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const markOrderAsProcessed = async (id_venta) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/inventario/descontar`, { id_venta }, { headers: { "Content-Type": "application/json" } });
      alert('Ingredientes descontados correctamente.');

      await axios.patch(`${process.env.REACT_APP_API_URL}/registro_ventas/${id_venta}/procesar`);
      alert('Orden marcada como completada.');

      await axios.post(`${process.env.REACT_APP_API_URL}/notificaciones/pizza_ready`, {
        id_order: id_venta,
        email: sessionData.email
      });
      alert('Correo enviado al cliente notificando que su pizza está lista.');

      await axios.patch(`${process.env.REACT_APP_API_URL}/api/update-pedidos-en-cola`);
      alert('Pedidos en cola actualizados correctamente.');

      setOrders((prev) => prev.filter((order) => order.id_venta !== id_venta));

    } catch (error) {
      console.error('Error en la actualización:', error);
      alert('Hubo un error al procesar la orden o al actualizar los pedidos en cola.');
    }
  };

  const showTicketModal = (order) => {
    const partners = order.partners && order.partners !== 'null' ? JSON.parse(order.partners) : [];
    setSelectedOrder({ ...order, partners });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const sortedOrders = orders.sort((a, b) => {
    const metodoEntregaA = JSON.parse(a.metodo_entrega);
    const metodoEntregaB = JSON.parse(b.metodo_entrega);

    const isTicketExpressA = metodoEntregaA.PickUp?.TicketExpress || metodoEntregaA.Delivery?.TicketExpress;
    const isTicketExpressB = metodoEntregaB.PickUp?.TicketExpress || metodoEntregaB.Delivery?.TicketExpress;

    return isTicketExpressB - isTicketExpressA;
  });

  const filteredOrders = selectedLocation
    ? sortedOrders.filter(order => {
        const metodoEntrega = JSON.parse(order.metodo_entrega);
        const nombreEmpresa = metodoEntrega.PickUp?.puntoRecogida?.nombre_empresa || metodoEntrega.Delivery?.tiendaSalida?.nombre_empresa;
        return nombreEmpresa === selectedLocation;
      })
    : sortedOrders;

  return (
    <div>
      <h2>Pending Orders</h2>

      {filteredOrders.length > 0 && (
        <div className="filter-container2">
          <select id="location-filter" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
            <option value="">Todas las ubicaciones</option>
            {locations.map((location, index) => (
              <option key={index} value={location}>{location}</option>
            ))}
          </select>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "10rem" }}>
          <div style={{ fontSize: "80px" }}>🐒</div>
          <p>No hay órdenes pendientes...! </p>
        </div>
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
                <th>Partners</th>
                <th>Total</th>
                <th>TicketExpress</th>
                <th>Programado</th>
                <th>Incentivos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const productos = JSON.parse(order.productos);
                const partners = order.partners && order.partners !== 'null' ? JSON.parse(order.partners) : [];
                const metodoEntrega = JSON.parse(order.metodo_entrega);
                const isPickup = metodoEntrega.PickUp;
                const isDelivery = metodoEntrega.Delivery;
                const isTicketExpress = isPickup ? metodoEntrega.PickUp.TicketExpress : (isDelivery ? metodoEntrega.Delivery.TicketExpress : false);
                const fechaYHoraPrometida = isPickup ? metodoEntrega.PickUp.fechaYHoraPrometida : isDelivery ? metodoEntrega.Delivery.fechaYHoraPrometida : 'N/A';
                const metodo = isPickup ? 'Pickup' : 'Delivery';

                const incentivos = order.incentivos ? JSON.parse(order.incentivos) : [];
                const incentivosIds = Array.isArray(incentivos) && incentivos.length > 0 ? incentivos.map(inc => inc.id).join(', ') : 'No';

                const isScheduled = (order.is_scheduled_order === 1);
                let canProcess = true;
                if (isScheduled && fechaYHoraPrometida !== 'N/A') {
                  const diffInMinutes = moment(fechaYHoraPrometida, 'YYYY-MM-DD HH:mm').diff(moment(updateTime), 'minutes');
                  canProcess = (diffInMinutes <= 60);
                }

                return (
                  <tr key={order.id_venta}>
                    <td>{order.id_venta}</td>
                    <td>{new Date(order.fecha).toLocaleDateString('es-ES')}</td>
                    <td>{order.hora}</td>
                    <td>{`${order.id_cliente} - (${fechaYHoraPrometida}) - ${metodo}`}</td>
                    <td>
                      <ul>
                        {productos.map((producto) => {
                          const pizza = pizzas.find(p => p.id === Number(producto.id_pizza));
                          const customPizzaNames = { 101: 'PP1', 102: 'PP2', 103: 'PP3' };
                          const nombrePizza = pizza ? pizza.nombre : customPizzaNames[producto.id_pizza] || 'Desconocida';

                          if (producto.id_pizza === 102 && producto.halfAndHalf) {
                            return (
                              <li key={producto.id_pizza}>
                                Cant: {producto.cantidad}, Size: {producto.size}, Nombre: {nombrePizza}
                                <ul>
                                  <li>Mitad Izquierda: {producto.halfAndHalf.izquierda.nombre}</li>
                                  <li>Mitad Derecha: {producto.halfAndHalf.derecha.nombre}</li>
                                </ul>
                              </li>
                            );
                          }

                          return (
                            <li key={producto.id_pizza}>
                              Cant: {producto.cantidad}, Size: {producto.size}, Nombre: {nombrePizza}
                              {producto.extraIngredients && producto.extraIngredients.length > 0 && (
                                <ul>
                                  {producto.extraIngredients.map((extra, idx) => (
                                    <li key={idx}>
                                      +IE: {extra.nombre} ({extra.precio.toFixed(2)}€)
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td>
                      {partners.length > 0 ? (
                        <ul>
                          {partners.map((p, idx) => (
                            <li key={idx}>Cant: {p.cantidad}, Nombre: {p.producto}</li>
                          ))}
                        </ul>
                      ) : 'No'}
                    </td>
                    <td>{parseFloat(order.total_con_descuentos).toFixed(2)}€</td>
                    <td>{isTicketExpress ? 'Sí' : 'No'}</td>
                    <td>{order.is_scheduled_order === 1 ? 'Sí' : 'No'}</td>
                    <td>{incentivosIds}</td>
                    <td className="table-container-button">
                      <button onClick={() => markOrderAsProcessed(order.id_venta)} disabled={!canProcess}>Ready</button>
                      <button onClick={() => showTicketModal(order)}>Print</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedOrder && (
        <div className="order-modal">
          <div className="order-modal-content">
            <Ticket order={selectedOrder} partners={selectedOrder.partners || []} />
            <button onClick={() => window.print()}>Imprimir</button>
            <button onClick={closeModal}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewOrder;
