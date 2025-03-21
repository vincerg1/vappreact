import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/FormularioRepartidores.css';


const FormularioRepartidores = () => {
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', username: '', password: '' });
    const [editId, setEditId] = useState(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const id = searchParams.get('id');
        console.log("🔎 ID detectado en la URL:", id);

        if (id) {
            setEditId(id);
            axios.get(`${process.env.REACT_APP_API_URL}/repartidores/${id}`)
                .then((response) => {
                    console.log("📡 Respuesta completa de la API:", response);
                    console.log("📌 Datos dentro de response.data:", response.data);

                    if (response.data && response.data.data) {
                        console.log("✅ Datos correctos recibidos:", response.data.data);
                        setFormData(response.data.data);
                    } else if (response.data) {
                        console.log("⚠️ Datos sin la estructura esperada, usando response.data:", response.data);
                        setFormData(response.data);
                    } else {
                        console.warn("⚠️ No se encontraron datos en la respuesta");
                    }
                })
                .catch(err => console.error("❌ Error al obtener repartidor:", err));
        }
    }, [searchParams]); 

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("📝 Enviando datos al backend:", formData);

        try {
            if (editId) {
                await axios.patch(`${process.env.REACT_APP_API_URL}/repartidores/${editId}`, formData);
                console.log("✅ Datos actualizados correctamente");
            } else {
                await axios.post(`${process.env.REACT_APP_API_URL}/repartidores`, formData);
                console.log("✅ Nuevo repartidor agregado correctamente");
            }
            navigate('/repartidores/lista');
        } catch (error) {
            console.error('❌ Error al guardar repartidor:', error);
        }
    };

    return (
        <div className="formulario-container">
            <h1 className="formulario-title">{editId ? 'Editar Repartidor' : 'Crear Repartidor'}</h1>
            <form className="formulario-content" onSubmit={handleSubmit}>
                <input type="text" name="nombre" placeholder="Nombre" value={formData.nombre || ''} onChange={handleChange} required />
                <input type="text" name="telefono" placeholder="Teléfono" value={formData.telefono || ''} onChange={handleChange} />
                <input type="email" name="email" placeholder="Correo Electrónico" value={formData.email || ''} onChange={handleChange} />
                <input type="text" name="username" placeholder="Nombre de usuario" value={formData.username || ''} onChange={handleChange} required />
                <input type="password" name="password" placeholder="Contraseña" value={formData.password || ''} onChange={handleChange} required />
                <div className="formulario-buttons">
                    <button type="submit" className="btn-primary"><span>{editId ? 'Actualizar' : 'Agregar'}</span></button>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/repartidores/lista')}>Cancelar</button>
                </div>
            </form>
        </div>
    );
};

export default FormularioRepartidores;
