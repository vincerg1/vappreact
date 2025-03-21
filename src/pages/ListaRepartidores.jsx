import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/ListaRepartidores.css'; 


const ListaRepartidores = () => {
    const [repartidores, setRepartidores] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRepartidores = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/repartidores`);
                setRepartidores(response.data.data);
            } catch (error) {
                console.error('Error al cargar repartidores:', error);
            }
        };
        fetchRepartidores();
    }, []);

    return (
        <div className='ListaRepartidoresContenedor'>
            <h1>Lista de Repartidores</h1>
            <button onClick={() => navigate('/repartidores/crear')}>Crear Nuevo Repartidor</button>
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
                                <button onClick={() => navigate(`/repartidores/crear?id=${repartidor.id_repartidor}`)}>
                                    Editar
                                </button>
                                <button onClick={() => axios.delete(`${process.env.REACT_APP_API_URL}/repartidores/${repartidor.id_repartidor}`)
                                    .then(() => setRepartidores(repartidores.filter(r => r.id_repartidor !== repartidor.id_repartidor)))}>
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ListaRepartidores;
