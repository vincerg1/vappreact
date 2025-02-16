import React from 'react';
import { Link } from 'react-router-dom'; 
import '../styles/ControlHorarioIndex.css';

function ControlHorarioIndex() {
    return (
      <div className="control-horario-container">
        <h2 className="control-horario-title">Control Horario</h2>
        <div className="control-horario-buttons">
          <Link to="/control-horario/empleados">
            <button className="control-horario-button">Empleados</button>
          </Link>
          <Link to="/control-horario/horarios">
            <button className="control-horario-button">Horarios</button>
          </Link>
        </div>
      </div>
    );
  }
  
export default ControlHorarioIndex;

