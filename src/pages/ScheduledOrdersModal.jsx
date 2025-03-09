// ScheduledOrdersModal.jsx
import React from 'react';
import moment from 'moment';

const ScheduledOrdersModal = ({ orders, onClose }) => {
    return (
      <div className="modal-overlay">
        <div className="modal-content scheduled-orders-modal">
          <h2>📅 Pedidos Programados para Hoy</h2>
          {orders.length === 0 ? (
            <p>No hay pedidos programados para hoy.</p>
          ) : (
            orders.map((order) => {
              const metodoEntrega = JSON.parse(order.metodo_entrega || '{}');
              const fechaPrometida =
                metodoEntrega.Delivery?.fechaYHoraPrometida ||
                metodoEntrega.PickUp?.fechaYHoraPrometida ||
                'Sin fecha/hora';
  
              return (
                <div key={order.id_order} style={{ marginBottom: '1rem' }}>
                  <p><strong>Orden:</strong> {order.id_order}</p>
                  <p><strong>Cliente:</strong> {order.id_cliente}</p>
                  <p>
                    <strong>Fecha/Hora Prometida:</strong> {fechaPrometida}
                  </p>
                </div>
              );
            })
          )}
          <button className="btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    );
  };
  
  export default ScheduledOrdersModal;
