// CustomNode.jsx
import React from 'react';
import { Handle } from 'react-flow-renderer';

const CustomNode = ({ data }) => {
  return (
    <div
      style={{
        background: '#1af406',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: '0.85rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* 🔽 Handle de entrada (arriba), invisible */}
      <Handle
        type="target"
        position="top"
        style={{ opacity: 0, width: 0, height: 0 }}
        isConnectable={false}
      />
      
      <div style={{ flex: '1 1 auto', marginRight: '8px' }}>
        <strong>{data.index}</strong> {data.pedidoId}
      </div>
      
      <button
        onClick={() => data.onClick(data.pedidoId)}
        style={{
          background: '#00c8ff',
          color: '#ffffff',
          border: 'none',
          padding: '4px 8px',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
       See More
      </button>

      {/* 🔼 Handle de salida (abajo), invisible */}
      <Handle
        type="source"
        position="bottom"
        style={{ opacity: 0, width: 0, height: 0 }}
        isConnectable={false}
      />
    </div>
  );
};

export default CustomNode;
