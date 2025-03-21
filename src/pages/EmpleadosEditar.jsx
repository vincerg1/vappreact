import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Empleados.css";

function EmpleadosEditar() {
  const { id } = useParams(); // Obtener ID de la URL
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    bday: "",
  });

  // Obtener los datos del empleado
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/empleados/${id}`)
      .then((response) => {
        setFormData(response.data);
      })
      .catch((error) => {
        console.error("Error al obtener los datos del empleado:", error);
      });
  }, [id]);

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Manejo del submit para actualizar datos
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/empleados/${id}`, formData);
      alert("Empleado actualizado con éxito");
      navigate("/control-horario/empleados/lista"); // Volver a la lista
    } catch (error) {
      console.error("Error al actualizar empleado:", error);
      alert("Error al actualizar el empleado");
    }
  };

  return (
    <div className="empleados-container">
      <h2>Editar Empleado</h2>
      <form onSubmit={handleSubmit} className="empleados-form">
        <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
        <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} required />
        <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} required />
        <input type="date" name="bday" value={formData.bday} onChange={handleChange} required />

        <button type="submit">Guardar Cambios</button>
      </form>
    </div>
  );
}

export default EmpleadosEditar;
