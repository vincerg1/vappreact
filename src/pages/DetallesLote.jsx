import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/OrderNow.css';

const DetallesLote = () => {
    const [lotes, setLotes] = useState([]);
    
// ... (El resto del código del componente permanece igual)

useEffect(() => {
  const fetchLotes = async () => {
    try {
      const result = await axios.get('http://localhost:3001/inventario');
      if (Array.isArray(result.data.data)) {
        // Mapea sobre los lotes y verifica la existencia de cada uno
        const lotesPromesas = result.data.data
          .filter(lote => lote.categoria === "Ingredientes")
          .map(async lote => ({
            ...lote,
            IDing: generarIDI(lote.producto),
            TiempoUso: calcularTiempoUso(lote.fechaCaducidad),
            existe: await verificarExistencia(lote.id), // Aquí debes pasar lote.id no lote
            InventarioID: lote.id,
          }));

        // Espera a que todas las promesas se resuelvan
        const lotesConExistencia = await Promise.all(lotesPromesas);

        // Después de tener la existencia, calcula el porcentaje XLote
        const lotesConPorcentaje = calcularPorcentajesXLote(lotesConExistencia);

        // Actualiza el estado con los lotes procesados
        setLotes(lotesConPorcentaje);
      }
    } catch (error) {
      console.error("Error al obtener los datos de lotes", error);
    }
  };

  fetchLotes();
}, []);




    const generarHash = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash; // Convertir a un número de 32 bits
        }
        return hash;
    };
    const generarIDI = (nombreProducto) => {
        // Limpiar el nombre del producto (quitar espacios, convertir a mayúsculas, etc.)
        const nombreLimpio = nombreProducto.replace(/\s+/g, '').toUpperCase();
        // Generar un hash del nombre limpio del producto.
        const hash = generarHash(nombreLimpio);
        // Convertir el hash a una cadena en base 36 y tomar los últimos 4 dígitos.
        const IDI = Math.abs(hash).toString(36).substr(-5).toUpperCase();
        return IDI;
    };
    const calcularTiempoUso = (fechaCaducidad) => {
        const ahora = new Date();
        const caducidad = new Date(fechaCaducidad);
        const diferenciaEnMilisegundos = caducidad - ahora;
        const diferenciaEnDias = diferenciaEnMilisegundos / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.floor(diferenciaEnDias)); // Retorna 0 si la fecha ya pasó
    };
    const calcularPorcentajesXLote = (lotes) => {
      // Calcular la suma total de 'Disponible' para cada IDing
      const sumaDisponiblePorIDing = lotes.reduce((suma, lote) => {
        suma[lote.IDing] = (suma[lote.IDing] || 0) + lote.disponible;
        return suma;
      }, {});
    
      // Calcular el %XLote para cada lote
      return lotes.map(lote => {
        const totalDisponible = sumaDisponiblePorIDing[lote.IDing];
        const porcentajeXLote = (lote.disponible / totalDisponible) * 100;
        return {
          ...lote,
          PorcentajeXLote: porcentajeXLote.toFixed(2) // Redondea a 2 decimales
        };
      });
    };
    const postLote = async (lote) => {
      try {
        // Primero verifica si el lote con ese InventarioID ya existe
        const resVerificacion = await axios.get(`http://localhost:3001/DetallesLote/${lote.InventarioID}`);
        if (!resVerificacion.data.existe) {
          // Si no existe, crea el nuevo lote
          const loteParaGuardar = {
            IDing: lote.IDing,
            producto: lote.producto,
            disponible: lote.disponible,
            TiempoUso: lote.TiempoUso,
            PorcentajeXLote: lote.PorcentajeXLote,
            referencia: lote.referencia,
            InventarioID: lote.InventarioID
          };
          const response = await axios.post('http://localhost:3001/DetallesLote', loteParaGuardar);
          console.log('Detalle de lote creado', response.data);
        } else {
          console.log('El lote ya existe y no se creará uno nuevo');
        }
      } catch (error) {
        console.error('Error al crear el detalle de lote', error);
      }
    };
    const actualizarLote = async (lote) => {
      try {
        // Verifica si el lote existe
        const resVerificacion = await axios.get(`http://localhost:3001/DetallesLote/${lote.InventarioID}`);
        if (resVerificacion.data.existe) {
          // Si existe, actualiza el lote
          const datosParaActualizar = {
            IDing: lote.IDing,
            Producto: lote.producto,
            Disponible: lote.disponible,
            TiempoUso: lote.TiempoUso,
            PorcentajeXLote: lote.PorcentajeXLote,
            referencia: lote.referencia
          };
          const response = await axios.put(`http://localhost:3001/DetallesLote/${lote.InventarioID}`, datosParaActualizar);
          console.log('Lote actualizado con éxito', response.data);
        } else {
          console.log('El lote no existe y no se puede actualizar');
        }
      } catch (error) {
        console.error('Error al actualizar el lote', error);
      }
    };
    const guardarTodosLosLotes = async () => {
      const lotesAActualizar = lotes.filter(lote => lote.existe);
      const loteParaGuardar = lotes.filter(lote => !lote.existe);
      
      console.log('Lotes a actualizar:', lotesAActualizar); // Agrega esto para ver qué lotes estás actualizando
      console.log('Lotes nuevos a guardar:', loteParaGuardar); // Agrega esto para ver qué lotes estás guardando
    
      for (const lote of loteParaGuardar) {
        await postLote(lote);
      }
      
      console.log('Lotes actualizados y nuevos lotes guardados.');
    };
    const actualizarLotesExistentes = async () => {
      const lotesAActualizar = lotes.filter(lote => lote.existe);
      console.log('Lotes a actualizar:', lotesAActualizar);
      
      for (const lote of lotesAActualizar) {
        await actualizarLote(lote);
      }
      
      console.log('Todos los lotes existentes han sido actualizados.');
    };
    const verificarExistencia = async (InventarioID) => {
      try {
        const respuesta = await axios.get(`http://localhost:3001/DetallesLote/${InventarioID}`);
        // La API debe devolver un objeto con una propiedad que indique si el lote existe
        return respuesta.data.existe; 
      } catch (error) {
        // Si hay un error en la petición, como un 404, asumimos que el lote no existe
        console.error('Error al verificar la existencia del lote:', error);
        return false;
      }
    };
 
    
    
    

    const renderTable = () => {
        return Array.isArray(lotes) ? lotes.map(lote => {
            return (
                <tr key={lote.id}>
                  
                    <td>{lote.IDI}</td>
                    <td>{lote.producto}</td>
                    <td>{lote.disponible}</td>
                    <td>{lote.TiempoUso}</td>
                    <td>{lote.PorcentajeXLote}</td>
                    <td>{lote.referencia}</td>
                    <td>{lote.id}</td>
                </tr>
            );
        }) : null;
    };

    return (
        <div>
            <h1>Detalles Lote</h1>
            <button onClick={guardarTodosLosLotes}>Guardar Todos Los Lotes</button>
            <button onClick={actualizarLotesExistentes}>Actualizar Lotes Existentes</button>
            <table className='tablaDetallesLote'>
                <thead>
                    <tr> 
                        <th>IDI</th>
                        <th>Producto</th>
                        <th>Disponible</th>
                        <th>Tiempo Uso</th>
                        <th>PorcentajeXLote</th>
                        <th>Referencia</th>
                        <th>InventarioID</th>
                    </tr>
                </thead>
                <tbody>
                    {renderTable()}
                </tbody>
            </table>
        </div>
    );
};

export default DetallesLote;
