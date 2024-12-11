import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ActualizarHistorialCliente = ({ id_cliente, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const actualizarHistorial = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Obtener todas las compras del cliente desde la tabla de registro_ventas
        const comprasResponse = await axios.get(`http://localhost:3001/registro_ventas/cliente/${id_cliente}`);
        const compras = comprasResponse.data.data;

        if (!compras || compras.length === 0) {
          setError("No se encontraron compras para este cliente.");
          setIsLoading(false);
          return;
        }

        // Paso 1: Calcular número de compras, monto total, ticket promedio, etc.
        const numeroDeCompras = compras.length;
        const MontoTotalCompras = compras.reduce((total, compra) => total + parseFloat(compra.totalPagado), 0);
        const ticketPromedio = MontoTotalCompras / numeroDeCompras;

        // Paso 2: Obtener la pizza más comprada (id y tamaño)
        const pizzasCompradas = compras.reduce((acc, compra) => {
          const key = `${compra.id_pizza}-${compra.size}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const pizzaMasComprada = Object.keys(pizzasCompradas).reduce((a, b) => pizzasCompradas[a] > pizzasCompradas[b] ? a : b);
        const [id_pizzaMasComprada, size_pizzaMasComprada] = pizzaMasComprada.split('-');
        const precio_pizzaMasComprada = compras.find(compra => compra.id_pizza == id_pizzaMasComprada && compra.size == size_pizzaMasComprada).price;

        // Paso 3: Calcular el día más comprado (número de 0 a 6)
        const diasDeLaSemana = compras.reduce((acc, compra) => {
          const dia = new Date(compra.fecha).getDay(); // Día de la semana 0-6
          acc[dia] = (acc[dia] || 0) + 1;
          return acc;
        }, {});
        const diaMasComprado = Object.keys(diasDeLaSemana).reduce((a, b) => diasDeLaSemana[a] > diasDeLaSemana[b] ? a : b);

        // Paso 4: Calcular el día del mes más comprado (número de 1 a 31)
        const diasDelMes = compras.reduce((acc, compra) => {
          const diaMes = new Date(compra.fecha).getDate(); // Día del mes 1-31
          acc[diaMes] = (acc[diaMes] || 0) + 1;
          return acc;
        }, {});
        const diaDelMesMasComprado = Object.keys(diasDelMes).reduce((a, b) => diasDelMes[a] > diasDelMes[b] ? a : b);

        // Paso 5: Calcular la hora más comprada
        const horasCompradas = compras.reduce((acc, compra) => {
          const hora = new Date(`${compra.fecha}T${compra.hora}`).getHours(); // Hora en formato 24h
          acc[hora] = (acc[hora] || 0) + 1;
          return acc;
        }, {});
        const horaMasComprada = Object.keys(horasCompradas).reduce((a, b) => horasCompradas[a] > horasCompradas[b] ? a : b);

        // Paso 6: Actualizar la tabla HistorialCliente en el servidor
        const updateResponse = await axios.post('http://localhost:3001/historial_cliente/actualizar', {
          id_cliente,
          numeroDeCompras,
          MontoTotalCompras,
          ticketPromedio,
          id_pizzaMasComprada,
          size_pizzaMasComprada,
          precio_pizzaMasComprada,
          diaMasComprado,
          diaDelMesMasComprado,
          horaMasComprada
        });

        console.log('Historial actualizado:', updateResponse.data);
        setIsLoading(false);
        onUpdate(); // Notificar al componente padre si se necesita.
      } catch (err) {
        console.error('Error al actualizar el historial del cliente', err);
        setError('Error al actualizar el historial del cliente.');
        setIsLoading(false);
      }
    };

    // Ejecutar la actualización del historial cuando el componente se monta
    actualizarHistorial();
  }, [id_cliente, onUpdate]);

  if (isLoading) {
    return <div>Actualizando historial del cliente...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>Historial del cliente actualizado correctamente.</div>;
};

export default ActualizarHistorialCliente;
