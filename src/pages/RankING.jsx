import React, { useEffect, useState } from 'react';
import axios from 'axios';

export const useRanking = () => {
  const [ranking, setRanking] = useState([]);

  
  useEffect(() => {
    const obtenerRankingIngredientes = async () => {
      try {
        const respuestaVentas = await axios.get('http://localhost:3001/registro_ventas/');
        const ventas = respuestaVentas.data.data;
        // console.log('Ventas obtenidas para el ranking:', ventas);
  
        const respuestaMenuPizzas = await axios.get('http://localhost:3001/menu_pizzas');
        const menuPizzas = respuestaMenuPizzas.data.data.map(pizza => ({
          ...pizza,
          ingredientes: JSON.parse(pizza.ingredientes)
        }));
        // console.log('Menú de pizzas obtenido para el ranking:', menuPizzas);
  
        const totalesPorIngrediente = {};
  
        ventas.forEach(venta => {
          const pizzaVendida = menuPizzas.find(pizza => pizza.id === venta.id_pizza);
          if (pizzaVendida) {
            pizzaVendida.ingredientes.forEach(ing => {
              const cantidadIngrediente = ing.cantBySize[venta.size] * venta.cantidad;
              if (totalesPorIngrediente[ing.IDI]) {
                totalesPorIngrediente[ing.IDI].cantidad += cantidadIngrediente;
              } else {
                totalesPorIngrediente[ing.IDI] = {
                  cantidad: cantidadIngrediente,
                  nombre: ing.ingrediente
                };
              }
            });
          } else {
            // console.error(`No se encontró la pizza con ID ${venta.id_pizza} en el menú.`);
          }
        });
  
         // console.log('Totales por ingrediente calculados para el ranking:', totalesPorIngrediente);
  
        const rankingArray = Object.entries(totalesPorIngrediente).map(([idi, info]) => ({
          IDI: idi,
          totalVendido: info.cantidad,
          nombre: info.nombre
        })).sort((a, b) => b.totalVendido - a.totalVendido);
  
         // console.log('Ranking de ingredientes calculado:', rankingArray);
  
        setRanking(rankingArray);
      } catch (error) {
        console.error('Error al obtener el ranking de ingredientes:', error);
      }
    };
  
    obtenerRankingIngredientes();
  }, []);
  

    return ranking;
};


