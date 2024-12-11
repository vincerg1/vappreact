// SidePanel.js
import React from 'react';
import { differenceInDays, parseISO } from 'date-fns';

const SidePanel = ({ data, onClose, onViewDetails }) => {
  console.log(data)
  const calcularDiasRestantes = (fechaCaducidad) => {
    const fechaActual = new Date(); // Fecha actual
    const fechaCaducidadParsed = parseISO(fechaCaducidad); // Convertir la fechaCaducidad a un objeto Date
    const diferenciaDias = differenceInDays(fechaCaducidadParsed, fechaActual); // Calcular la diferencia en días
    return diferenciaDias;
  };
    return (
      <div className={`side-panel ${data.length > 0 ? 'visible' : ''}`}>

        {/* Título h2 que solo se muestra cuando data tiene elementos */}
        {data.length > 0 && (
          <h2 className="side-panel-title">Detalles del Inventario</h2>
        )}

        {/* Resto del contenido del panel */}
        {data.length > 0 ? (
          data.map((item, index) => (
            <div key={index} className='SBtext'>
              {/* Contenido del ingrediente */}
              {item.producto} /  
               {item.disponible} grs /   
               {calcularDiasRestantes(item.fechaCaducidad)} (days) /
              R{item.referencia}
            </div>
          )) 
        ) : (
          <p className='SBtext'>No hay ingredientes para mostrar.</p>
        )}
        
        <section className='SPbutton'>
          <button onClick={onClose} className='close-button'>Cerrar</button>
          <button onClick={onViewDetails} className='close-button'>Ver Más Detalles</button>
        </section>
      </div>
    );
};

export default SidePanel;
