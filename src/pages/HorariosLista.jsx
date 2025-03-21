import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/HorariosLista.css";

function HorariosLista() {
  const [empleados, setEmpleados] = useState([]);
  const navigate = useNavigate();

  // Obtener la lista de empleados con horarios asignados
  useEffect(() => {
    fetchEmpleados();
  }, []);

  const fetchEmpleados = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/empleados`);
      setEmpleados(response.data);
    } catch (error) {
      console.error("Error al obtener empleados:", error);
    }
  };

  return (
    <div className="horarios-lista-container">
      <h2>Gestión de Horarios</h2>
      <table className="empleados-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Empleado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {empleados.map((empleado) => (
            <tr key={empleado.id_empleado}>
              <td>{empleado.id_empleado}</td>
              <td>{empleado.nombre} {empleado.apellido}</td>
              <td>
                <button className="schedule-btn" onClick={() => navigate(`/control-horario/horarios/malla/${empleado.id_empleado}`)}>
                  Horario
                </button>
                <button className="detail-btn" onClick={() => navigate(`/control-horario/horarios/detalles/${empleado.id_empleado}`)}>
                 Detalles
                </button>

              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HorariosLista;
