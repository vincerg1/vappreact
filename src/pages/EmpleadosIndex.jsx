import React from "react";
import { Link, Outlet } from "react-router-dom";
import "../styles/EmpleadosIndex.css";

function EmpleadosIndex() {
  return (
    <div className="empleados-index-container">
      <h2>Gestión de Empleados</h2>
      <div className="empleados-buttons">
        <Link to="/control-horario/empleados/crear">
          <button className="empleados-button">Nuevo Empleado</button>
        </Link>
        <Link to="/control-horario/empleados/lista">
          <button className="empleados-button">Ver Empleados</button>
        </Link>
      </div>
      
      {/* Aquí se renderizan dinámicamente las rutas anidadas */}
      <Outlet />
    </div>
  );
}

export default EmpleadosIndex;

    
