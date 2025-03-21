import React, { useState, useEffect } from 'react';

function TestDB() {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_API_URL}/testdb`)  
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
            <h1>This is the TestDB component</h1>
            {loading ? <p>Cargando..</p> : <p>{message}</p>}
        </div>
    );
}

export default TestDB;
