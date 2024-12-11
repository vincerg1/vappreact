import React, { useState, useEffect } from 'react';

export default function DateFilter({ onChange }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const formattedNow = now.toISOString().split('T')[0];
    const formattedSevenDaysAgo = sevenDaysAgo.toISOString().split('T')[0];

    setStartDate(formattedSevenDaysAgo);
    setEndDate(formattedNow);

    onChange(formattedSevenDaysAgo, 'startDate');
    onChange(formattedNow, 'endDate');
  }, []);

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    onChange(e.target.value, 'startDate');
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    onChange(e.target.value, 'endDate');
  };

  return (
    <div>
      <label>
        Fecha Inicio:
        <input type="date" value={startDate} onChange={handleStartDateChange} />
      </label>
      <label>
        Fecha Fin:
        <input type="date" value={endDate} onChange={handleEndDateChange} />
      </label>
    </div>
  );
}
