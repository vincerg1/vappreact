import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/Repartidores.css';

const Repartidores = () => {
    const [repartidores, setRepartidores] = useState([]);
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', username: '', password: '' });
    const [editId, setEditId] = useState(null);
    const [showList, setShowList] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedRepartidor, setSelectedRepartidor] = useState({ id: null, duration: null });

    const fetchRepartidores = async () => {
        try {
            const response = await axios.get('http://localhost:3001/repartidores');
            setRepartidores(response.data.data);
        } catch (error) {
            console.error('Error al cargar repartidores:', error);
        }
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await axios.patch(`http://localhost:3001/repartidores/${editId}`, formData);
            } else {
                await axios.post('http://localhost:3001/repartidores', formData);
            }
            setFormData({ nombre: '', telefono: '', email: '', username: '', password: '' });
            setEditId(null);
            fetchRepartidores();
            setShowForm(false);
        } catch (error) {
            console.error('Error al guardar repartidor:', error);
        }
    };
    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:3001/repartidores/${id}`);
            fetchRepartidores();
        } catch (error) {
            console.error('Error al eliminar repartidor:', error);
        }
    };
    const handleSuspend = async (id, duration) => {
        if (!id || !duration) return alert('Selecciona una duración válida.');
        const suspensionData = {
            suspension_status: true,
            suspension_duration: duration,
        };
        try {
            await axios.patch(`http://localhost:3001/repartidores/${id}`, suspensionData);
            fetchRepartidores();
            alert('Repartidor suspendido con éxito');
        } catch (error) {
            console.error('Error al suspender repartidor:', error);
        }
    };
    const handleLiftSuspension = async (id) => {
        try {
            await axios.patch(`http://localhost:3001/repartidores/${id}`, {
                suspension_status: false,
                suspension_duration: null,
            });
            fetchRepartidores();
            alert('Suspensión levantada con éxito');
        } catch (error) {
            console.error('Error al levantar suspensión:', error);
        }
    };
    const handleEdit = (repartidor) => {
        setEditId(repartidor.id_repartidor);
        setFormData(repartidor);
        setShowForm(true);
    };

    useEffect(() => {
        fetchRepartidores();
    }, []);

    return (
        <div>
            <h1>Gestión de Repartidores</h1>

            <div className="button-container">
                <button onClick={() => setShowForm((prev) => !prev)}>
                    {showForm ? 'Ocultar Formulario' : 'Crear Repartidor'}
                </button>
                <button onClick={() => setShowList((prev) => !prev)}>
                    {showList ? 'Ocultar Lista' : 'Ver Lista'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="nombre"
                        placeholder="Nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="text"
                        name="telefono"
                        placeholder="Teléfono"
                        value={formData.telefono}
                        onChange={handleChange}
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Correo Electrónico"
                        value={formData.email}
                        onChange={handleChange}
                    />
                    <input
                        type="text"
                        name="username"
                        placeholder="Nombre de usuario"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="text"
                        name="password"
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <button type="submit">{editId ? 'Editar' : 'Agregar'}</button>
                </form>
            )}

            {showList && (
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Email</th>
                            <th>Usuario</th>
                            <th>Estado de Suspensión</th>
                            <th>Fin de Suspensión</th>
                            <th>Acciones</th>
                            <th>Suspender</th>
                        </tr>
                    </thead>
                    <tbody>
                        {repartidores.map((repartidor) => (
                            <tr key={repartidor.id_repartidor}>
                                <td>{repartidor.id_repartidor}</td>
                                <td>{repartidor.nombre}</td>
                                <td>{repartidor.telefono || 'N/A'}</td>
                                <td>{repartidor.email || 'N/A'}</td>
                                <td>{repartidor.username}</td>
                                <td>{repartidor.suspension_status ? 'Suspendido' : 'Activo'}</td>
                                <td>
                                    {repartidor.suspension_status && repartidor.suspension_end_date
                                        ? repartidor.suspension_end_date
                                        : 'N/A'}
                                </td>
                                <td>
                                    <button onClick={() => handleEdit(repartidor)}>Editar</button>
                                    <button onClick={() => handleDelete(repartidor.id_repartidor)}>Eliminar</button>
                                </td>
                                <td>
                                    {repartidor.suspension_status ? (
                                        <button onClick={() => handleLiftSuspension(repartidor.id_repartidor)}>
                                            Levantar Suspensión
                                        </button>
                                    ) : (
                                        <div>
                                            <select
                                                onChange={(e) =>
                                                    setSelectedRepartidor({ id: repartidor.id_repartidor, duration: e.target.value })
                                                }
                                                defaultValue=""
                                            >
                                                <option value="" disabled>
                                                    Seleccionar tiempo
                                                </option>
                                                <option value={5}>5 Minutos</option>
                                                <option value={1440}>1 Día</option>
                                                <option value={10080}>7 Días</option>
                                                <option value={21600}>15 Días</option>
                                                <option value="permanent">Permanente</option>
                                            </select>
                                            <button
                                                onClick={() => handleSuspend(selectedRepartidor.id, selectedRepartidor.duration)}
                                                disabled={!selectedRepartidor || selectedRepartidor.id !== repartidor.id_repartidor}
                                            >
                                                Suspender
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Repartidores;
