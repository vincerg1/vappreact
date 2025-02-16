import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/HorariosMalla.css";

function HorariosMalla() {
  const { id } = useParams();
  const [horarios, setHorarios] = useState([]);

  useEffect(() => {
    fetchHorarios();
  }, []);

  const fetchHorarios = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/horarioPersonal/empleado/${id}`);
      setHorarios(response.data);
      console.log("Horarios cargados:", response.data);
    } catch (error) {
      console.error("Error al obtener horarios:", error);
    }
  };

  // ✅ Solución: "00:00" se maneja como "24:00" para la comparación
  const convertirHoraANumero = (hora) => {
    const [h, m] = hora.split(":").map(Number);
    if (h === 0 && m === 0) return 24; // Medianoche (00:00) lo tratamos como 24:00
    return h + (m > 0 ? 0.5 : 0);
  };

  return (
    <div className="horarios-malla-container">
      <h2>Horario Semanal</h2>
      <table className="malla-table">
        <thead>
          <tr>
            <th></th>
            {["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"].map((dia) => (
              <th key={dia}>{dia}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(23).keys()].map((h) => {
            const hora = (h + 1).toString().padStart(2, "0") + ":00"; // 01:00 a 23:00
            return (
              <tr key={hora}>
                <td>{hora}</td>
                {["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"].map((dia) => (
                  <td
                    key={dia}
                    className={horarios.some(
                      (h) =>
                        h.day.toLowerCase() === dia &&
                        convertirHoraANumero(h.hora_inicio) <= convertirHoraANumero(hora) &&
                        convertirHoraANumero(h.hora_fin) >= convertirHoraANumero(hora) // 🔥 Cambié `>` por `>=`
                    )
                      ? "ocupado"
                      : ""}
                  ></td>
                ))}
              </tr>
            );
          })}
          {/* ✅ Agregar "00:00" al final */}
          <tr key="00:00">
            <td>00:00</td>
            {["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"].map((dia) => (
              <td
                key={dia}
                className={horarios.some(
                  (h) =>
                    h.day.toLowerCase() === dia &&
                    convertirHoraANumero(h.hora_inicio) <= 24 && // "00:00" tratado como 24:00
                    convertirHoraANumero(h.hora_fin) >= 24
                )
                  ? "ocupado"
                  : ""}
              ></td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default HorariosMalla;
