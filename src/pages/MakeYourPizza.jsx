import React, { useState, useEffect, useContext } from 'react';
import _PizzaContext from './_PizzaContext';
import { FaPizzaSlice, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const MakeYourPizza = () => {
  const { activePizzas } = useContext(_PizzaContext);
  const [tipoPizzaSeleccionado, setTipoPizzaSeleccionado] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [selectSizeSeleccionado, setSelectSizeSeleccionado] = useState('');
  const [metodoCoccionSeleccionado, setMetodoCoccionSeleccionado] = useState('');
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState('');
  const [ingredienteSeleccionadoIzquierda, setIngredienteSeleccionadoIzquierda] = useState('');
  const [ingredienteSeleccionadoDerecha, setIngredienteSeleccionadoDerecha] = useState('');
  const [ingredientesDisponibles, setIngredientesDisponibles] = useState([]);
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]);
  const [ingredientesSeleccionadosIzquierda, setIngredientesSeleccionadosIzquierda] = useState([]);
  const [ingredientesSeleccionadosDerecha, setIngredientesSeleccionadosDerecha] = useState([]);
  const [pizzaConfirmada, setPizzaConfirmada] = useState(null);

  // Función para eliminar duplicados de un array
  const eliminarDuplicados = (array) => [...new Set(array)];

  // Extraer los sizes de selectSize y eliminar duplicados
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
    return eliminarDuplicados(sizes);
  };

  const selectSizesDisponibles = extraerSizesDisponibles();

  // Extraer ingredientes directamente de activePizzas
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
    return eliminarDuplicados(ingredientes); // Eliminar duplicados
  };

  useEffect(() => {
    const ingredientes = extraerIngredientesDisponibles();
    setIngredientesDisponibles(ingredientes);
  }, [activePizzas]);

  // Obtener las categorías de pizza desde las pizzas activas
  const obtenerCategorias = () => {
    const categorias = activePizzas.map(pizza => pizza.categoria);
    return eliminarDuplicados(categorias);
  };

  const categoriasDisponibles = obtenerCategorias();

  // Extraer métodos de cocción de las pizzas activas y eliminar duplicados
  const extraerMetodosCoccionDisponibles = () => {
    const metodos = activePizzas.map(pizza => pizza.metodoCoccion);
    return eliminarDuplicados(metodos);
  };

  const metodosCoccionDisponibles = extraerMetodosCoccionDisponibles();

  // Función para agregar ingredientes para pizza completa
  const agregarIngrediente = () => {
    if (ingredienteSeleccionado) {
      setIngredientesSeleccionados([...ingredientesSeleccionados, ingredienteSeleccionado]);
      setIngredienteSeleccionado('');
    }
  };

  // Función para agregar ingredientes a la parte izquierda
  const agregarIngredienteIzquierda = () => {
    if (ingredienteSeleccionadoIzquierda) {
      setIngredientesSeleccionadosIzquierda([...ingredientesSeleccionadosIzquierda, ingredienteSeleccionadoIzquierda]);
      setIngredienteSeleccionadoIzquierda('');
    }
  };

  // Función para agregar ingredientes a la parte derecha
  const agregarIngredienteDerecha = () => {
    if (ingredienteSeleccionadoDerecha) {
      setIngredientesSeleccionadosDerecha([...ingredientesSeleccionadosDerecha, ingredienteSeleccionadoDerecha]);
      setIngredienteSeleccionadoDerecha('');
    }
  };

  // Función para eliminar un ingrediente en pizza completa
  const eliminarIngrediente = (ingrediente) => {
    setIngredientesSeleccionados(ingredientesSeleccionados.filter(ing => ing !== ingrediente));
  };

  // Función para eliminar un ingrediente de la parte izquierda
  const eliminarIngredienteIzquierda = (ingrediente) => {
    setIngredientesSeleccionadosIzquierda(ingredientesSeleccionadosIzquierda.filter(ing => ing !== ingrediente));
  };

  // Función para eliminar un ingrediente de la parte derecha
  const eliminarIngredienteDerecha = (ingrediente) => {
    setIngredientesSeleccionadosDerecha(ingredientesSeleccionadosDerecha.filter(ing => ing !== ingrediente));
  };

  const handlePizzaTypeChange = (tipo) => {
    setTipoPizzaSeleccionado(tipo);
  };

  const handleConfirmarPizza = () => {
    const pizzaData =
      tipoPizzaSeleccionado === 'completa'
        ? {
            tipo: tipoPizzaSeleccionado,
            categoria: categoriaSeleccionada,
            size: selectSizeSeleccionado,
            metodoCoccion: metodoCoccionSeleccionado,
            ingredientes: ingredientesSeleccionados,
          }
        : {
            tipo: tipoPizzaSeleccionado,
            categoria: categoriaSeleccionada,
            size: selectSizeSeleccionado,
            metodoCoccion: metodoCoccionSeleccionado,
            ingredientesIzquierda: ingredientesSeleccionadosIzquierda,
            ingredientesDerecha: ingredientesSeleccionadosDerecha,
          };

    setPizzaConfirmada(pizzaData);
    console.log("Pizza confirmada:", pizzaData); // Log para verificar la confirmación
  };

  const handleEnviarOrden = () => {
    if (pizzaConfirmada) {
      console.log('Enviando la orden:', pizzaConfirmada);
      alert('Orden enviada correctamente.');
      // Aquí podrías hacer una llamada a una API para enviar la orden al servidor.
    }
  };

  if (!tipoPizzaSeleccionado) {
    return (
      <div className="make-your-pizza-container" style={{ textAlign: 'center' }}>
        <h2>Elige tu pizza</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', marginTop: '50px' }}>
          <div onClick={() => handlePizzaTypeChange('completa')} style={{ cursor: 'pointer', textAlign: 'center' }}>
            <FaPizzaSlice size={100} color="green" />
            <p>Pizza Completa</p>
          </div>
          <div onClick={() => handlePizzaTypeChange('mitad')} style={{ cursor: 'pointer', textAlign: 'center' }}>
            <FaChevronLeft size={100} color="green" />
            <FaChevronRight size={100} color="green" />
            <p>Mitad y Mitad</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="make-your-pizza-container">
      {!pizzaConfirmada ? (
        <>
          <h2>{tipoPizzaSeleccionado === 'completa' ? 'Pizza Completa' : 'Pizza Mitad y Mitad'}</h2>

          {/* Selección de categoría */}
          <div className="categoria-pizza">
            <h3>Selecciona el tipo de pizza:</h3>
            <select value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)}>
              <option value="">Selecciona una categoría</option>
              {categoriasDisponibles.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>

          {/* Selección de tamaño */}
          <div className="size-selection">
            <h3>Selecciona el Size:</h3>
            <select value={selectSizeSeleccionado} onChange={(e) => setSelectSizeSeleccionado(e.target.value)}>
              <option value="">Selecciona un size</option>
              {selectSizesDisponibles.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Selección de método de cocción */}
          <div className="metodo-coccion">
            <h3>Selecciona el método de cocción:</h3>
            <select value={metodoCoccionSeleccionado} onChange={(e) => setMetodoCoccionSeleccionado(e.target.value)}>
              <option value="">Selecciona un método de cocción</option>
              {metodosCoccionDisponibles.map((metodo) => (
                <option key={metodo} value={metodo}>
                  {metodo}
                </option>
              ))}
            </select>
          </div>

          {/* Selección de ingredientes para Pizza Completa */}
          {tipoPizzaSeleccionado === 'completa' && (
            <div className="ingredientes-lista">
              <h3>Selecciona ingredientes para tu pizza:</h3>
              <select value={ingredienteSeleccionado} onChange={(e) => setIngredienteSeleccionado(e.target.value)}>
                <option value="">Selecciona un ingrediente</option>
                {ingredientesDisponibles.map((ingrediente) => (
                  <option key={ingrediente} value={ingrediente}>
                    {ingrediente}
                  </option>
                ))}
              </select>
              <button onClick={agregarIngrediente}>Agregar Ingrediente</button>

              {/* Lista de ingredientes seleccionados para Pizza Completa */}
              {ingredientesSeleccionados.length > 0 && (
                <div className="ingredientes-seleccionados">
                  <h3>Ingredientes seleccionados:</h3>
                  <ul>
                    {ingredientesSeleccionados.map((ingrediente, index) => (
                      <li key={index}>
                        {ingrediente} <button onClick={() => eliminarIngrediente(ingrediente)}>Eliminar</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Selección de ingredientes para la Mitad y Mitad */}
          {tipoPizzaSeleccionado === 'mitad' && (
            <>
              <div className="ingredientes-lista">
                <h3>Selecciona ingredientes para la mitad izquierda:</h3>
                <select value={ingredienteSeleccionadoIzquierda} onChange={(e) => setIngredienteSeleccionadoIzquierda(e.target.value)}>
                  <option value="">Selecciona un ingrediente</option>
                  {ingredientesDisponibles.map((ingrediente) => (
                    <option key={ingrediente} value={ingrediente}>
                      {ingrediente}
                    </option>
                  ))}
                </select>
                <button onClick={agregarIngredienteIzquierda}>Agregar Ingrediente</button>

                {/* Lista de ingredientes seleccionados para la mitad izquierda */}
                {ingredientesSeleccionadosIzquierda.length > 0 && (
                  <div className="ingredientes-seleccionados">
                    <h3>Ingredientes seleccionados (Mitad Izquierda):</h3>
                    <ul>
                      {ingredientesSeleccionadosIzquierda.map((ingrediente, index) => (
                        <li key={index}>
                          {ingrediente} <button onClick={() => eliminarIngredienteIzquierda(ingrediente)}>Eliminar</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="ingredientes-lista">
                <h3>Selecciona ingredientes para la mitad derecha:</h3>
                <select value={ingredienteSeleccionadoDerecha} onChange={(e) => setIngredienteSeleccionadoDerecha(e.target.value)}>
                  <option value="">Selecciona un ingrediente</option>
                  {ingredientesDisponibles.map((ingrediente) => (
                    <option key={ingrediente} value={ingrediente}>
                      {ingrediente}
                    </option>
                  ))}
                </select>
                <button onClick={agregarIngredienteDerecha}>Agregar Ingrediente</button>

                {/* Lista de ingredientes seleccionados para la mitad derecha */}
                {ingredientesSeleccionadosDerecha.length > 0 && (
                  <div className="ingredientes-seleccionados">
                    <h3>Ingredientes seleccionados (Mitad Derecha):</h3>
                    <ul>
                      {ingredientesSeleccionadosDerecha.map((ingrediente, index) => (
                        <li key={index}>
                          {ingrediente} <button onClick={() => eliminarIngredienteDerecha(ingrediente)}>Eliminar</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Botón para confirmar la pizza */}
          <div className="confirmar-pizza">
            <button onClick={handleConfirmarPizza}>Confirmar Pizza</button>
          </div>
        </>
      ) : (
        <div className="pizza-confirmada">
          <h3>Pizza confirmada:</h3>
          <p><strong>Tipo de pizza:</strong> {pizzaConfirmada.tipo}</p>
          <p><strong>Categoría:</strong> {pizzaConfirmada.categoria}</p>
          <p><strong>Size:</strong> {pizzaConfirmada.size}</p>
          <p><strong>Método de cocción:</strong> {pizzaConfirmada.metodoCoccion}</p>

          {/* Mostrar los ingredientes dependiendo del tipo de pizza */}
          {pizzaConfirmada.tipo === 'completa' ? (
            <p><strong>Ingredientes:</strong> {pizzaConfirmada.ingredientes.join(', ')}</p>
          ) : (
            <>
              <p><strong>Ingredientes (Mitad Izquierda):</strong> {pizzaConfirmada.ingredientesIzquierda.join(', ')}</p>
              <p><strong>Ingredientes (Mitad Derecha):</strong> {pizzaConfirmada.ingredientesDerecha.join(', ')}</p>
            </>
          )}

          <button onClick={handleEnviarOrden}>Enviar Orden</button>
        </div>
      )}
    </div>
  );
};

export default MakeYourPizza;
