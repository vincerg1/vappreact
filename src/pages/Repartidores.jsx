import { useNavigate } from 'react-router-dom';
import '../styles/Repartidores.css';

const Repartidores = () => {
    const navigate = useNavigate();
    
    return (
        <div>
            <div className="repartidores-container">
                <h1 className="repartidores-title">Manage Delivery</h1>
                <div className="button-container-rep">
                    <button className="repartidores-button" onClick={() => navigate('/repartidores/lista')}>
                        <span>View List</span>
                    </button>
                    <button className="repartidores-button" onClick={() => navigate('/repartidores/crear')}>
                        <span>Create Delivery</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Repartidores;
