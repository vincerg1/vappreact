import React, { useState, useContext } from 'react';
import _PizzaContext from './_PizzaContext'; // Asegúrate de tener acceso al contexto

const MakeARarePizza = () => {
  const { activePizzas } = useContext(_PizzaContext); // Usamos los ingredientes activos
  const basePizza = ['Salsa Tomate Pizza', 'Mozzarella'];
  const [ingredientesAleatorios, setIngredientesAleatorios] = useState([]);
  const [descuento, setDescuento] = useState(null);
  const [pizzaGenerada, setPizzaGenerada] = useState(false);
  const [generarIntentos, setGenerarIntentos] = useState(0); // Contador para el límite de regeneración

  // Fijamos el método de cocción
  const metodoCoccionFijo = 'Horneado';

  // Función para extraer ingredientes activos y excluir los ingredientes base
  const extraerIngredientesDisponibles = () => {
    const ingredientes = activePizzas.flatMap(pizza => {
      try {
        const parsedIngredientes = JSON.parse(pizza.ingredientes);
        return parsedIngredientes.map(ing => ing.ingrediente);
      } catch (error) {
        console.error("Error al parsear ingredientes:", error);
        return [];
      }
    });
    // Excluir los ingredientes base (Mozzarella y Salsa Tomate Pizza)
    return [...new Set(ingredientes)].filter(ing => !basePizza.includes(ing));
  };

  const ingredientesDisponibles = extraerIngredientesDisponibles();

  // Función para extraer sizes disponibles de las pizzas activas
  const extraerSizesDisponibles = () => {
    const sizes = activePizzas.flatMap(pizza => {
      try {
        const parsedSizes = JSON.parse(pizza.selectSize);
        return parsedSizes;
      } catch (error) {
        console.error("Error al parsear selectSize:", error);
        return [];
      }
    });
    return [...new Set(sizes)]; // Eliminar duplicados
  };

  const sizesDisponibles = extraerSizesDisponibles();

  // Función para generar ingredientes aleatorios
  const generarIngredientesAleatorios = () => {
    const ingredientesSeleccionados = [];
    while (ingredientesSeleccionados.length < 2) {
      const ingredienteAleatorio = ingredientesDisponibles[Math.floor(Math.random() * ingredientesDisponibles.length)];
      if (!ingredientesSeleccionados.includes(ingredienteAleatorio)) {
        ingredientesSeleccionados.push(ingredienteAleatorio);
      }
    }
    return ingredientesSeleccionados;
  };

  // Función para generar un size aleatorio basado en los sizes activos
  const generarSizeAleatorio = () => {
    return sizesDisponibles[Math.floor(Math.random() * sizesDisponibles.length)];
  };

  // Función para generar la pizza
  const handleGeneratePizza = () => {
    if (generarIntentos < 3) {
      const ingredientes = generarIngredientesAleatorios();
      const sizeAleatorio = generarSizeAleatorio();
      const descuentoGenerado = Math.floor(Math.random() * 7) + 1; // Descuento aleatorio entre 1% y 7%
      setIngredientesAleatorios(ingredientes);
      setDescuento(descuentoGenerado);
      setPizzaGenerada({ size: sizeAleatorio });
      setGenerarIntentos(generarIntentos + 1); // Aumentamos el contador de intentos
    }
  };

  // Función para reiniciar la generación (solo si no se han hecho 3 intentos)
  const handleRegenerarPizza = () => {
    if (generarIntentos < 3) {
      handleGeneratePizza();
    }
  };

  return (
    <div className="make-a-rare-pizza">
      <h2>Make A Rare Pizza</h2>

      {!pizzaGenerada ? (
        <>
          <p>Haz clic en el botón para generar tu pizza rara con un descuento especial.</p>
          <button onClick={handleGeneratePizza}>Generate</button>
        </>
      ) : (
        <>
          <h3>Tu Pizza Rara ha sido Generada:</h3>
          <p><strong>Base de la pizza:</strong> {basePizza.join(', ')}</p>
          <p><strong>Size:</strong> {pizzaGenerada.size}</p>
          <p><strong>Método de Cocción:</strong> {metodoCoccionFijo}</p>
          <p><strong>Ingredientes adicionales:</strong> {ingredientesAleatorios.join(', ')}</p>
          <p><strong>Descuento aplicado:</strong> {descuento}%</p>

          {/* Botón para volver a generar, si no se han agotado los intentos */}
          {generarIntentos < 3 ? (
            <button onClick={handleRegenerarPizza}>Volver a Generar ({3 - generarIntentos} intentos restantes)</button>
          ) : (
            <p>No puedes generar más de 3 veces.</p>
          )}

          {/* Botón para confirmar la pizza */}
          <button onClick={() => alert('Orden enviada')}>Confirmar Pizza y Enviar Orden</button>
        </>
      )}
    </div>
  );
};

export default MakeARarePizza;
