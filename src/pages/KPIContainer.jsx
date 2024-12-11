// KPIs.js
import React, { useState, useEffect } from 'react';
import '../styles/invDB.css';

const getBackgroundColor = (value, type) => {
    if (type === 'stockOptimo') {
      return value ? '#4CAF50' : '#F44336'; // Verde si es óptimo, rojo si no lo es
    } else if (type === 'perdidaStock') {
      return value <= 0 ? '#F44336' : '#4CAF50'; // Rojo si hay pérdida, verde si no
    } else {
      return value === 'Alto' ? '#4CAF50' : value === 'Medio' ? '#FFEB3B' : '#F44336'; // Verde para alto, amarillo para medio, rojo para bajo
    }
  };

  const KPI = ({ label, value, type, tooltip }) => {
    const kpiClass = `kpi ${type}`; // Agrega una clase adicional basada en el tipo
    const backgroundColor = getBackgroundColor(value, type);
    return (
      <div
      style={{
        backgroundColor,
      }}
        className={kpiClass}
        title={tooltip}
      >
        {label}
      </div>
    );
  };
// Funciones de cálculo de KPIs (simuladas para la demo)ç
// Simulamos la obtención del inventario actualizado
const inventarioActualizado = () => {
    return Math.floor(Math.random() * 1000); // Simulamos un número
  };
  
  // Simulamos la obtención del total de ingredientes hoy
  const totalIngredientesHoy = () => {
    return Math.floor(Math.random() * 1200); // Simulamos un número mayor para que haya una pérdida
  };
  // Calcula la pérdida de stock
  const calcularPerdidaStock = () => {
    return totalIngredientesHoy() - inventarioActualizado();
  };
  // Clasifica la tasa de rotación
  const clasificarTasaRotacion = (velocidadRotacion) => {
    if (velocidadRotacion > 0.75) return 'Alto';
    if (velocidadRotacion >= 0.25 && velocidadRotacion <= 0.75) return 'Medio';
    return 'Bajo';
  };
  // Componente KPIContainer
  const KPIContainer = ({ datosInventario, datosConsumo, irAListaIngredientes }) => {
    const [stockOptimo, setStockOptimo] = useState(false);
    const [perdidaStock, setPerdidaStock] = useState(0);
    const [tasaRotacion, setTasaRotacion] = useState('');
    useEffect(() => {
      // Suponemos que datosConsumo es un array de objetos con la propiedad 'cantidad'
      const promedioConsumo = datosConsumo.reduce((acc, item) => acc + item.cantidad, 0) / datosConsumo.length;
      const stockNecesario = promedioConsumo * 2; // Ejemplo: Cobertura para 2 días
      setStockOptimo(datosInventario >= stockNecesario);
      const perdida = calcularPerdidaStock();
      setPerdidaStock(perdida);
      const velocidadRotacion = perdida / totalIngredientesHoy(); // Simulamos una velocidad de rotación
      setTasaRotacion(clasificarTasaRotacion(velocidadRotacion));
    }, [datosInventario, datosConsumo]);
  
    // A continuación se renderizan los KPIs
    return (
     
        <div className='KPIContainer'>
        <KPI 
        label="Stock Óptimo" 
        value={stockOptimo} 
        type="stockOptimo"  
        tooltip="El color verde significa que el stock es óptimo."
        />
        <KPI 
        label="Pérdida de Stock" 
        value={perdidaStock} 
        type="perdidaStock" 
        tooltip="El color rojo significa que hay pérdidas en el stock."
        />
        <KPI 
        label="Nivel Rotación" 
        value={tasaRotacion} 
        type="tasaRotacion" 
        tooltip="El color rojo significa una rotación baja, lo que puede indicar exceso de stock o baja demanda."
        />
      </div>
    );
  };
  
  export default KPIContainer;
  