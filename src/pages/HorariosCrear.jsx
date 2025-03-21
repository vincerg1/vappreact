import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/HorariosCrear.css";

function HorariosCrear() {
  const [empleados, setEmpleados] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [formData, setFormData] = useState({
    id_empleado: "",
    ubicacion: "",
    day: "",
    shift: "1",
    hora_inicio: "",
    hora_fin: ""
  });


  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/empleados`).then((res) => setEmpleados(res.data));
  }, []);
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/info-empresa`)
      .then((res) => {
        console.log("Ubicaciones recibidas en el frontend:", res.data); // LOG de depuración
        setUbicaciones(res.data);
      })
      .catch((error) => console.error("Error al obtener ubicaciones:", error));
  }, []);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/horarioPersonal`, formData);
      alert("✅ Horario creado con éxito");
      setFormData({ id_empleado: "", ubicacion: "", day: "", shift: "1", hora_inicio: "", hora_fin: "" });
    } catch (error) {
      console.error("❌ Error al crear horario:", error.response?.data?.error || error.message);
      alert(`Error: ${error.response?.data?.error || "No se pudo crear el horario"}`);
    }
  };


  return (
    <div className="horarios-container">
      <h2>Crear Nuevo Horario</h2>
      <form onSubmit={handleSubmit} className="horarios-form">
        <select name="id_empleado" value={formData.id_empleado} onChange={handleChange} required>
          <option value="">Seleccionar Empleado</option>
          {empleados.map((empleado) => (
            <option key={empleado.id_empleado} value={empleado.id_empleado}>
              {empleado.nombre} {empleado.apellido}
            </option>
          ))}
        </select>

        <select name="ubicacion" value={formData.ubicacion} onChange={handleChange} required>
            <option value="">Seleccionar Ubicación</option>
            {ubicaciones.map((ubicacion) => (
                <option key={ubicacion.id} value={ubicacion.id}>
                {ubicacion.direccion} - {ubicacion.codigo_postal}
                </option>
            ))}
            </select>

        <select name="day" value={formData.day} onChange={handleChange} required>
          <option value="">Seleccionar Día</option>
          {["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"].map((dia) => (
            <option key={dia} value={dia}>{dia}</option>
          ))}
        </select>

        <select name="shift" value={formData.shift} onChange={handleChange} required>
          {[1, 2, 3, 4, 5].map((shift) => (
            <option key={shift} value={shift}>{`Turno ${shift}`}</option>
          ))}
        </select>
        <div>
        <label htmlFor="Esntrada">Entrada</label>
         <input type="time" name="hora_inicio" value={formData.hora_inicio} onChange={handleChange} required />
        <label htmlFor="Salida">Salida</label>
        <input type="time" name="hora_fin" value={formData.hora_fin} onChange={handleChange} required />
        </div>

        <button type="submit">Crear Horario</button>
      </form>
    </div>
  );
}

export default HorariosCrear;
