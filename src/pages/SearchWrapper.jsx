import React, { useState, useContext, useEffect } from "react";
import { _PizzaContext } from "./_PizzaContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import "../styles/SearchWrapper.css"; 

export default function SearchWrapper({ onSelectPizza }) {
  const { activePizzas } = useContext(_PizzaContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPizzas, setFilteredPizzas] = useState([]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredPizzas([]);
      return;
    }

    const normalizedQuery = searchQuery.toLowerCase();

    // 🔹 Filtrar pizzas que contienen el ingrediente ingresado
    const matchedPizzas = activePizzas.filter((pizza) => {
      try {
        const ingredientesArray = JSON.parse(pizza.ingredientes);
        return ingredientesArray.some(({ ingrediente }) =>
          ingrediente.toLowerCase().includes(normalizedQuery)
        );
      } catch (error) {
        console.error("⚠️ Error al parsear ingredientes de:", pizza.nombre, error);
        return false;
      }
    });

    setFilteredPizzas(matchedPizzas);
  }, [searchQuery, activePizzas]);

  // 🔹 Función para resaltar el ingrediente buscado en la descripción
  const highlightText = (text, query) => {
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, "<strong>$1</strong>");
  };

  return (
    <div className="search-bar-container">
      <div className="search-wrapper">
        <input
          type="text"
          placeholder="Buscar por ingrediente..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <FontAwesomeIcon icon={faSearch} className="search-icon" />

        {/* 🔹 Contenedor de resultados debajo del buscador */}
        {filteredPizzas.length > 0 && (
          <div className="dropdown-results">
            <ul className="search-results">
              {filteredPizzas.map((pizza) => (
                <li key={pizza.id} onClick={() => onSelectPizza(pizza)}>
                  <strong>{pizza.nombre}</strong>
                  <p 
                    className="pizza-description" 
                    dangerouslySetInnerHTML={{ 
                      __html: highlightText(pizza.descripcion, searchQuery) 
                    }} 
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
