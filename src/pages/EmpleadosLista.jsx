import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/EmpleadosLista.css";

function EmpleadosLista() {
  const [empleados, setEmpleados] = useState([]);
  const navigate = useNavigate();


  useEffect(() => {
    fetchEmpleados();
  }, []);

  const fetchEmpleados = async () => {
    try {
      const response = await axios.get("http://localhost:3001/api/empleados");
      setEmpleados(response.data);
    } catch (error) {
      console.error("Error al obtener empleados:", error);
    }
  };

  // Función para eliminar un empleado
  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este empleado?")) {
      try {
        await axios.delete(`http://localhost:3001/api/empleados/${id}`);
        fetchEmpleados(); // Recargar la lista después de eliminar
      } catch (error) {
        console.error("Error al eliminar empleado:", error);
      }
    }
  };

  // Función para redirigir a la página de edición con el ID del empleado
  const handleEditar = (id) => {
    navigate(`/control-horario/empleados/editar/${id}`);
  };

  return (
    
    <div className="empleados-lista-container">
      <h2>Lista de Empleados</h2>
      <table className="empleados-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Fecha de Nacimiento</th>
            <th>PIN</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {empleados.map((empleado) => (
            <tr key={empleado.id_empleado}>
              <td>{empleado.id_empleado}</td>
              <td>{empleado.nombre}</td>
              <td>{empleado.apellido}</td>
              <td>{empleado.email}</td>
              <td>{empleado.telefono}</td>
              <td>{empleado.bday}</td>
              <td>{empleado.pin}</td>
              <td>
                <button className="edit-btn" onClick={() => handleEditar(empleado.id_empleado)}>Editar</button>
                <button className="delete-btn" onClick={() => handleEliminar(empleado.id_empleado)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EmpleadosLista;

