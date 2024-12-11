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
  const [editingShiftIndex, setEditingShiftIndex] = useState(null); // Guardar el índice de edición

  // Obtener los horarios del día seleccionado
  const handleDaySelection = async (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);

      try {
        console.log(`Obteniendo horarios para el día: ${day}`);
        const response = await axios.get(`http://localhost:3001/api/horarios/${day}`);
        const horarios = response.data;
        console.log(`Horarios obtenidos para ${day}: `, horarios);

        setExistingSchedules((prevSchedules) => ({
          ...prevSchedules,
          [day]: horarios,
        }));
      } catch (error) {
        console.error('Error al obtener los horarios:', error);
      }
    }
  };

  const handleWorkHoursChange = (day, index, field, value) => {
    // Asegurarse de que el índice existe antes de acceder a él
    if (!workHours[day][index]) {
      console.error(`El índice ${index} para el día ${day} no está definido`);
      return;
    }

    if (index >= workHours[day].length) {
      console.error(`El índice ${index} está fuera del rango actual para el día ${day}`);
      return;
    }
  
    const updatedShifts = [...workHours[day]];
  
    // Asegurarse de que el objeto en el índice es válido
    if (!updatedShifts[index]) {
      console.error(`El turno en el índice ${index} no está definido`);
      return;
    }
  
    updatedShifts[index] = { ...updatedShifts[index], [field]: value };
    
    console.log(`Modificando el campo ${field} en el índice ${index} para el día ${day}`);
    console.log("Estado actual de workHours para", day, workHours[day]);
  
    setWorkHours((prevWorkHours) => ({
      ...prevWorkHours,
      [day]: updatedShifts,
    }));
  
    console.log("Nuevo estado de workHours para", day, workHours[day]);
  };


  const handleAddShift = (day) => {
    console.log(`Agregando un nuevo turno para ${day}`);
    setWorkHours((prevWorkHours) => ({
      ...prevWorkHours,
      [day]: [...prevWorkHours[day], { startTime: '', endTime: '', shift: '' }],
    }));

    setAddingShift((prevAddingShift) => ({
      ...prevAddingShift,
      [day]: true,
    }));
    setEditingShiftIndex(null); // Limpiar modo edición
  };


  const handleUndoShift = (day) => {
    console.log(`Deshaciendo último turno para ${day}`);
    const updatedShifts = workHours[day].slice(0, -1); // Remover el último turno agregado
    setWorkHours((prevWorkHours) => ({
      ...prevWorkHours,
      [day]: updatedShifts,
    }));

    setAddingShift((prevAddingShift) => ({
      ...prevAddingShift,
      [day]: false,
    }));
  };


  const handleAddNewShift = async (day, index) => {
    const shift = workHours[day][index];

    console.log(`Intentando agregar o editar un turno para el día ${day} en el índice ${index}`, shift);

    if (!shift.startTime || !shift.endTime || !shift.shift) {
      console.error("Faltan datos para agregar o editar el horario.");
      return;
    }

    const horarioData = {
      day: day,
      startTime: shift.startTime,
      endTime: shift.endTime,
      shift: shift.shift,
    };

    try {
      if (editingShiftIndex !== null) {
        // Modo edición, hacer PATCH
        const horarioId = workHours[day][editingShiftIndex]?.horario_id;
        console.log(`Modo edición, PATCH para horario_id: ${horarioId}`);

        if (horarioId) {
          const response = await axios.patch(`http://localhost:3001/api/horarios/${horarioId}`, horarioData);
          console.log('Horario actualizado correctamente:', response.data);
        }
      } else {
        // Modo creación, hacer POST
        const response = await axios.post('http://localhost:3001/api/horarios', horarioData);
        console.log('Horario agregado correctamente:', response.data);

        const updatedShifts = [...workHours[day]];
        updatedShifts[index].horario_id = response.data.Horario_id;
        updatedShifts[index].isSaved = true;

        setWorkHours((prevWorkHours) => ({
          ...prevWorkHours,
          [day]: updatedShifts,
        }));
      }

      // Después de agregar o editar, cerramos el formulario
      handleUndoShift(day); // Aquí llamamos a handleUndoShift para que cierre el formulario

    } catch (error) {
      console.error('Error al hacer el POST o PATCH:', error);
    }
  };


  const handleDeleteShift = async (day, index) => {
    console.log(`Intentando eliminar el turno en el índice ${index} para ${day}`);
    const scheduleToDelete = existingSchedules[day][index];

    if (!scheduleToDelete?.Horario_id) {
      console.error("No se puede eliminar un turno que no esté guardado en la base de datos.");
      return;
    }

    try {
      const response = await axios.delete(`http://localhost:3001/api/horarios/${scheduleToDelete.Horario_id}`);
      console.log(`Turno con horario_id ${scheduleToDelete.Horario_id} eliminado correctamente`);

      if (response.status === 200) {
        const updatedShifts = existingSchedules[day].filter((_, i) => i !== index);
        setExistingSchedules((prevSchedules) => ({
          ...prevSchedules,
          [day]: updatedShifts,
        }));
      }
    } catch (error) {
      console.error('Error al eliminar el horario:', error);
    }
  };

  // Editar un turno, cargando los datos en el formulario
  const handleEditShift = (day, schedule, index) => {
    // Verificar si el turno ya existe o si necesitamos inicializarlo
    const existingShift = workHours[day][index] || {
      startTime: '',
      endTime: '',
      shift: '',
      horario_id: schedule.Horario_id,
    };
  
    const updatedShifts = [...workHours[day]];
    updatedShifts[index] = {
      ...existingShift, // Cargar el turno existente o crear uno nuevo
      startTime: schedule.Hora_inicio,
      endTime: schedule.Hora_fin,
      shift: schedule.Shift,
      horario_id: schedule.Horario_id,
    };
  
    setWorkHours((prevWorkHours) => ({
      ...prevWorkHours,
      [day]: updatedShifts,
    }));
  
    console.log("Estado actualizado de workHours para", day, workHours[day]);
  
    setAddingShift((prevAddingShift) => ({
      ...prevAddingShift,
      [day]: true,
    }));
  
    setEditingShiftIndex(index); // Guardar el índice del turno que se está editando
  };

  const daysOfWeek = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  return (
    <div className="horarios-container">
      <h1 className="PDCRL">Configuración de Horarios</h1>
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
                                  <button type="button" onClick={() => handleEditShift(day, schedule, index)}>Editar</button>
                                  <button type="button" onClick={() => handleDeleteShift(day, index)}>Eliminar</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Botón para agregar otro turno */}
                        {!addingShift[day] ? (
                          <button
                            type="button"
                            className="add-shift-button"
                            onClick={() => handleAddShift(day)}
                          >
                            Agregar Turno
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="add-shift-button"
                            onClick={() => handleUndoShift(day)}
                          >
                            Deshacer
                          </button>
                        )}
                      </>
                    ) : (
                      !addingShift[day] ? (
                        <button
                          type="button"
                          className="add-shift-button"
                          onClick={() => handleAddShift(day)}
                        >
                          Agregar Turno
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="add-shift-button"
                          onClick={() => handleUndoShift(day)}
                        >
                          Deshacer
                        </button>
                      )
                    )}

                    {workHours[day].map((shift, index) => (
                      <div key={index} className="time-selectors">
                        <label>Inicio:</label>
                        <input
                          type="time"
                          className="time-selector"
                          value={shift.startTime || ''}
                          onChange={(e) => handleWorkHoursChange(day, index, 'startTime', e.target.value)}
                        />

                        <label>Fin:</label>
                        <input
                          type="time"
                          className="time-selector"
                          value={shift.endTime || ''}
                          onChange={(e) => handleWorkHoursChange(day, index, 'endTime', e.target.value)}
                        />

                        <label>Turno:</label>
                        <select
                          className="shift-selector"
                          value={shift.shift || ''}
                          onChange={(e) => handleWorkHoursChange(day, index, 'shift', e.target.value)}
                        >
                          <option value="">Selecciona Turno</option>
                          {[1, 2, 3, 4].map((shiftOption) => (
                            <option key={shiftOption} value={shiftOption}>{shiftOption}</option>
                          ))}
                        </select>

                        <div className="action-buttons">
                          <button type="button" onClick={() => handleAddNewShift(day, index)}>
                            {editingShiftIndex !== null ? "Editar" : "Agregar"}
                          </button>
                        </div>
                      </div>
                    ))}
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
