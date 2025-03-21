import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/horarios.css';

const _Info_Restauratsx = () => {
  const [selectedDays, setSelectedDays] = useState([]);
  const [workHours, setWorkHours] = useState({
    lunes: [],
    martes: [],
    miercoles: [],
    jueves: [],
    viernes: [],
    sabado: [],
    domingo: [],
  });

  const [existingSchedules, setExistingSchedules] = useState({
    lunes: [],
    martes: [],
    miercoles: [],
    jueves: [],
    viernes: [],
    sabado: [],
    domingo: [],
  });

  const [addingShift, setAddingShift] = useState({});
  const [editingShiftIndex, setEditingShiftIndex] = useState(null);

  // ────────────────────────────────────────────────────────────
  // 1. CARGA DE HORARIOS AL SELECCIONAR DÍA
  // ────────────────────────────────────────────────────────────
  const handleDaySelection = async (day) => {
    if (selectedDays.includes(day)) {
      // Quitar selección
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      // Agregar selección
      setSelectedDays([...selectedDays, day]);

      try {
        console.log(`Obteniendo horarios para el día: ${day}`);
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/horarios/${day}`);
        const horarios = response.data;
        console.log(`Horarios obtenidos para ${day}: `, horarios);

        // Guardamos en existingSchedules
        setExistingSchedules((prev) => ({
          ...prev,
          [day]: horarios,
        }));

        // Inicializamos workHours[day] con los horarios de la DB
        setWorkHours((prev) => ({
          ...prev,
          [day]: horarios.map((h) => ({
            startTime: h.Hora_inicio,
            endTime: h.Hora_fin,
            shift: h.Shift,
            horario_id: h.Horario_id,
          })),
        }));
      } catch (error) {
        console.error('Error al obtener los horarios:', error);
      }
    }
  };

  // ────────────────────────────────────────────────────────────
  // 2. MANEJO DE CAMBIO DE CAMPOS (CREACIÓN/EDICIÓN)
  // ────────────────────────────────────────────────────────────
  const handleWorkHoursChange = (day, index, field, value) => {
    // Verificar que exista el array
    if (!workHours[day]) {
      setWorkHours((prev) => ({
        ...prev,
        [day]: [],
      }));
    }

    // Crear copia local
    const updatedShifts = [...(workHours[day] || [])];

    // Si no existe ese índice, lo creamos (modo creación)
    if (!updatedShifts[index]) {
      updatedShifts[index] = {
        startTime: '',
        endTime: '',
        shift: '',
        horario_id: null,
      };
    }

    // Actualizar campo
    updatedShifts[index] = { ...updatedShifts[index], [field]: value };

    console.log(`Modificando campo "${field}" en el índice ${index} para el día ${day}`);
    console.log("workHours actualizado:", updatedShifts);

    // Guardar nuevo estado
    setWorkHours((prev) => ({
      ...prev,
      [day]: updatedShifts,
    }));
  };

  // ────────────────────────────────────────────────────────────
  // 3. AGREGAR TURNO (SIN GUARDAR)
  // ────────────────────────────────────────────────────────────
  const handleAddShift = (day) => {
    console.log(`Agregando un nuevo turno para ${day}`);

    // Activamos el formulario de crear
    setAddingShift((prev) => ({
      ...prev,
      [day]: true,
    }));

    // Empujamos un turno vacío a workHours[day]
    setWorkHours((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { startTime: '', endTime: '', shift: '' }],
    }));

    // Salimos del modo edición
    setEditingShiftIndex(null);
  };

  // ────────────────────────────────────────────────────────────
  // 4. DESHACER TURNO AGREGADO ANTES DE GUARDAR
  // ────────────────────────────────────────────────────────────
  const handleUndoShift = (day) => {
    console.log(`Deshaciendo último turno para ${day}`);
    const updatedShifts = [...workHours[day]];
    // Quitar el último
    updatedShifts.pop();

    setWorkHours((prev) => ({
      ...prev,
      [day]: updatedShifts,
    }));

    // Cerrar formulario
    setAddingShift((prev) => ({
      ...prev,
      [day]: false,
    }));
  };

  // ────────────────────────────────────────────────────────────
  // 5. GUARDAR NUEVO TURNO O EDITAR EXISTENTE (POST/PATCH)
  // ────────────────────────────────────────────────────────────
  const handleAddNewShift = async (day, index) => {
    console.log(`Guardando turno para el día ${day}, índice ${index}`);

    // Copia local
    const shifts = [...(workHours[day] || [])];
    const shift = shifts[index];

    // Validación de datos
    if (!shift || !shift.startTime || !shift.endTime || !shift.shift) {
      console.error("Faltan datos para agregar/editar el horario:", shift);
      return;
    }

    // Validación de duplicados (por número de shift)
    const existsDuplicate = shifts.some((s, i) => s.shift === shift.shift && i !== index);
    if (existsDuplicate) {
      console.error(`Ya existe el turno ${shift.shift} en el día ${day}.`);
      alert(`Ya existe un turno con el número ${shift.shift} en ${day}. Seleccione otro.`);
      return;
    }

    // Construimos objeto para la API
    const horarioData = {
      day,
      startTime: shift.startTime,
      endTime: shift.endTime,
      shift: shift.shift,
    };

    try {
      // Modo edición o creación
      if (editingShiftIndex !== null) {
        // EDICIÓN (PATCH)
        const horarioId = shifts[editingShiftIndex]?.horario_id;
        console.log(`Editando turno con horario_id: ${horarioId}`);

        if (horarioId) {
          const response = await axios.patch(`${process.env.REACT_APP_API_URL}/api/horarios/${horarioId}`, horarioData);
          console.log('Horario actualizado:', response.data);
        }
      } else {
        // CREACIÓN (POST)
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/horarios`, horarioData);
        console.log('Horario creado:', response.data);

        // Guardar horario_id en el estado
        shifts[index].horario_id = response.data.Horario_id;
        shifts[index].isSaved = true;

        setWorkHours((prev) => ({
          ...prev,
          [day]: shifts,
        }));
      }

      // Cerrar formulario
      setAddingShift((prev) => ({
        ...prev,
        [day]: false,
      }));
      setEditingShiftIndex(null);
    } catch (error) {
      console.error("Error al guardar turno:", error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      }
    }
  };

  // ────────────────────────────────────────────────────────────
  // 6. ELIMINAR TURNO
  // ────────────────────────────────────────────────────────────
  const handleDeleteShift = async (day, index) => {
    console.log(`Eliminando turno en el índice ${index} de ${day}`);
    const scheduleToDelete = existingSchedules[day][index];

    if (!scheduleToDelete?.Horario_id) {
      console.error("No se puede eliminar un turno que no exista en la base de datos.");
      return;
    }

    try {
      const response = await axios.delete(`${process.env.REACT_APP_API_URL}/api/horarios/${scheduleToDelete.Horario_id}`);
      console.log("Turno eliminado:", response.status);

      if (response.status === 200) {
        // Quitar del array existingSchedules
        const filtered = existingSchedules[day].filter((_, i) => i !== index);
        setExistingSchedules((prev) => ({
          ...prev,
          [day]: filtered,
        }));
      }
    } catch (error) {
      console.error('Error al eliminar el horario:', error);
    }
  };

  // ────────────────────────────────────────────────────────────
  // 7. EDITAR TURNO (CARGA EN FORM DE EDICIÓN)
  // ────────────────────────────────────────────────────────────
  const handleEditShift = (day, schedule) => {
    console.log(`Editando turno en ${day}, schedule:`, schedule);

    // Si no hay turnos en workHours[day], no podemos editar
    if (!workHours[day] || workHours[day].length === 0) {
      console.error(`No hay turnos en workHours para el día ${day}.`);
      return;
    }

    // Buscar el índice en base a horario_id
    const realIndex = workHours[day].findIndex((sh) => sh.horario_id === schedule.Horario_id);
    if (realIndex === -1) {
      console.error("No se encontró el turno en workHours con horario_id:", schedule.Horario_id);
      return;
    }

    // Actualizamos los campos con lo que viene de existingSchedules
    const updatedShifts = [...workHours[day]];
    updatedShifts[realIndex] = {
      ...updatedShifts[realIndex],
      startTime: schedule.Hora_inicio,
      endTime: schedule.Hora_fin,
      shift: schedule.Shift,
    };

    setWorkHours((prev) => ({
      ...prev,
      [day]: updatedShifts,
    }));

    console.log(`Turno editado en ${day}, índice real: ${realIndex}`, updatedShifts[realIndex]);

    setEditingShiftIndex(realIndex);
  };

  // ────────────────────────────────────────────────────────────
  // RENDER: Formulario y Listado
  // ────────────────────────────────────────────────────────────
  const daysOfWeek = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  return (
    <div className="horarios-container">
      <div className='form-scroll-container'>
        <form className='f1_info_rest'>
          <h1 className="h1_Form_info_ir">Selecciona los Días de Trabajo:</h1>
          <ul>
            {daysOfWeek.map((day) => (
              <li key={day}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day)}
                    onChange={() => handleDaySelection(day)}
                  />
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </label>

                {/* Si el día está seleccionado, mostramos sus horarios y el formulario */}
                {selectedDays.includes(day) && (
                  <div className="work-hours-form">
                    {existingSchedules[day].length > 0 ? (
                      <>
                        <table className="schedule-table">
                          <thead>
                            <tr>
                              <th>Inicio</th>
                              <th>Fin</th>
                              <th>Turno</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {existingSchedules[day].map((schedule, index) => (
                              <tr key={index}>
                                <td>{schedule.Hora_inicio}</td>
                                <td>{schedule.Hora_fin}</td>
                                <td>{schedule.Shift}</td>
                                <td>
                                  <button type="button" onClick={() => handleEditShift(day, schedule)}>Editar</button>
                                  <button type="button" onClick={() => handleDeleteShift(day, index)}>Eliminar</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Botón Agregar Turno */}
                        {!addingShift[day] && (
                          <button
                            type="button"
                            className="add-shift-button"
                            onClick={() => handleAddShift(day)}
                          >
                            Agregar Turno
                          </button>
                        )}

                        {/* Formulario Creación (cuando addingShift[day] === true) */}
                        {addingShift[day] && (
                          <div className="time-selectors">
                            <label>Inicio:</label>
                            <input
                              type="time"
                              className="time-selector"
                              onChange={(e) =>
                                handleWorkHoursChange(day, workHours[day].length - 1, 'startTime', e.target.value)
                              }
                            />

                            <label>Fin:</label>
                            <input
                              type="time"
                              className="time-selector"
                              onChange={(e) =>
                                handleWorkHoursChange(day, workHours[day].length - 1, 'endTime', e.target.value)
                              }
                            />

                            <label>Turno:</label>
                            <select
                              className="shift-selector"
                              onChange={(e) =>
                                handleWorkHoursChange(day, workHours[day].length - 1, 'shift', e.target.value)
                              }
                            >
                              <option value="">Selecciona Turno</option>
                              {[1, 2, 3, 4].map((num) => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleAddNewShift(day, workHours[day].length - 1)}
                            >
                              Guardar
                            </button>

                            {/* Botón para cancelar la creación */}
                            <button type="button" onClick={() => handleUndoShift(day)}>
                              Deshacer
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      // No hay horarios en existingSchedules
                      <>
                        {!addingShift[day] && (
                          <button
                            type="button"
                            className="add-shift-button"
                            onClick={() => handleAddShift(day)}
                          >
                            Agregar Turno
                          </button>
                        )}

                        {addingShift[day] && (
                          <div className="time-selectors">
                            <label>Inicio:</label>
                            <input
                              type="time"
                              className="time-selector"
                              onChange={(e) => handleWorkHoursChange(day, 0, 'startTime', e.target.value)}
                            />

                            <label>Fin:</label>
                            <input
                              type="time"
                              className="time-selector"
                              onChange={(e) => handleWorkHoursChange(day, 0, 'endTime', e.target.value)}
                            />

                            <label>Turno:</label>
                            <select
                              className="shift-selector"
                              onChange={(e) => handleWorkHoursChange(day, 0, 'shift', e.target.value)}
                            >
                              <option value="">Selecciona Turno</option>
                              {[1, 2, 3, 4].map((num) => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>

                            <button type="button" onClick={() => handleAddNewShift(day, 0)}>
                              Guardar
                            </button>
                            <button type="button" onClick={() => handleUndoShift(day)}>
                              Deshacer
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Formulario de EDICIÓN (si editingShiftIndex no es null) */}
                    {editingShiftIndex !== null &&
                      workHours[day]?.[editingShiftIndex] && (
                        <div className="time-selectors">
                          <label>Inicio:</label>
                          <input
                            type="time"
                            className="time-selector"
                            value={workHours[day][editingShiftIndex].startTime || ''}
                            onChange={(e) =>
                              handleWorkHoursChange(day, editingShiftIndex, 'startTime', e.target.value)
                            }
                          />

                          <label>Fin:</label>
                          <input
                            type="time"
                            className="time-selector"
                            value={workHours[day][editingShiftIndex].endTime || ''}
                            onChange={(e) =>
                              handleWorkHoursChange(day, editingShiftIndex, 'endTime', e.target.value)
                            }
                          />

                          <label>Turno:</label>
                          <select
                            className="shift-selector"
                            value={workHours[day][editingShiftIndex].shift || ''}
                            onChange={(e) =>
                              handleWorkHoursChange(day, editingShiftIndex, 'shift', e.target.value)
                            }
                          >
                            <option value="">Selecciona Turno</option>
                            {[1, 2, 3, 4].map((num) => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>

                          <button type="button" onClick={() => handleAddNewShift(day, editingShiftIndex)}>
                            Guardar Cambios
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </form>
      </div>
    </div>
  );
};

export default _Info_Restauratsx;
