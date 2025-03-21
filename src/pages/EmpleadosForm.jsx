import React, { useState } from "react";
import axios from "axios";
import "../styles/Empleados.css";

function EmpleadosForm() {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    bday: "",
  });

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Manejo del submit con axios
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/empleados`, formData, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 201) {
        alert("Empleado registrado con éxito");
        setFormData({ nombre: "", apellido: "", email: "", telefono: "", bday: "" });
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        alert("Error: El email ya está registrado");
      } else {
        alert("Error al conectar con el servidor");
      }
    }
  };

  return (
    <div className="empleados-container">
      <h2>Registrar Nuevo Empleado</h2>
      <form onSubmit={handleSubmit} className="empleados-form">
        <input type="text" name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleChange} required />
        <input type="text" name="apellido" placeholder="Apellido" value={formData.apellido} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
        <input type="tel" name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={handleChange} required />
        <input type="date" name="bday" placeholder="Fecha de Nacimiento" value={formData.bday} onChange={handleChange} required />

        <button type="submit">Registrar Empleado</button>
      </form>
    </div>
  );
}

export default EmpleadosForm;
