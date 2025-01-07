import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const segments = ['S1', 'S2', 'S3', 'S4'];

const OfferForm = () => {
    const [formData, setFormData] = useState({
        Cupones_Asignados: '',
        Descripcion: '',
        Segmentos_Aplicables: [], // Siempre debe ser un array
        Imagen: '',
        Min_Descuento_Percent: '',  // Nuevo campo
        Max_Descuento_Percent: '',  // Nuevo campo
        Categoria_Cupon: 'gratis',  // Nuevo campo para seleccionar entre cupón gratis o pago
        Condiciones_Extras: false,  // Asegurarse de que es booleano
        Ticket_Promedio: '',
        Dias_Ucompra: '',
        Numero_Compras: '',
        Max_Amount: '',
        Otras_Condiciones: '',
        Estado: 'Inactiva', // Por defecto
        Origen: '',
        Tipo_Cupon: 'permanente', // Nuevo campo
        Dias_Activos: [],         // Nuevo campo
        Hora_Inicio: '',          // Nuevo campo
        Hora_Fin: '',             // Nuevo campo
        Observaciones: '',        // Nuevo campo
        Tipo_Oferta: 'Basic'      // Nuevo campo
    });

    const [currentImage, setCurrentImage] = useState(null);
    const navigate = useNavigate();
    const { id } = useParams(); // Parámetro ID que nos dice si estamos en modo de edición

    const allDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    useEffect(() => {
        if (id) {
            fetchOffer(id); // Cargar la oferta si estamos en modo edición
        }
    }, [id]);

    // Obtener los datos de la oferta desde el servidor
    const fetchOffer = async (offerId) => {
        try {
            const response = await axios.get(`http://localhost:3001/ofertas/edit/${offerId}`);
            const offerData = response.data.data;

            // Mapear los datos del servidor al formato del formulario
            setFormData({
                Cupones_Asignados: offerData.Cupones_Asignados || '', 
                Descripcion: offerData.Descripcion || '',
                Segmentos_Aplicables: JSON.parse(offerData.Segmentos_Aplicables || '[]'), 
                Imagen: offerData.Imagen || '', 
                Min_Descuento_Percent: offerData.Min_Descuento_Percent || '',
                Max_Descuento_Percent: offerData.Max_Descuento_Percent || '',
                Categoria_Cupon: offerData.Categoria_Cupon || 'gratis', // Usar el nuevo campo de categoría
                Condiciones_Extras: offerData.Condiciones_Extras === 'true',
                Ticket_Promedio: offerData.Ticket_Promedio || '',
                Dias_Ucompra: offerData.Dias_Ucompra || '',
                Numero_Compras: offerData.Numero_Compras || '',
                Max_Amount: offerData.Max_Amount || '',
                Otras_Condiciones: offerData.Otras_Condiciones || '',
                Estado: offerData.Estado || 'Inactiva',
                Origen: offerData.Origen || '',
                Tipo_Cupon: offerData.Tipo_Cupon || 'permanente',
                Dias_Activos: JSON.parse(offerData.Dias_Activos || '[]'),
                Hora_Inicio: offerData.Hora_Inicio || '',
                Hora_Fin: offerData.Hora_Fin || '',
                Observaciones: offerData.Observaciones || '',
                Tipo_Oferta: offerData.Tipo_Oferta || 'Basic'
            });

            // Verificar si hay imagen
            setCurrentImage(offerData.Imagen ? `http://localhost:3001${offerData.Imagen}` : null);
        } catch (error) {
            console.error('Error al obtener la oferta:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setFormData({ ...formData, [name]: checked });
    };

    const handleSegmentChange = (segment) => {
        let updatedSegments = [...formData.Segmentos_Aplicables];
        if (updatedSegments.includes(segment)) {
            updatedSegments = updatedSegments.filter(s => s !== segment);
        } else {
            updatedSegments.push(segment);
        }
        setFormData({ ...formData, Segmentos_Aplicables: updatedSegments });
    };

    const handleDaysChange = (e) => {
        const selectedOptions = [...e.target.selectedOptions].map(option => option.value);

        if (selectedOptions.includes('Todos los Dias')) {
            setFormData({ ...formData, Dias_Activos: allDays });
        } else {
            setFormData({ ...formData, Dias_Activos: selectedOptions });
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setFormData({ ...formData, Imagen: file });
        setCurrentImage(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const updatedFormData = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'Segmentos_Aplicables' || key === 'Condiciones_Extras' || key === 'Dias_Activos') {
                updatedFormData.append(key, JSON.stringify(formData[key]));
            } else {
                updatedFormData.append(key, formData[key]);
            }
        });

        try {
            if (id) {
                await axios.patch(`http://localhost:3001/ofertas/${id}`, updatedFormData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                await axios.post('http://localhost:3001/ofertas', updatedFormData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }
            navigate('/offers');
        } catch (error) {
            console.error('Error al guardar la oferta:', error);
        }
    };

    return (
        <div>
            <h2>{id ? 'Editar Oferta' : 'Crear Oferta'}</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Tipo de Oferta:
                    <select name="Tipo_Oferta" value={formData.Tipo_Oferta} onChange={handleChange}>
                        <option value="Basic">Básica</option>
                        <option value="Pizza Rara">Pizza Rara</option>
                    </select>
                </label>
                <label>
                    Cupones Asignados:
                    <input
                        type="number"
                        name="Cupones_Asignados"
                        value={formData.Cupones_Asignados}
                        onChange={handleChange}
                    />
                </label>
                <label>
                    Descripción:
                    <input
                        type="text"
                        name="Descripcion"
                        value={formData.Descripcion}
                        onChange={handleChange}
                    />
                </label>
                <label>
                    Segmentos Aplicables:
                    {segments.map(segment => (
                        <div key={segment}>
                            <label>
                                <input
                                    type="checkbox"
                                    name="Segmentos_Aplicables"
                                    value={segment}
                                    checked={formData.Segmentos_Aplicables.includes(segment)}
                                    onChange={() => handleSegmentChange(segment)}
                                />
                                {segment}
                            </label>
                        </div>
                    ))}
                </label>
                <label>
                    Imagen:
                    <input type="file" name="Imagen" onChange={handleImageChange} />
                    {currentImage && (
                        <div>
                            <a href={currentImage} target="_blank" rel="noopener noreferrer">
                                Ver Imagen
                            </a>
                        </div>
                    )}
                </label>
                <label>
                    % de Descuento (Mínimo):
                    <input
                        type="number"
                        name="Min_Descuento_Percent"
                        value={formData.Min_Descuento_Percent}
                        onChange={handleChange}
                    />
                </label>
                <label>
                    % de Descuento (Máximo):
                    <input
                        type="number"
                        name="Max_Descuento_Percent"
                        value={formData.Max_Descuento_Percent}
                        onChange={handleChange}
                    />
                </label>
                <label>
                    Categoría del Cupón:
                    <select name="Categoria_Cupon" value={formData.Categoria_Cupon} onChange={handleChange}>
                        <option value="gratis">Gratis</option>
                        <option value="pago">Pago</option>
                    </select>
                </label>
                <label>
                    Max Amount:
                    <input
                        type="number"
                        name="Max_Amount"
                        value={formData.Max_Amount}
                        onChange={handleChange}
                    />
                </label>
                <label>
                    Tipo de Cupón:
                    <select name="Tipo_Cupon" value={formData.Tipo_Cupon} onChange={handleChange}>
                        <option value="permanente">Permanente</option>
                        <option value="temporal">Temporal</option>
                    </select>
                </label>
    
                {(formData.Tipo_Cupon === 'temporal' || formData.Tipo_Cupon === 'permanente') && (
                    <>
                        <label>
                            Días Activos:
                            <select
                                multiple
                                name="Dias_Activos"
                                value={formData.Dias_Activos}
                                onChange={handleDaysChange}>
                                <option value="Todos los Días">Todos los Días</option>
                                {allDays.map(dia => (
                                    <option key={dia} value={dia}>{dia}</option>
                                ))}
                            </select>
                        </label>
    
                        <label>
                            Hora de Inicio:
                            <input
                                type="time"
                                name="Hora_Inicio"
                                value={formData.Hora_Inicio}
                                onChange={handleChange}
                            />
                        </label>
    
                        <label>
                            Hora de Fin:
                            <input
                                type="time"
                                name="Hora_Fin"
                                value={formData.Hora_Fin}
                                onChange={handleChange}
                            />
                        </label>
                    </>
                )}
    
                <label>
                    Condiciones Extras:
                    <input
                        type="checkbox"
                        name="Condiciones_Extras"
                        checked={formData.Condiciones_Extras}
                        onChange={handleCheckboxChange}
                    />
                </label>
                {formData.Condiciones_Extras && (
                    <ul>
                        <li>
                            <label>
                                Ticket Promedio:
                                <input
                                    type="number"
                                    name="Ticket_Promedio"
                                    value={formData.Ticket_Promedio}
                                    onChange={handleChange}
                                />
                            </label>
                        </li>
                        <li>
                            <label>
                                Días Última Compra:
                                <input
                                    type="number"
                                    name="Dias_Ucompra"
                                    value={formData.Dias_Ucompra}
                                    onChange={handleChange}
                                />
                            </label>
                        </li>
                        <li>
                            <label>
                                Número de Compras:
                                <input
                                    type="number"
                                    name="Numero_Compras"
                                    value={formData.Numero_Compras}
                                    onChange={handleChange}
                                />
                            </label>
                        </li>
                    </ul>
                )}
    
                <label>
                    Estado:
                    <select
                        name="Estado"
                        value={formData.Estado}
                        onChange={handleChange}>
                        <option value="Activa">Activa</option>
                        <option value="Inactiva">Inactiva</option>
                    </select>
                </label>
                <button type="submit">Guardar</button>
            </form>
        </div>
    );
    
};

export default OfferForm;