import React from 'react';
import { LineChart, Line, XAxis, YAxis } from 'recharts';

const _MiniGrafico = ({ datos }) => {
  return (
    <LineChart width={150} height={50} data={datos}>
      <Line type="monotone" dataKey="cantidad" stroke="#8884d8" strokeWidth={2} />
      <XAxis dataKey="dia" hide={true} />
      <YAxis hide={true} />
    </LineChart>
  );
};

export default _MiniGrafico;