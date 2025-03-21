import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../styles/HorariosLista.css";

function HorariosDetalles() {
  const [horarios, setHorarios] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]); // Estado del filtro
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    fetchHorarios();
  }, []);

  const fetchHorarios = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/horarioPersonal/empleado/${id}`);
      setHorarios(response.data);
    } catch (error) {
      console.error("Error al obtener horarios:", error);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este horario?")) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/horarioPersonal/${id}`);
        fetchHorarios();
      } catch (error) {
        console.error("Error al eliminar horario:", error);
      }
    }
  };

  const handleEditar = (id) => {
    navigate(`/control-horario/horarios/editar/${id}`);
  };

  // 📌 Manejar cambios en el filtro
  const handleFilterChange = (event) => {
    const value = event.target.value;
    setSelectedDays(value ? [value] : []); // Si es "todos", limpiar filtro
  };

  // 📌 Filtrar horarios según el día seleccionado
  const filteredHorarios = selectedDays.length
    ? horarios.filter((horario) => selectedDays.includes(horario.day.toLowerCase()))
    : horarios;

  return (
    
    <div className="horarios-lista-container">
      <h2>Lista de Horarios</h2>
<div className="filter-container">
      {/* 🔽 Agregamos un selector para filtrar por día */}
        <select onChange={handleFilterChange}>
          <option value="">Todos</option>
          <option value="lunes">Lunes</option>
          <option value="martes">Martes</option>
          <option value="miercoles">Miercoles</option>
          <option value="jueves">Jueves</option>
          <option value="viernes">Viernes</option>
          <option value="sabado">Sabado</option>
          <option value="domingo">Domingo</option>
        </select>
      </div>

      <table className="horarios-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Id_Empleado</th>
            <th>Ubicación</th>
            <th>Día</th>
            <th>Turno</th>
            <th>Hora Inicio</th>
            <th>Hora Fin</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredHorarios.map((horario) => (
            <tr key={horario.id_horario}>
              <td>{horario.id_horario}</td>
              <td>{horario.id_empleado}</td>
              <td>{horario.ubicacion}</td>
              <td>{horario.day}</td>
              <td>{horario.shift}</td>
              <td>{horario.hora_inicio}</td>
              <td>{horario.hora_fin}</td>
              <td>
                <button className="edit-btn" onClick={() => handleEditar(horario.id_horario)}>
                  Editar
                </button>
                <button className="delete-btn" onClick={() => handleEliminar(horario.id_horario)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HorariosDetalles;
