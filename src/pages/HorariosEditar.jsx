import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/HorariosEditar.css";

function HorariosEditar() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  // Cargar datos del horario actual
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/horarioPersonal/${id}`)
      .then((res) => setFormData(res.data))
      .catch((error) => console.error("Error al obtener horario:", error));

    axios.get(`${process.env.REACT_APP_API_URL}/api/empleados`)
      .then((res) => setEmpleados(res.data))
      .catch((error) => console.error("Error al obtener empleados:", error));

    axios.get(`${process.env.REACT_APP_API_URL}/ubicaciones`)
      .then((res) => setUbicaciones(res.data))
      .catch((error) => console.error("Error al obtener ubicaciones:", error));
  }, [id]);

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Enviar cambios al backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Datos a enviar:", formData); // 🛑 Verifica si hay algún campo vacío
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/horarioPersonal/${id}`, formData);
      alert("Horario actualizado con éxito");
      navigate("/control-horario/horarios/lista");
    } catch (error) {
      console.error("Error al actualizar horario:", error);
      alert("Error al actualizar horario");
    }
  };
  

  return (
    <div className="horarios-container">
      <h2>Editar Horario</h2>
      <form onSubmit={handleSubmit} className="horarios-form">
        <select name="id_empleado" value={formData.id_empleado} onChange={handleChange} required>
          {empleados.map((empleado) => (
            <option key={empleado.id_empleado} value={empleado.id_empleado}>
              {empleado.nombre} {empleado.apellido}
            </option>
          ))}
        </select>

        <select name="ubicacion" value={formData.ubicacion} onChange={handleChange} required>
          {ubicaciones.map((ubicacion) => (
            <option key={ubicacion.id_cliente} value={ubicacion.id_cliente}>
              {ubicacion.ciudad} - {ubicacion.codigo_postal}
            </option>
          ))}
        </select>

        <select name="day" value={formData.day} onChange={handleChange} required>
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

        <button type="submit">Actualizar Horario</button>
      </form>
    </div>
  );
}

export default HorariosEditar;
