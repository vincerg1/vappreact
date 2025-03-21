import React from 'react';
import axios from 'axios';

const WarningModal = ({ warnings, onConfirm, onClose, setWarningsDashboard, setWarningActive }) => {
  const handleAcknowledgeWarnings = async () => {
    console.log("📤 [LOG] Enviando advertencias a la BD:", warnings);
    const dismissedWarningIds = warnings.map(w => w.id); // 🔥 Extraer solo los IDs

    try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/dismiss-warnings`, { warnings: dismissedWarningIds });

      console.log("✅ [LOG] Respuesta del servidor:", response.data);

      // ✅ Limpiar advertencias y apagar parpadeo
      setWarningsDashboard([]);
      setWarningActive(false);
      onClose();
    } catch (error) {
      console.error("❌ [ERROR] No se pudieron guardar las advertencias en la BD:", error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content warning-modal">
        <h2>Advertencias</h2>
        {warnings.length > 0 ? (
          warnings.map((w, index) => <p key={index}>{w.message}</p>)
        ) : (
          <p>No hay advertencias activas.</p>
        )}
        <button className="btn-primary" onClick={handleAcknowledgeWarnings}>
          Entendido
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default WarningModal;
