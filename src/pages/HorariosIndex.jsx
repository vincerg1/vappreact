import React from "react";
import { Link } from "react-router-dom";
import "../styles/HorariosIndex.css";

function HorariosIndex() {
  return (
    <div className="horarios-index-container">
      <h2>Gestión de Horarios</h2>
      <div className="horarios-buttons">
        <Link to="/control-horario/horarios/crear">
          <button className="horarios-button">Nuevo Horario</button>
        </Link>
        <Link to="/control-horario/horarios/lista">
          <button className="horarios-button">Ver Horarios</button>
        </Link>
      </div>
    </div>
  );
}

export default HorariosIndex;
