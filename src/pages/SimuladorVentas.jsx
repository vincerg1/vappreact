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
      console.log('Clientes obtenidos:', response.data);
      if (!Array.isArray(response.data)) {
        throw new Error('La respuesta de clientes no es un array');
      }
      const clientesConId = response.data.filter(cliente => cliente.id_cliente !== undefined);
      setClientes(clientesConId);
    } catch (error) {
      console.error('Error fetching clientes', error);
    }
  };

  // Definir perfiles de clientes con diferentes frecuencias de compra
  const perfilesClientes = {
    frecuente: { minDias: 3, maxDias: 7 },
    moderado: { minDias: 8, maxDias: 15 },
    ocasional: { minDias: 16, maxDias: 45 },
    esporádico: { minDias: 46, maxDias: 180 },
  };

  const asignarPerfilCliente = () => {
    const rand = Math.random();
    if (rand < 0.3) return 'frecuente';
    if (rand < 0.6) return 'moderado';
    if (rand < 0.85) return 'ocasional';
    return 'esporádico';
  };

  // Generar fechas más realistas según el perfil del cliente
  const generarFechaCompra = (perfil) => {
    const hoy = new Date();
    const { minDias, maxDias } = perfilesClientes[perfil];
    const rangoDias = maxDias - minDias;
    const dias = Math.floor(minDias + Math.random() * rangoDias);
    const fechaCompra = new Date(hoy.getTime() - dias * 24 * 60 * 60 * 1000);
    return fechaCompra.toISOString().split('T')[0];
  };

  const generarHoraAleatoriaMilitar = () => {
    const horaAleatoria = Math.floor(Math.random() * 6) + 18;
    const minutosAleatorios = Math.floor(Math.random() * 60);
    return `${horaAleatoria.toString().padStart(2, '0')}:${minutosAleatorios.toString().padStart(2, '0')}:00`;
  };

  const simularVentas = () => {
    if (clientes.length === 0) {
      console.error('No hay clientes disponibles.');
      return;
    }

    let nuevasVentasSimuladas = [];
    const numeroDeVentas = 200;

    const pizzasEjemplo = [
      { id: 1, name: 'Margherita', PriceBySize: '{"S": 6, "M": 8, "L": 10}' },
      { id: 2, name: 'Pepperoni', PriceBySize: '{"S": 7, "M": 9, "L": 11}' },
      { id: 3, name: 'Hawaiian', PriceBySize: '{"S": 8, "M": 10, "L": 12}' },
      { id: 4, name: 'Veggie', PriceBySize: '{"S": 6, "M": 8, "L": 10}' },
    ];

    for (let i = 0; i < numeroDeVentas; i++) {
      const clienteAleatorio = clientes[Math.floor(Math.random() * clientes.length)];
      if (!clienteAleatorio?.id_cliente) continue;

      const perfilCliente = asignarPerfilCliente();
      const fechaVenta = generarFechaCompra(perfilCliente);

      const pizzaAleatoria = pizzasEjemplo[Math.floor(Math.random() * pizzasEjemplo.length)];
      if (!pizzaAleatoria?.PriceBySize) continue;

      const sizeKeys = Object.keys(JSON.parse(pizzaAleatoria.PriceBySize));
      const sizeAleatorio = sizeKeys[Math.floor(Math.random() * sizeKeys.length)];
      const precioBase = parseFloat(JSON.parse(pizzaAleatoria.PriceBySize)[sizeAleatorio]);

      const cantidad = Math.floor(Math.random() * 5) + 1;
      const esFinDeSemana = [5, 6].includes(new Date(fechaVenta).getDay());
      const precioFinal = precioBase * cantidad * (esFinDeSemana ? 1.4 : 1);

      const venta = {
        id_cliente: clienteAleatorio.id_cliente,
        id_pizza: pizzaAleatoria.id,
        cantidad,
        size: sizeAleatorio,
        price: precioBase,
        fecha: fechaVenta,
        hora: generarHoraAleatoriaMilitar(),
        metodo_pago: 'Efectivo',
        totalPagado: precioFinal,
      };

      nuevasVentasSimuladas.push(venta);
    }

    console.log('Ventas generadas:', nuevasVentasSimuladas);
    setVentasSimuladas(nuevasVentasSimuladas);
  };

  const subirVentas = async () => {
    if (ventasSimuladas.length === 0) {
      console.error('No hay ventas para subir.');
      return;
    }

    try {
      console.log('Ventas a enviar:', JSON.stringify(ventasSimuladas, null, 2));

      const response = await axios.post('http://localhost:3001/registro_ventas/bulk', ventasSimuladas, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Respuesta del servidor:', response.data);
    } catch (error) {
      console.error('Error al subir las ventas simuladas:', error.response?.data || error.message);
    }
  };

  return (
    <div>
      <h2>Simulador de Ventas</h2>
      <button onClick={simularVentas}>Generar Ventas</button>
      <button onClick={subirVentas}>Subir Ventas a la Base de Datos</button>
    </div>
  );
}
