import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/formularios.css';

const segments = ['S1', 'S2', 'S3', 'S4'];

const OfferForm = () => {
   
    const [currentImage, setCurrentImage] = useState(null);
    const navigate = useNavigate();
    const { id } = useParams(); 
    const allDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const [formData, setFormData] = useState({
            Cupones_Asignados: '',
            Descripcion: '',
            Segmentos_Aplicables: [],
            Imagen: '',
            Min_Descuento_Percent: '',
            Max_Descuento_Percent: '',
            Categoria_Cupon: 'gratis',
            Precio_Cupon: null, 
            Modo_Precio_Cupon: 'automatico', 
            Condiciones_Extras: false,
            Ticket_Promedio: '',
            quantity_condition: '',
            Dias_Ucompra: '',
            Numero_Compras: '',
            Max_Amount: '',
            Otras_Condiciones: '',
            Estado: 'Inactiva',
            Origen: '',
            Tipo_Cupon: 'permanente',
            Dias_Activos: [],
            Hora_Inicio: '',
            Hora_Fin: '',
            Observaciones: '',
            Tipo_Oferta: 'Normal',
            Link_DailyChallenge: '',
            Instrucciones_DailyChallenge: '',
        });


    useEffect(() => {
        if (id) {
            fetchOffer(id); 
        }
    }, [id]);

 
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
                Categoria_Cupon: offerData.Categoria_Cupon || 'gratis',
                Condiciones_Extras: offerData.Condiciones_Extras === 'true',
                Ticket_Promedio: offerData.Ticket_Promedio || '',
                quantity_condition: offerData.quantity_condition || '',
                Dias_Ucompra: offerData.Dias_Ucompra || '',
                Numero_Compras: offerData.Numero_Compras || '',
                Max_Amount: offerData.Max_Amount || '',
                Instrucciones_Link: offerData.Instrucciones_Link || '', // Nuevo campo
                Estado: offerData.Estado || 'Inactiva',
                Origen: offerData.Origen || '',
                Tipo_Cupon: offerData.Tipo_Cupon || 'permanente',
                Dias_Activos: JSON.parse(offerData.Dias_Activos || '[]'),
                Hora_Inicio: offerData.Hora_Inicio || '',
                Hora_Fin: offerData.Hora_Fin || '',
                Additional_Instructions: offerData.Additional_Instructions || '', // Nuevo campo
                Tipo_Oferta: offerData.Tipo_Oferta || 'Normal',
                Precio_Cupon: offerData.Precio_Cupon || null
            });


            setCurrentImage(offerData.Imagen ? `http://localhost:3001${offerData.Imagen}` : null);
        } catch (error) {
            console.error('Error al obtener la oferta:', error);
        }
    };
    const handlePriceModeChange = (e) => {
        const mode = e.target.value;
        setFormData((prev) => ({
            ...prev,
            Modo_Precio_Cupon: mode,
            Precio_Cupon: mode === 'automatico' ? calcularPrecioAutomatico() : null, // Calcula automáticamente si corresponde
        }));
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
        const selectedOptions = [...e.target.selectedOptions].map((option) => option.value);
    
        // Reemplazar "Todos los Días" por el array completo de días
        const updatedDays =
            selectedOptions.includes('Todos los Días') ? allDays : selectedOptions;
    
        setFormData({ ...formData, Dias_Activos: updatedDays });
    };
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setFormData({ ...formData, Imagen: file });
        setCurrentImage(URL.createObjectURL(file));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
    
        const finalFormData = { ...formData };
    
        // Validar y ajustar los valores de Precio_Cupon y Modo_Precio_Cupon
        if (finalFormData.Categoria_Cupon === 'gratis') {
            finalFormData.Precio_Cupon = 'n/a';
            finalFormData.Modo_Precio_Cupon = 'n/a';
        } else if (finalFormData.Categoria_Cupon === 'pago') {
            if (finalFormData.Modo_Precio_Cupon === 'automatico') {
                finalFormData.Precio_Cupon = calcularPrecioAutomatico();
            } else if (finalFormData.Modo_Precio_Cupon === 'manual') {
                // Validar que el precio manual sea válido
                if (!finalFormData.Precio_Cupon || isNaN(parseFloat(finalFormData.Precio_Cupon))) {
                    alert('Por favor, ingresa un precio válido para el cupón.');
                    return;
                }
            }
        }
    
        // Crear FormData y enviar al servidor
        const updatedFormData = new FormData();
        Object.keys(finalFormData).forEach((key) => {
            if (key === 'Segmentos_Aplicables' || key === 'Condiciones_Extras' || key === 'Dias_Activos') {
                updatedFormData.append(key, JSON.stringify(finalFormData[key]));
            } else {
                updatedFormData.append(key, finalFormData[key]);
            }
        });
    
        try {
            if (id) {
                // Actualizar oferta existente
                await axios.patch(`http://localhost:3001/ofertas/${id}`, updatedFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                // Crear nueva oferta
                await axios.post('http://localhost:3001/ofertas', updatedFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            navigate('/offers');
        } catch (error) {
            console.error('Error al guardar la oferta:', error);
        }
    };
    const handleCategoryChange = (e) => {
        const categoria = e.target.value;
    
        // Actualizar valores según la categoría del cupón
        if (categoria === 'gratis') {
            setFormData((prev) => ({
                ...prev,
                Categoria_Cupon: categoria,
                Precio_Cupon: 'n/a', // Valor predeterminado para cupones gratis
                Modo_Precio_Cupon: 'n/a', // Valor predeterminado para cupones gratis
            }));
        } else if (categoria === 'pago') {
            setFormData((prev) => ({
                ...prev,
                Categoria_Cupon: categoria,
                Precio_Cupon: null, // Reinicia el precio para cupones pagos
                Modo_Precio_Cupon: 'automatico', // Valor predeterminado
            }));
        }
    };
    const calcularPrecioAutomatico = () => {
        const basePrice = 0.5; // Precio base mínimo
        const minDiscount = parseFloat(formData.Min_Descuento_Percent) || 0;
        const maxDiscount = parseFloat(formData.Max_Descuento_Percent) || 0;
    
        // Calcula el promedio de descuento
        const discountFactor = (minDiscount + maxDiscount) / 2;
    
        // Escalar el precio basado en el descuento promedio
        let calculatedPrice = Math.max(
            basePrice,
            (basePrice + (discountFactor / 100) * 1.5).toFixed(2)
        );
    
        // Limitar el precio máximo a 1.99 EUR
        calculatedPrice = Math.min(calculatedPrice, 1.99);
    
        return calculatedPrice;
    };
    
    

  return (
    <div>
        <h2>{id ? 'Editar Oferta' : 'Crear Oferta'}</h2>
        <div className="scrollable-form66">
            <form onSubmit={handleSubmit}>
                <label>
                    Tipo de Oferta:
                    <select name="Tipo_Oferta" value={formData.Tipo_Oferta} onChange={handleChange}>
                        <option value="Normal">Normal</option>
                        <option value="Random Pizza">Random Pizza</option>
                        <option value="DailyChallenge">DailyChallenge</option>
                    </select>
                </label>
                {formData.Tipo_Oferta === 'DailyChallenge' && (
                    <>
                        <label>
                        Link del Reto:
                        <input
                            type="text"
                            name="Instrucciones_Link" 
                            value={formData.Instrucciones_Link}
                            onChange={handleChange}
                        />
                        </label>
                        <label>
                        Instrucciones Adicionales:
                        <input
                        type="text"
                            name="Additional_Instructions" 
                            value={formData.Additional_Instructions}
                            onChange={handleChange}
                        />
                        </label>
                    </>
                    )}
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
                Segmentos Aplicables:
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {segments.map((segment) => (
                        <label key={segment} style={{ display: 'inline-block', marginRight: '10px' }}>
                            <input
                                type="checkbox"
                                name="Segmentos_Aplicables"
                                value={segment}
                                checked={formData.Segmentos_Aplicables.includes(segment)}
                                onChange={() => handleSegmentChange(segment)}
                            />
                            {segment}
                        </label>
                    ))}
                </div>
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
                    <select name="Categoria_Cupon" value={formData.Categoria_Cupon} onChange={handleCategoryChange}>
                        <option value="gratis">Gratis</option>
                        <option value="pago">Pago</option>
                    </select>
                </label>
                {formData.Categoria_Cupon === 'pago' && (
                    <>
                        <label>
                            Modo de Precio del Cupón:
                            <select
                                name="Modo_Precio_Cupon"
                                value={formData.Modo_Precio_Cupon}
                                onChange={handlePriceModeChange}
                            >
                                <option value="automatico">Automático</option>
                                <option value="manual">Manual</option>
                            </select>
                        </label>

                        {formData.Modo_Precio_Cupon === 'manual' && (
                            <label>
                                Precio del Cupón:
                                <input
                                    type="number"
                                    name="Precio_Cupon"
                                    value={formData.Precio_Cupon || ''}
                                    onChange={handleChange}
                                    placeholder="Ingrese el precio manual"
                                />
                            </label>
                        )}

                        {formData.Modo_Precio_Cupon === 'automatico' && (
                            <p>El precio será calculado automáticamente.</p>
                        )}
                    </>
                )}
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
                                quantity_condition:
                                <input
                                    type="number"
                                    name="quantity_condition"
                                    value={formData.quantity_condition}
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
    </div>
);

    
};

export default OfferForm;