import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/OfferList.css';

const OfferList = () => {
    const [offers, setOffers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            const response = await axios.get('http://localhost:3001/ofertas');
            const offersData = response.data.data.map(offer => {
                let parsedSegments = [];
                try {
                    parsedSegments = JSON.parse(offer.Segmentos_Aplicables || '[]');
                } catch (error) {
                    console.error('Error parsing Segmentos_Aplicables:', error);
                    parsedSegments = offer.Segmentos_Aplicables; // fallback in case of parsing error
                }
                return {
                    ...offer,
                    Segmentos_Aplicables: Array.isArray(parsedSegments) ? parsedSegments : [parsedSegments], // ensure it's an array
                    Condiciones_Extras: offer.Condiciones_Extras === "1" ? true : false // Convert to boolean
                };
            });
            setOffers(offersData);
        } catch (error) {
            console.error('Error fetching offers:', error);
        }
    };

    const handleEdit = (offerId) => {
        navigate(`/offers/edit/${offerId}`);
    };

    const handleDelete = async (offerId) => {
        try {
            await axios.delete(`http://localhost:3001/ofertas/${offerId}`);
            fetchOffers(); // Refresh the list after deletion
        } catch (error) {
            console.error('Error deleting offer:', error);
        }
    };

    return (
        <div className="table-container">
            <h2 className="center-text">Existing Offers</h2>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Codigo_Oferta</th>
                            <th>Descripcion</th>
                            <th>Cupones Asignados</th>
                            <th>Cupones Disponibles</th> {/* Nueva columna */}
                            <th>Tipo de Cupón</th> {/* Nueva columna */}
                            <th>Segmentos Aplicables</th>
                            <th>Rango de Descuento</th> {/* Cambiado para mostrar el rango de descuento */}
                            <th>Max Amount</th>
                            <th>Condiciones Extras</th>
                            <th>Imagen</th>
                            <th>Estado</th>
                            <th>Origen</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {offers.length > 0 ? (
                            offers.map(offer => (
                                <tr key={offer.Oferta_Id}>
                                    <td>{offer.Codigo_Oferta}</td>
                                    <td>{offer.Descripcion}</td>
                                    <td>{offer.Cupones_Asignados}</td>
                                    <td>{offer.Cupones_Disponibles}</td> {/* Mostrando cupones disponibles */}
                                    <td>{offer.Tipo_Cupon}</td> {/* Mostrando tipo de cupón */}
                                    <td>{Array.isArray(offer.Segmentos_Aplicables) ? offer.Segmentos_Aplicables.join(', ') : offer.Segmentos_Aplicables}</td>
                                    <td>{offer.Min_Descuento_Percent}% - {offer.Max_Descuento_Percent}%</td> {/* Mostrando el rango de descuento */}
                                    <td>{offer.Max_Amount}</td>
                                    <td>{offer.Condiciones_Extras.toString()}</td>
                                    <td>
                                        {offer.Imagen ? (
                                            <a href={`http://localhost:3001${offer.Imagen}`} target="_blank" rel="noopener noreferrer">
                                                Ver Imagen
                                            </a>
                                        ) : 'Agrega una Imagen'}
                                    </td>
                                    <td>{offer.Estado}</td>
                                    <td>{offer.Origen ? offer.Origen : 'Creada'}</td>
                                    <td>
                                        <button onClick={() => handleEdit(offer.Oferta_Id)}>Edit</button>
                                        <button onClick={() => handleDelete(offer.Oferta_Id)}>Delete</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="13">No offers available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OfferList;
