import React, { useState } from 'react';
import '../styles/menu.css';


function OrdenActual(
  { orden, 
    actualizarOrden, 
    eliminarItem, 
    startEditing, 
    onBack,
    totalSinDescuentos, 
    totalDescuentos, 
    totalAPagar, 
    oferta
  }) {


    console.log(oferta)
    
    const [deliveryMethod, setDeliveryMethod] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [customPickupTime, setCustomPickupTime] = useState('');
    const [showPickupTimeSelector, setShowPickupTimeSelector] = useState(false);
    const [ofertaSeleccionada, setOfertaSeleccionada] = useState(null);

    const handleDeliveryMethodChange = (e) => {
      setDeliveryMethod(e.target.value);
      if (e.target.value === 'PickUp') {
        setShowPickupTimeSelector(true);
      }
    };
    const handlePickupTimeChange = (e) => {
      setPickupTime(e.target.value);
      // If one of the predefined times is selected, clear the custom time
      if (e.target.value !== 'custom') {
        setCustomPickupTime('');
      }
    };
    const handleCustomPickupTimeChange = (e) => {
      setCustomPickupTime(e.target.value);
      // Clear the predefined time selection when a custom time is entered
      setPickupTime('custom');
    };
    const handleSavePickupTime = () => {
      // Aquí iría la lógica para manejar el guardado del tiempo de recogida.
      // Por ejemplo, podrías enviar esta información a un backend o almacenarla en el estado global de la aplicación.
      setShowPickupTimeSelector(false); // Esto ocultará el selector de tiempo de recogida
    }
    const handleSeleccionarOferta = (oferta) => {
      setOfertaSeleccionada(oferta); // oferta es el objeto con los detalles de la oferta seleccionada
    };

    if (!orden || !Array.isArray(orden.items)) {
    console.error('El objeto de orden no está definido o no tiene la propiedad items.');
    return null; // Aquí podrías retornar un mensaje de error o un componente de carga
    }
    const handleSizeChange = (itemId, newSize) => {
    const itemToUpdate = orden.items.find(item => item.id === itemId);
    if (!itemToUpdate) {
      console.error('No se encontró el ítem con el id:', itemId);
      return;
    }

    const newPrice = itemToUpdate.priceBySize[newSize];
    if (newPrice === undefined) {
      console.error('No se encontró el precio para el tamaño:', newSize);
      return;
    }

    const updatedItem = {
      ...itemToUpdate,
      selectedSize: newSize,
      precio: newPrice
    };
    actualizarOrden(updatedItem);
    };

    const handleUpdate = (item) => {
    startEditing(item);
    };

    const handleDelete = (itemId) => {
    eliminarItem(itemId);
    };


  return (
    <div>
      <h1>Verifica tu Orden</h1>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Size</th>
            <th>Precio</th>
            <th>Ajustes</th>
          </tr>
        </thead>
        <tbody>
          {orden.items.map((item, index) => (
            <tr key={index}>
              <td>{item.nombre}</td>
              <td>{item.cantidad}</td>
              <td>
                {item.tipo === 'pizza' && item.priceBySize ? (
                  <select
                    value={item.selectedSize}
                    onChange={(e) => handleSizeChange(item.id, e.target.value)}
                  >
                    {Object.keys(item.priceBySize).map((size) => (
                      <option key={size} value={size}>
                        {size.toUpperCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  item.size || "N/A"
                )}
              </td>
              <td>{Number(item.precio).toFixed(2)} EUR</td>
              <td>
                <button onClick={() => handleUpdate(item)}>Editar</button>
                <button onClick={() => handleDelete(item.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className='tadescuentos'>
         <h2>Total Antes de Descuentos: {totalSinDescuentos.toFixed(2)} EUR</h2>
      </div>
      <div className='Daplicados' >
      {oferta && (
        <>
          <h2>Oferta Seleccionada: {oferta.nombre} (Código: {oferta.codigo}) <br />
          Descuentos Aplicados: {totalDescuentos.toFixed(2)} EUR</h2>
        </>
      )}
      {!oferta && (
        <h2>No hay descuentos aplicados.</h2>
      )}
    </div>
     <div className='metodo-entrega'>
        <input type="radio" id="delivery" name="entrega" value="Delivery" onChange={handleDeliveryMethodChange} />
        <label htmlFor="delivery">Delivery</label>

        <input type="radio" id="pickup" name="entrega" value="PickUp" onChange={handleDeliveryMethodChange} />
        <label htmlFor="pickup">Pick Up</label>

        {deliveryMethod === 'PickUp' && showPickupTimeSelector && (
          <div className='pickup-time-selector'>
            <h2 htmlFor="pickup-time">Elige tu tiempo de recogida:</h2>
            <select 
              className='pickup-time-selector'
              id="pickup-time"
              value={pickupTime}
              onChange={handlePickupTimeChange}
            >
              <option value="">Selecciona una opción</option>
              <option value="15min">En 15 minutos</option>
              <option value="30min">En 30 minutos</option>
              <option value="45min">En 45 minutos</option>
              <option value="custom">Escoger hora...</option>
            </select>
            {pickupTime === 'custom' && (
              <input 
                type="time" 
                value={customPickupTime} 
                onChange={handleCustomPickupTimeChange} 
              />
            )}
            <button 
              onClick={handleSavePickupTime} 
              className="btn-guardar-tiempo"
            >
              Guardar
            </button>
          </div>
        )}
      </div>
      <div className='totalPagar'>
         <h2>Total a Pagar: {totalAPagar.toFixed(2)} EUR</h2>
      </div>
     
      <button onClick={onBack}>Volver</button>
    <div>
    <button onClick={onBack}>Proceder al Pago</button>
    </div>
    </div>
    
  );
}

export default OrdenActual;
