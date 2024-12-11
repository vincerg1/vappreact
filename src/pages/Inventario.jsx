import React, { useState, useEffect } from 'react';

function Inventario() {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:3001/inventario')  // Asegúrate de que la ruta coincida exactamente
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor: ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                setMessage(JSON.stringify(data));
            })
            .catch(error => {
                setMessage('Error al conectarse al servidor: ' + error.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);
    
    return (
        <div>
            <h1>This is the Inventario component</h1>
            {loading ? <p>Cargando..</p> : <p>{message}</p>}
        </div>
    );
}

export default Inventario;
