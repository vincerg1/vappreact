import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import '../styles/GestionarIngredientesExtras.css';

const GestionarIngredientesExtras = () => {
  const [ingredientes, setIngredientes] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [nuevoPrecio, setNuevoPrecio] = useState('');

  // Cargar la lista de precios de ingredientes extras desde la base de datos
  useEffect(() => {
    const fetchIngredientes = async () => {
      try {
        const response = await axios.get('http://localhost:3001/IngredientExtraPrices');
        setIngredientes(response.data);
      } catch (error) {
        console.error('Error al cargar los ingredientes extra:', error);
      }
    };

    fetchIngredientes();
  }, []);

  // Manejar edición en línea
  const handleEditClick = (id, currentPrice) => {
    setEditandoId(id);
    setNuevoPrecio(currentPrice.toFixed(2)); // Mostrar precio actual con dos decimales
  };

  const handleSave = async (id) => {
    try {
      const updatedPrice = parseFloat(nuevoPrecio);
      if (isNaN(updatedPrice)) {
        alert('El precio debe ser un número válido.');
        return;
      }
  
      console.log('Datos enviados al servidor:', { extra_price: updatedPrice });
  
      await axios.put(`http://localhost:3001/IngredientExtraPrices/${id}`, { extra_price: updatedPrice });
      setIngredientes((prev) =>
        prev.map((ing) => (ing.id === id ? { ...ing, extra_price: updatedPrice } : ing))
      );
      setEditandoId(null);
      setNuevoPrecio('');
    } catch (error) {
      console.error('Error al guardar el precio del ingrediente extra:', error);
    }
  };
  

  const handleCancel = () => {
    setEditandoId(null);
    setNuevoPrecio('');
  };

  return (
    <div className="gestionar-ingredientes">
      <h1>Gestión de Precios de Ingredientes Extras</h1>
      <div className="tabla-ingredientes">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tamaño</th>
              <th>Precio Extra</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ingredientes.map((ing) => (
              <tr key={ing.id}>
                <td>{ing.id}</td>
                <td>{ing.size}</td>
                <td>
                  {editandoId === ing.id ? (
                    <input
                      type="text"
                      value={nuevoPrecio}
                      onChange={(e) => setNuevoPrecio(e.target.value)}
                    />
                  ) : (
                    `${ing.extra_price.toFixed(2)}€`
                  )}
                </td>
                <td>
                  {editandoId === ing.id ? (
                    <>
                      <button onClick={() => handleSave(ing.id)}>Guardar</button>
                      <button onClick={handleCancel}>Cancelar</button>
                    </>
                  ) : (
                    <button onClick={() => handleEditClick(ing.id, ing.extra_price)}>Editar Precio</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestionarIngredientesExtras;
