import React, { useState } from 'react';
import Switch from 'react-switch';
import formularios from '../styles/formularios.css'

const PaymentMethods = () => {
  const [bizumEnabled, setBizumEnabled] = useState(false);
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [metamaskEnabled, setMetamaskEnabled] = useState(false);
  const [bank1Enabled, setBank1Enabled] = useState(false);
  const [bank2Enabled, setBank2Enabled] = useState(false);
  const [bizumInfo, setBizumInfo] = useState('');
  const [paypalInfo, setPaypalInfo] = useState('');
  const [metamaskInfo, setMetamaskInfo] = useState('');
  const [bank1Info, setBank1Info] = useState('');
  const [bank2Info, setBank2Info] = useState('');

  return (
    <div >
      <div>
      <h1 className="PDCRL">Panel de Control / Otros Medios de Pago </h1>
        <div className='Otros_MP'>
            <h2>Edita los Medios de Pago Alternativos</h2>
        <div>
        <label>Bizum:</label>
                <Switch
                onChange={(checked) => setBizumEnabled(checked)}
                checked={bizumEnabled}
                />
                {bizumEnabled && (
                <input
                    className="react-switch"
                    type="text"
                    placeholder="Información de Bizum"
                    value={bizumInfo}
                    onChange={(e) => setBizumInfo(e.target.value)}
                />
                )}
          </div>        
      <div>
        <label>PayPal:</label>
        <Switch
          onChange={(checked) => setPaypalEnabled(checked)}
          checked={paypalEnabled}
        />
        {paypalEnabled && (
          <input
            className="react-switch"
            type="text"
            placeholder="Información de PayPal"
            value={paypalInfo}
            onChange={(e) => setPaypalInfo(e.target.value)}
          />
        )}
      </div>

      <div>
        <label>MetaMask:</label>
        <Switch
          onChange={(checked) => setMetamaskEnabled(checked)}
          checked={metamaskEnabled}
        />
        {metamaskEnabled && (
          <input
          className="react-switch"
            type="text"
            placeholder="Información de MetaMask"
            value={metamaskInfo}
            onChange={(e) => setMetamaskInfo(e.target.value)}
          />
        )}
      </div>

      <div>
        <label>Transferencia Banco 1:</label>
        <Switch
          onChange={(checked) => setBank1Enabled(checked)}
          checked={bank1Enabled}
        />
        {bank1Enabled && (
          <input
          className="react-switch"
            type="text"
            placeholder="Información de Banco 1"
            value={bank1Info}
            onChange={(e) => setBank1Info(e.target.value)}
          />
        )}
      </div>

      <div>
        <label>Transferencia Banco 2:</label>
        <Switch
          onChange={(checked) => setBank2Enabled(checked)}
          checked={bank2Enabled}
        />
        {bank2Enabled && (
          <input
            className="react-switch"
            type="text"
            placeholder="Información de Banco 2"
            value={bank2Info}
            onChange={(e) => setBank2Info(e.target.value)}
          />
        )}
      </div>
    </div>
    </div>
    </div>
  );
};

export default PaymentMethods;
