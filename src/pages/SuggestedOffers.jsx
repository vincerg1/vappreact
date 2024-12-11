import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/OfferList.css';

const SuggestedOffers = () => {
    const [suggestedOffers, setSuggestedOffers] = useState([
        {
            Oferta_Id: 1,
            Descripcion: 'Oferta Sugerida 1',
            Cupones_Asignados: 10,
            Cupones_Disponibles: 10,
            Segmentos_Aplicables: ['S1'],
            Descuento_Percent: 10,
            Duracion_Horas: 24,
            Max_Amount: 100,
            Condiciones_Extras: true,
            Ticket_Promedio: 50,
            Dias_Ucompra: 30,
            Numero_Compras: 5,
            Otras_Condiciones: 'Condición adicional 1',
            Estado: 'Inactiva',
            Origen: 'sugerida',
            Activado: false ,
        },
        {
            Oferta_Id: 2,
            Descripcion: 'Oferta Sugerida 2',
            Cupones_Asignados: 15,
            Cupones_Disponibles: 15,
            Segmentos_Aplicables: ['S2'],
            Descuento_Percent: 20,
            Duracion_Horas: 48,
            Max_Amount: 200,
            Condiciones_Extras: false,
            Ticket_Promedio: 0,
            Dias_Ucompra: 0,
            Numero_Compras: 0,
            Otras_Condiciones: '0',
            Estado: 'Inactiva',
            Origen: 'sugerida',
            Activado: false ,
        }
    ]);

    useEffect(() => {
        // Lógica para verificar si alguna oferta sugerida ya ha sido activada
        const fetchActivatedOffers = async () => {
            try {
                const response = await axios.get('http://localhost:3001/ofertas');
                const activatedOffers = response.data.data.filter(offer => offer.Origen === 'sugerida');
                console.log('Activated offers:', activatedOffers);

                const updatedOffers = suggestedOffers.map(offer => {
                    const activated = activatedOffers.find(aOffer => aOffer.Descripcion === offer.Descripcion);
                    return activated ? { ...offer, Activado: true, Estado: 'Activa' } : offer;
                });

                setSuggestedOffers(updatedOffers);
            } catch (error) {
                console.error('Error fetching activated offers:', error);
            }
        };

        fetchActivatedOffers();
    }, []);

    const handleActivate = async (offer) => {
        try {
            const response = await axios.post('http://localhost:3001/ofertas', {
                ...offer,
                Codigo_Oferta: `OFF${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                Segmentos_Aplicables: JSON.stringify(offer.Segmentos_Aplicables),
                Origen: 'sugerida',
                Estado: 'Activa' // Cambiar el estado a Activa
            });
            console.log('Offer activated:', response.data);

            // Actualiza el estado de la oferta
            setSuggestedOffers((prevOffers) =>
                prevOffers.map((o) =>
                    o.Oferta_Id === offer.Oferta_Id ? { ...o, Activado: true, Estado: 'Activa' } : o
                )
            );

        } catch (error) {
            console.error('Error activating offer:', error);
        }
    };

    const handleDeactivate = async (offer) => {
        try {
            await axios.delete(`http://localhost:3001/ofertas/${offer.Oferta_Id}`);
            console.log('Offer deactivated');

            // Actualiza el estado de la oferta
            setSuggestedOffers((prevOffers) =>
                prevOffers.map((o) =>
                    o.Oferta_Id === offer.Oferta_Id ? { ...o, Activado: false, Estado: 'Inactiva' } : o
                )
            );
        } catch (error) {
            console.error('Error deactivating offer:', error);
        }
    };

    return (
        <div className="table-container">
            <h2 className="center-text">Suggested Offers</h2>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            {/* <th>Codigo_Oferta</th> */}
                            <th>Descripcion</th>
                            <th>Cupones Asignados</th>
                            <th>Segmentos Aplicables</th>
                            <th>% de Descuento</th>
                            <th>Duracion (Horas)</th>
                            <th>Max Amount</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suggestedOffers.length > 0 ? (
                            suggestedOffers.map((offer) => (
                                <tr key={offer.Oferta_Id}>
                                    {/* <td>{offer.Codigo_Oferta || 'N/A'}</td> */}
                                    <td>{offer.Descripcion}</td>
                                    <td>{offer.Cupones_Asignados}</td>
                                    <td>{offer.Segmentos_Aplicables.join(', ')}</td>
                                    <td>{offer.Descuento_Percent}</td>
                                    <td>{offer.Duracion_Horas}</td>
                                    <td>{offer.Max_Amount}</td>
                                    <td>{offer.Estado}</td>
                                    <td>
                                        <button
                                            onClick={() =>
                                                offer.Activado
                                                    ? handleDeactivate(offer)
                                                    : handleActivate(offer)
                                            }
                                            style={{
                                                backgroundColor: offer.Activado ? 'red' : 'green'
                                            }}
                                        >
                                            {offer.Activado ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9">No suggested offers available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SuggestedOffers;
