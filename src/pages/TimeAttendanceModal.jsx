import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/TimeAttendanceModal.css";

const TimeAttendanceModal = ({ onClose }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [employeeId, setEmployeeId] = useState(null);

  // Variables de estado que recibiremos de /current_status
  const [turnStatus, setTurnStatus] = useState(null);   // "turno_vigente" | "turno_finalizado" | "sin_turno"
  const [shiftInfo, setShiftInfo] = useState(null);     // si hay turno asignado para hoy
  const [hasActiveEntry, setHasActiveEntry] = useState(false);
  const [nextShift, setNextShift] = useState(null);

  // Mensajes de bienvenida aleatorios
  const welcomeMessages = [
    "¡Feliz inicio de jornada! 😊",
    "¡Que tengas una excelente jornada! 🚀",
    "¡Día productivo por delante! 💪",
    "¡Hoy será un gran día en el trabajo! 🌟",
    "¡Vamos a por un día increíble! 🔥",
    "¡Tu esfuerzo hace la diferencia, buena jornada! 💼",
  ];

  // ---------------------- useEffect: cargar estado tras autenticación ---------------------- //
  useEffect(() => {
    if (authenticated && employeeId) {
      fetchCurrentStatus(employeeId);
    }
  }, [authenticated, employeeId]);

  // ======================= 1) handleConfirm (Auth) ======================= //
  const handleConfirm = async () => {
    if (!pin.trim()) {
      setError("Por favor, ingresa tu PIN.");
      return;
    }
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/authenticate`, { pin });
      if (response.data.success && response.data.id_empleado) {
        setAuthenticated(true);
        setEmployeeId(response.data.id_empleado);
        setError("");
        console.log(`✅ Empleado autenticado. ID: ${response.data.id_empleado}`);
      } else {
        setError("PIN incorrecto. Inténtalo de nuevo.");
      }
    } catch (error) {
      console.error("❌ Error en la autenticación:", error);
      setError("Error en la conexión con el servidor.");
    }
  };

  // ======================= 2) fetchCurrentStatus (nuevo endpoint) ======================= //
  const fetchCurrentStatus = async (id_empleado) => {
    try {
      console.log("🔍 Cargando estado completo para empleado:", id_empleado);
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/employees/${id_empleado}/current_status`);

      if (res.data.success) {
        console.log("✅ /current_status:", res.data);

        setTurnStatus(res.data.turnStatus);       // "turno_vigente", "turno_finalizado" o "sin_turno"
        setShiftInfo(res.data.shiftInfo);         // null o { day, hora_inicio, hora_fin, ... }
        setHasActiveEntry(res.data.hasActiveEntry);
        setNextShift(res.data.nextShift);         // null o siguiente turno
      } else {
        console.warn("⚠️ Respuesta sin success:", res.data);
        setTurnStatus("sin_turno");
      }
    } catch (error) {
      console.error("❌ Error en fetchCurrentStatus:", error);
      setError("Error al obtener estado actual del empleado.");
    }
  };

  // ======================= 3) handleMarkEntry => /mark_entry ======================= //
  const handleMarkEntry = async () => {
    if (!shiftInfo) {
      alert("No tienes un turno asignado en este momento.");
      return;
    }
    if (turnStatus === "turno_finalizado") {
      alert("No puedes marcar entrada en un turno finalizado.");
      return;
    }
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/mark_entry`, {
        id_empleado: employeeId,
        day: shiftInfo.day,
        hora_inicio: shiftInfo.hora_inicio,
        shift: shiftInfo.shift,
        id_horario: shiftInfo.id_horario
      });
      if (response.data.success) {
        setHasActiveEntry(true);
        const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        setWelcomeMessage(randomMsg);
      } else {
        alert("Error al registrar entrada.");
      }
    } catch (error) {
      console.error("❌ Error al marcar entrada:", error);
    }
  };

  // ======================= 4) handleMarkExit => /mark_exit ======================= //
  const handleMarkExit = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/mark_exit`, {
        id_empleado: employeeId
      });
      if (response.data.success) {
        console.log("✅ Salida marcada correctamente");
        setHasActiveEntry(false);
        setShiftInfo(null);
        setTurnStatus("turno_finalizado");

        onClose();
      } else {
        alert("Error al registrar salida.");
      }
    } catch (error) {
      console.error("❌ Error al marcar salida:", error);
    }
  };

  // ======================= 5) Render Helpers ======================= //
  function renderShiftInfo() {
    // Caso 1: turno_finalizado O sin_turno => mostrar nextShift si existe
    if (turnStatus === "turno_finalizado" || turnStatus === "sin_turno") {
      if (nextShift) {
        return (
          <p>
            <strong>Próximo Turno:</strong> {formatNextShiftMessage(nextShift)}
          </p>
        );
      } else {
        return (
          <p>
            <strong>Próximo Turno:</strong> No tienes más turnos asignados.
          </p>
        );
      }
    }
  
    // Caso 2: turno_vigente y hay shiftInfo => muestra el turno actual
    if (turnStatus === "turno_vigente" && shiftInfo) {
      return (
        <p>
          <strong>Turno:</strong> {shiftInfo.hora_inicio} - {shiftInfo.hora_fin} hrs
        </p>
      );
    }
  
    // Caso 3: Ninguno anterior => sin turno
    return (
      <p>
        <strong>Turno:</strong> Sin turno asignado
      </p>
    );
  }

  function renderEntryButton() {
    // 1) Si no está "turno_vigente", se deshabilita
    if (turnStatus !== "turno_vigente") {
      return <button className="disabled-button" disabled>ENTRADA</button>;
    }
    // 2) Si no tenemos shiftInfo o no hay hora_inicio
    if (!shiftInfo || !shiftInfo.hora_inicio) {
      return <button className="disabled-button" disabled>ENTRADA</button>;
    }
    // 3) (Opcional) Evitar marcar antes de la hora de inicio
    const currentHour = new Date().getHours();
    const [shiftStartHour] = shiftInfo.hora_inicio.split(":").map(Number);
    const isBeforeShift = currentHour < shiftStartHour;

    return (
      <button
        className="confirm-button"
        onClick={handleMarkEntry}
        disabled={isBeforeShift}
      >
        ENTRADA
      </button>
    );
  }

  function formatNextShiftMessage(ns) {
    if (!ns || !ns.day || !ns.hora_inicio) {
      return "No tienes turnos asignados.";
    }
  
    // Obtener el nombre del día actual
    const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const today = new Date();
    const currentDay = days[today.getDay()].toLowerCase();
  
    // Si el turno es hoy, mostramos "hoy" en vez del día
    const dayLabel = ns.day.toLowerCase() === currentDay ? "hoy" : ns.day;
  
    return `Tu próximo turno es ${dayLabel} a las ${ns.hora_inicio} hrs.`;
  }

  // ---------------------- RENDER PRINCIPAL ---------------------- //
  console.log("== [DEBUG] Antes del return ==", {
    employeeId,
    turnStatus,
    shiftInfo,
    hasActiveEntry,
    nextShift
  });

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Marcaje de Horario</h2>
          <button className="close-button-ch" onClick={onClose}>Salir</button>
        </div>

        {/* ------- BLOQUE AUTENTICACIÓN -------- */}
        {!authenticated ? (
          <>
            <p>Ingresa tu PIN para continuar</p>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="pin-input"
            />
            {error && <p className="error-message">{error}</p>}
            <div className="modal-buttons centered">
              <button className="confirm-button" onClick={handleConfirm}>
                Confirmar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ------- INFO DEL TURNO -------- */}
            {renderShiftInfo()}

            {/* Mensaje de bienvenida (solo aparece tras marcar ENTRADA) */}
            {welcomeMessage && <p className="welcome-message">{welcomeMessage}</p>}

            {/* ------- BOTONES ENTRADA / SALIDA -------- */}
            <div className="modal-buttons-centered">
              {hasActiveEntry ? (
                <button className="exit-button" onClick={handleMarkExit}>
                  MARCA SALIDA
                </button>
              ) : (
                renderEntryButton()
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TimeAttendanceModal;
