import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import _PizzaContext from './_PizzaContext.jsx';
import { determinarZonaRiesgo, zonaDeRiesgoToString} from './_ListaIngredientes'
import SidePanel from './_SidePanel.jsx';
import axios from 'axios';
import GraficoConsumoIngredientes from './GraficoConsumoIngredientes';
import ConsumoDiarioIng from './ConsumoDiarioIng';
import KPIContainer from './KPIContainer.jsx';
import '../styles/invDB.css';
import qrImage from '../vapp-img/DALL.png'; 
import QRCode from 'qrcode.react';
// import { ingredientesEnSeguimiento} from './_ListaIngredientes.jsx'

const _InvIngDB = () => {
  const {ingredientesPorZonaRiesgo, ingredientes, riesgos, setRiesgos, zonaRiesgoPorIDI  } = useContext(_PizzaContext);
  const { consumoSemanaActual, consumoSemanaAnterior } = ConsumoDiarioIng();
  const [inventarioFiltrado, setInventarioFiltrado] = useState([]);
  const [isPanelVisible, setPanelVisible] = useState(false);
  const [totalInventario, setTotalInventario] = useState(0);
  const [filtroRiesgo, setFiltroRiesgo] = useState('todos');
  const [categoriaRiesgoActual, setCategoriaRiesgoActual] = useState('');
  const [riesgoSeleccionado, setRiesgoSeleccionado] = useState(null);
  const [ingredientesFiltrados, setIngredientesFiltrados] = useState([]);
  
  const navigate = useNavigate();
 
  // useEffect(() => {
  //   console.log('Los riesgos desde el Contexto:', riesgos);
  //   console.log('Los ingredientesPorZonaRiesgo desde el Contexto:', ingredientesPorZonaRiesgo);
  // }, [riesgos, ingredientesPorZonaRiesgo]);
  useEffect(() => {
    // console.log('Zona de riesgo por IDI desde el Contexto:', zonaRiesgoPorIDI);
  }, [zonaRiesgoPorIDI]);

  const mostrarPanelPorRiesgo = (zonaRiesgo) => {
    setIngredientesFiltrados(ingredientesPorZonaRiesgo[zonaRiesgo]);
    setPanelVisible(true);
  };


const yourData = [];
// const filterIngredientsByRisk = (riskCategory) => {
//     // Asumiendo que 'yourData' es un array de objetos de ingredientes y 'riesgo' es una propiedad de esos objetos
//     return yourData.filter(ingredientes => ingredientes.riesgo === riskCategory);
// };
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


// console.log('El panel lateral está visible:', isPanelVisible);

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
        <button className={`riesgo sinRiesgo`} 
        onClick={() => mostrarPanelPorRiesgo('sinRiesgo')}>
        <span>{riesgos.sinRiesgo}</span>
        <label>Seguro</label>
        </button>

        <button className={`riesgo bajo`} 
        onClick={() => mostrarPanelPorRiesgo('bajo')}>
        <span>{riesgos.bajo}</span>
        <label>Bajo</label>
        </button>
        <button className={`riesgo medio`} 
        onClick={() => mostrarPanelPorRiesgo('medio')}>
        <span>{riesgos.medio}</span>
        <label>Medio</label>
        </button>
        <button className={`riesgo alto`} 
        onClick={() => mostrarPanelPorRiesgo('alto')}>
        <span>{riesgos.alto}</span>
        <label>Alto</label>
        </button>
        <button className={`riesgo inactivo`} 
        onClick={() => mostrarPanelPorRiesgo('inactivo')}>
        <span>{riesgos.inactivo}</span>
        <label>Inactivo</label>
        </button>
      </div>
        <GraficoConsumoIngredientes
          datosSemanaActual={consumoSemanaActual}
          datosSemanaAnterior={consumoSemanaAnterior}
       />
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
