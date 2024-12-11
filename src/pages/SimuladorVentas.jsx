import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function SimuladorVentas() {
  const [ventasSimuladas, setVentasSimuladas] = useState([]);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const response = await axios.get('http://localhost:3001/clientes');
      console.log('Clientes obtenidos:', response.data); // Verificar los datos recibidos
      if (!Array.isArray(response.data)) {
        throw new Error('La respuesta de clientes no es un array');
      }
      // Verificar que todos los clientes tengan la propiedad id_cliente
      const clientesConId = response.data.filter(cliente => cliente.id_cliente !== undefined);
      console.log('Clientes con id_cliente:', clientesConId);
      setClientes(clientesConId);
    } catch (error) {
      console.error('Error fetching clientes', error);
    }
  };

  const generarFechaAleatoria = () => {
    const hoy = new Date();
    const treintaDias = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos
    const fechaAleatoria = new Date(hoy.getTime() - Math.random() * treintaDias);
    return fechaAleatoria;
  };

  function generarHoraAleatoriaMilitar() {
    const horaAleatoria = Math.floor(Math.random() * 6) + 18;
    const minutosAleatorios = Math.floor(Math.random() * 60);
    const segundosAleatorios = Math.floor(Math.random() * 60);
    const horaStr = horaAleatoria.toString().padStart(2, '0');
    const minutosStr = minutosAleatorios.toString().padStart(2, '0');
    const segundosStr = segundosAleatorios.toString().padStart(2, '0');
    const tiempo = `${horaStr}:${minutosStr}:${segundosStr}`;
    return tiempo;
  }

  const simularVentas = () => {
    if (clientes.length === 0) {
      console.error('No hay clientes disponibles.');
      return;
    }

    let nuevasVentasSimuladas = [];
    const numeroDeVentas = 1; // Ajustado para 5 ventas

    const pizzasEjemplo = [
      { id: 1, name: 'Margherita', PriceBySize: '{"S": 6, "M": 8, "L": 10}' },
      { id: 2, name: 'Pepperoni', PriceBySize: '{"S": 7, "M": 9, "L": 11}' },
      { id: 3, name: 'Hawaiian', PriceBySize: '{"S": 8, "M": 10, "L": 12}' },
      { id: 4, name: 'Veggie', PriceBySize: '{"S": 6, "M": 8, "L": 10}' },
    ];

    for (let i = 0; i < numeroDeVentas; i++) {
      const clienteAleatorio = clientes[Math.floor(Math.random() * clientes.length)];

      // Verificar que el cliente tiene la propiedad id_cliente
      if (!clienteAleatorio.id_cliente) {
        console.error('Cliente sin id_cliente:', clienteAleatorio);
        continue;
      }

      const pizzaAleatoria = pizzasEjemplo[Math.floor(Math.random() * pizzasEjemplo.length)];

      if (!pizzaAleatoria || !pizzaAleatoria.PriceBySize) {
        console.error('Pizza aleatoria no válida o no tiene PriceBySize:', pizzaAleatoria);
        continue;
      }

      const sizeKeys = Object.keys(JSON.parse(pizzaAleatoria.PriceBySize));
      const sizeAleatorio = sizeKeys[Math.floor(Math.random() * sizeKeys.length)];
      const precioBase = parseFloat(JSON.parse(pizzaAleatoria.PriceBySize)[sizeAleatorio]);
      const cantidad = Math.floor(Math.random() * 5) + 1; // Cantidad aleatoria entre 1 y 5
      const fechaVenta = generarFechaAleatoria();
      const esFinDeSemana = [5, 6].includes(fechaVenta.getDay());
      const precioFinal = precioBase * cantidad * (esFinDeSemana ? 1.4 : 1);

      const venta = {
        id_cliente: clienteAleatorio.id_cliente,
        id_pizza: pizzaAleatoria.id,
        cantidad: cantidad,
        size: sizeAleatorio,
        price: precioBase,
        fecha: fechaVenta.toISOString().split('T')[0],
        hora: generarHoraAleatoriaMilitar(),
        metodo_pago: 'Efectivo',
        totalPagado: precioFinal,
      };

      nuevasVentasSimuladas.push(venta);
    }

    console.log(nuevasVentasSimuladas);
    setVentasSimuladas(nuevasVentasSimuladas);
  };

  const subirVentas = async () => {
    if (ventasSimuladas.length === 0) {
      console.error('No hay ventas para subir.');
      return;
    }
    try {
      const response = await axios.post('http://localhost:3001/registro_ventas', ventasSimuladas);
      console.log('Respuesta del servidor:', response.data);
    } catch (error) {
      console.error('Error al subir las ventas simuladas', error);
    }
  };

  return (
    <div>
      <h2>Simulador de Ventas</h2>
      <button onClick={simularVentas}>Generar Ventas</button>
      <button onClick={subirVentas}>
        Subir Ventas a la Base de Datos
      </button>
    </div>
  );
}
