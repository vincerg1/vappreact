import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/ListaRepartidores.css'; 


const ListaRepartidores = () => {
    const [repartidores, setRepartidores] = useState([]);
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [duracion, setDuracion] = useState(30); 

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

      const handleSuspension = (id) => {
        setSelectedId(id);
        setShowModal(true);
      };
      const confirmarSuspension = async () => {
        const suspension_status = 1;
        try {
          await axios.patch(`${process.env.REACT_APP_API_URL}/repartidores/${selectedId}`, {
            suspension_status,
            suspension_duration: duracion
          });
          alert('✅ Repartidor suspendido correctamente');
          setShowModal(false);
        } catch (error) {
          console.error('Error al suspender:', error);
          alert('❌ Error al suspender al repartidor');
        }
      };

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
                                <button onClick={() => handleSuspension(repartidor.id_repartidor)}>
                                    Suspender
                                    </button>
                                    {showModal && (
                                        <div className="modal-overlay">
                                            <div className="modal-content">
                                            <h3>Suspender repartidor</h3>
                                            <label>Duración de la suspensión:</label>
                                            <select value={duracion} onChange={(e) => setDuracion(parseInt(e.target.value))}>
                                                <option value={30}>30 minutos</option>
                                                <option value={60}>1 hora</option>
                                                <option value={1440}>24 horas</option>
                                                <option value={10080}>7 días</option>
                                                <option value={-1}>Permanente</option>
                                            </select>
                                            <div style={{ marginTop: '1rem' }}>
                                                <button onClick={confirmarSuspension}>Confirmar</button>
                                                <button onClick={() => setShowModal(false)} style={{ marginLeft: '1rem' }}>Cancelar</button>
                                            </div>
                                            </div>
                                        </div>
                                        )}
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
