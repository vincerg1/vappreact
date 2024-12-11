import { useEffect, useState } from 'react';

const ConsumoDiarioIng = () => {
    const [consumoSemanaActual, setConsumoSemanaActual] = useState([]);
    const [consumoSemanaAnterior, setConsumoSemanaAnterior] = useState([]);

    const obtenerDatosSimulados = (dias, minSemana, maxSemana, minFinSemana, maxFinSemana) => {
        let datosSemana = [];
        let datosAnteriores = [];

        for (let i = 0; i < dias; i++) {
            const esFinDeSemana = i >= 4;
            const min = esFinDeSemana ? minFinSemana : minSemana;
            const max = esFinDeSemana ? maxFinSemana : maxSemana;
            const cantidad = Math.floor(Math.random() * (max - min + 1)) + min;
            datosSemana.push({
                dia: `Día ${i + 1}`,
                cantidad
            });

            // Asegura una variación máxima del 20% para la semana anterior
            const variacionMax = cantidad * 0.2;
            const cantidadAnterior = Math.floor(Math.random() * (variacionMax * 2 + 1)) + cantidad - variacionMax;
            datosAnteriores.push({
                dia: `Día ${i + 1}`,
                cantidad: cantidadAnterior
            });
        }

        return { datosSemanaActual: datosSemana, datosSemanaAnterior: datosAnteriores };
    };

    useEffect(() => {
        const { datosSemanaActual, datosSemanaAnterior } = obtenerDatosSimulados(
            7,  // Total de días
            500, // Mínimo en días de semana
            1000, // Máximo en días de semana
            1000, // Mínimo en fin de semana
            2000 // Máximo en fin de semana
        );
        setConsumoSemanaActual(datosSemanaActual);
        setConsumoSemanaAnterior(datosSemanaAnterior);
    }, []);
    
    return { consumoSemanaActual, consumoSemanaAnterior };
}

export default ConsumoDiarioIng;
