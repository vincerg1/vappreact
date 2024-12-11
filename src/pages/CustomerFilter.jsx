import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CustomerFilter({ onChange }) {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('http://localhost:3001/clientes');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers', error);
    }
  };

  return (
    <div>
      <label>Cliente: </label>
      <select onChange={(e) => onChange(e.target.value)}>
        <option value="ALL">ALL</option>
        {customers.map((customer) => (
          <option key={customer.id_cliente} value={customer.id_cliente}>
            {customer.email}
          </option>
        ))}
      </select>
    </div>
  );
}
