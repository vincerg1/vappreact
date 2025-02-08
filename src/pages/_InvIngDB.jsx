import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import _PizzaContext from './_PizzaContext.jsx';
import SidePanel from './_SidePanel.jsx';
import axios from 'axios';
import GraficoConsumoIngredientes from './GraficoConsumoIngredientes';
import ConsumoDiarioIng from './ConsumoDiarioIng';
import KPIContainer from './KPIContainer.jsx';
import '../styles/invDB.css';
import QRCode from 'qrcode.react';


const _InvIngDB = () => {
  const {ingredientesPorZonaRiesgo, ingredientes, riesgos, setRiesgos, zonaRiesgoPorIDI  } = useContext(_PizzaContext);
  const { consumoSemanaActual, consumoSemanaAnterior } = ConsumoDiarioIng();
  const [isPanelVisible, setPanelVisible] = useState(false);
  const [totalInventario, setTotalInventario] = useState(0);
  const [filtroRiesgo, setFiltroRiesgo] = useState('todos');
  const [ingredientesFiltrados, setIngredientesFiltrados] = useState([]);
  const [topIngredientes, setTopIngredientes] = useState([]);
  const [ingredientesMenosUsados, setIngredientesMenosUsados] = useState([]);
  const [graficoData, setGraficoData] = useState(null);
  const [loadingGrafico, setLoadingGrafico] = useState(true); // Estado de carga

  const navigate = useNavigate();
 

useEffect(() => {
    // console.log('Zona de riesgo por IDI desde el Contexto:', zonaRiesgoPorIDI);
}, [zonaRiesgoPorIDI]);
useEffect(() => {
  const fetchIngredientesUso = async () => {
    try {
      const response = await axios.get("http://localhost:3001/api/ingredientes-uso");
      if (response.data && Array.isArray(response.data)) {
        console.log("📊 Ponderación completa de ingredientes:", response.data);

        const ingredientesOrdenados = response.data.sort((a, b) => b.total_vendido - a.total_vendido);
        const totalGeneral = ingredientesOrdenados.reduce((sum, ing) => sum + ing.total_vendido, 0);

        const top10 = ingredientesOrdenados.slice(0, 10).map(ing => ({
          ...ing,
          porcentaje: ((ing.total_vendido / totalGeneral) * 100).toFixed(2),
          consumoDiario: JSON.parse(ing.consumo_diario), // Transformamos el JSON en array
          promedioSemanal: ing.promedio_semanal
        }));

        setTopIngredientes(top10);

        // Verificación de que consumoDiario tenga datos válidos
        const consumoValido = top10.every(ing => Array.isArray(ing.consumoDiario) && ing.consumoDiario.length > 0);
        if (!consumoValido) {
          console.warn("⚠️ Advertencia: Algunos ingredientes no tienen datos de consumo diario.");
        }

        // Preparar datos para el gráfico de consumo
        const datosGrafico = {
          labels: Array.from({ length: 7 }, (_, i) => `Día ${i + 1}`),
          datasets: [
            {
              label: "Consumo Diario (Total)",
              data: top10.reduce((acc, ing) => {
                ing.consumoDiario.forEach((cantidad, index) => {
                  acc[index] = (acc[index] || 0) + cantidad;
                });
                return acc;
              }, new Array(7).fill(0)), // Asegurar que haya 7 elementos
              borderColor: "rgba(75, 192, 192, 1)",
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderWidth: 2,
            },
            {
              label: "Promedio Semanal",
              data: Array(7).fill(
                top10.reduce((acc, ing) => acc + ing.promedioSemanal, 0) / top10.length
              ),
              borderColor: "rgba(255, 99, 132, 1)",
              backgroundColor: "rgba(255, 99, 132, 0.2)",
              borderWidth: 2,
              borderDash: [5, 5],
            }
          ]
        };

        setGraficoData(datosGrafico);
        setLoadingGrafico(false); // Datos listos
        console.log("📉 Datos preparados para el gráfico:", datosGrafico);
      }
    } catch (error) {
      console.error("❌ Error al obtener datos de ingredientes:", error);
      setLoadingGrafico(false); // En caso de error, dejamos de cargar
    }
  };

  fetchIngredientesUso();
}, []);

  
  

const mostrarPanelPorRiesgo = (zonaRiesgo) => {
    setIngredientesFiltrados(ingredientesPorZonaRiesgo[zonaRiesgo]);
    setPanelVisible(true);
};
const handleClosePanel = () => {
  setPanelVisible(false);
};
const navigateToIngredientList = (filteredData) => {
    // Aquí configurarías tus datos filtrados en el estado global, almacenamiento local, o los pasarías a través del estado al usar navigate
    navigate('/ingredient-list', { state: { filteredData } });
};
const handleViewDetails = () => {
    // Lógica para manejar la vista de detalles
    // Podrías querer navegar a una página de detalles con los datos filtrados
    navigate('/_Inicio/_InvIngDB/_ListaIngredientes', { state: { /* datos filtrados */ } });
};
const calcularInventarioTotal = (listaInventario) => {
  return listaInventario.reduce((total, item) => total + item.disponible, 0);
};
const handleQRClick = () => {
    navigate('/_Inicio/_InvIngDB/ActualizaStock');
};
const irAListaIngredientes = () => {
    navigate('/_Inicio/_InvIngDB/_ListaIngredientes');
};
const handleGoBack = () => {
    // Navegar a la ruta raíz o a cualquier otra que sea considerada como "inicio"
    navigate('/_Inicio');
};

  return (
    <div className="resto-del-dashboard">
      <h1 className="PDCRL">Dashboard de Ingredientes</h1>
      
        {isPanelVisible && (
          <SidePanel 
            data={ingredientesFiltrados} 
            onClose={handleClosePanel} 
            onViewDetails={handleViewDetails}
          />
        )}

<section className='dashboard2'>
  <div className="left-section">
    <h1>Actualiza Stock (Compras)</h1>
    <div onClick={handleQRClick}>
      <QRCode 
        value={`${window.location.origin}/_Inicio/_InvIngDB/ActualizaStock`} 
        size={760} 
        bgColor="transparent" 
        fgColor="#000000"
        level="Q" 
      />
    </div>
  </div>

  <div className="right-section">
    <div className="riesgos-container">
      <h2>Zonas de Riesgo </h2>
      <button className={`riesgo sinRiesgo`} onClick={() => mostrarPanelPorRiesgo('sinRiesgo')}>
        <span>{riesgos.sinRiesgo}</span> <label>Seguro</label>
      </button>
      <button className={`riesgo bajo`} onClick={() => mostrarPanelPorRiesgo('bajo')}>
        <span>{riesgos.bajo}</span> <label>Bajo</label>
      </button>
      <button className={`riesgo medio`} onClick={() => mostrarPanelPorRiesgo('medio')}>
        <span>{riesgos.medio}</span> <label>Medio</label>
      </button>
      <button className={`riesgo alto`} onClick={() => mostrarPanelPorRiesgo('alto')}>
        <span>{riesgos.alto}</span> <label>Alto</label>
      </button>
      <button className={`riesgo inactivo`} onClick={() => mostrarPanelPorRiesgo('inactivo')}>
        <span>{riesgos.inactivo}</span> <label>Inactivo</label>
      </button>
    </div>

    <div className="info-container">
    <div className="grafico-section">
  {loadingGrafico ? (
    <p className="loading-mensaje"> 🔄 Cargando datos del gráfico...</p>
  ) : graficoData && graficoData.labels ? (
    <GraficoConsumoIngredientes datos={graficoData} />
  ) : (
    <p className="error-mensaje">⚠️ No hay datos suficientes para mostrar el gráfico.</p>
  )}
</div>

      <div className="top-ingredientes-section">
    <h3>🥇 Top 10 Ingredientes Más Vendidos</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Ingrediente</th>
          <th>% Participación</th>
        </tr>
      </thead>
      <tbody>
        {topIngredientes.map((ing, index) => (
          <tr key={ing.IDI}>
            <td>{index + 1}</td>
            <td>{ing.ingrediente}</td>
            <td>{ing.porcentaje}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
 

    <KPIContainer 
      className='KPIContainer'
      datosInventario={totalInventario} 
      datosConsumo={consumoSemanaActual}
    />
    
    <div className="navigation-buttons-container">
      <button className="BGLING" onClick={irAListaIngredientes}>Lista de Ingredientes</button>
      <button className="volver" onClick={handleGoBack}>Volver al Panel</button>
    </div>
    
    <h2 className='kpind'>kpi zone</h2>
  </div>
</section>


    </div>
  );
};

export default _InvIngDB;
