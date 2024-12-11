import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/Repartidores.css';

const Repartidores = () => {
    const [repartidores, setRepartidores] = useState([]);
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', username: '', password: '' });
    const [editId, setEditId] = useState(null);
    const [showList, setShowList] = useState(false); // Estado para controlar la visibilidad de la lista
    const [showForm, setShowForm] = useState(false); // Estado para controlar la visibilidad del formulario

    // Cargar repartidores
    const fetchRepartidores = async () => {
        try {
            const response = await axios.get('http://localhost:3001/repartidores');
            setRepartidores(response.data.data);
        } catch (error) {
            console.error('Error al cargar repartidores:', error);
        }
    };

    // Manejar cambios en el formulario
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Crear o editar repartidor
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
            setShowForm(false); // Ocultar el formulario después de agregar/editar
        } catch (error) {
            console.error('Error al guardar repartidor:', error);
        }
    };

    // Eliminar repartidor
    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:3001/repartidores/${id}`);
            fetchRepartidores();
        } catch (error) {
            console.error('Error al eliminar repartidor:', error);
        }
    };

    // Seleccionar repartidor para editar
    const handleEdit = (repartidor) => {
        setEditId(repartidor.id_repartidor);
        setFormData(repartidor);
        setShowForm(true); // Mostrar el formulario al seleccionar para editar
    };

    useEffect(() => {
        fetchRepartidores();
    }, []);

    return (
        <div>
            <h1>Gestión de Repartidores</h1>

            {/* Contenedor de los botones */}
            <div className="button-container">
                <button onClick={() => setShowForm((prev) => !prev)}>
                    {showForm ? 'Ocultar Formulario' : 'Crear Repartidor'}
                </button>

                <button onClick={() => setShowList((prev) => !prev)}>
                    {showList ? 'Ocultar Lista' : 'Ver Lista'}
                </button>
            </div>

            {/* Formulario para crear/editar repartidor */}
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

            {/* Tabla de repartidores */}
            {showList && (
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Email</th>
                            <th>Usuario</th>
                            <th>Acciones</th>
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
                                <td>
                                    <button onClick={() => handleEdit(repartidor)}>Editar</button>
                                    <button onClick={() => handleDelete(repartidor.id_repartidor)}>Eliminar</button>
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
