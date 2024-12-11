// DailyChallengeForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

const DailyChallengeForm = () => {
  const [img, setImg] = useState(null);
  const [link, setLink] = useState('');
  const [comments, setComments] = useState('');
  const [minDiscount, setMinDiscount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [assignedCoupons, setAssignedCoupons] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleImgChange = (e) => {
    setImg(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('img', img);  // Cambié 'image' por 'img'
    formData.append('link', link);
    formData.append('comments', comments);
    formData.append('min_discount', minDiscount);
    formData.append('max_discount', maxDiscount);
    formData.append('assigned_coupons', assignedCoupons);

    axios.post('http://localhost:3001/api/daily-challenge', formData)
      .then((response) => {
        console.log('Respuesta del servidor:', response.data);
        setSuccessMessage('¡Daily Challenge creado exitosamente!');
        // Restablecer el formulario
        setImg(null);
        setLink('');
        setComments('');
        setMinDiscount('');
        setMaxDiscount('');
        setAssignedCoupons('');
      })
      .catch((error) => {
        console.error('Error al crear el Daily Challenge:', error);
      });
  };

  return (
    <div>
      <h2>Create Daily Challenge</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Upload Image:</label>
          <input type="file" onChange={handleImgChange} required />
        </div>
        <div>
          <label>Link:</label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Enter the link for the challenge"
            required
          />
        </div>
        <div>
          <label>Comments:</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add comments for the challenge"
          />
        </div>
        <div>
          <label>Minimum Discount (%):</label>
          <input
            type="number"
            value={minDiscount}
            onChange={(e) => setMinDiscount(e.target.value)}
            placeholder="Enter minimum discount"
            required
          />
        </div>
        <div>
          <label>Maximum Discount (%):</label>
          <input
            type="number"
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(e.target.value)}
            placeholder="Enter maximum discount"
            required
          />
        </div>
        <div>
          <label>Assigned Coupons:</label>
          <input
            type="number"
            value={assignedCoupons}
            onChange={(e) => setAssignedCoupons(e.target.value)}
            placeholder="Enter the number of available coupons"
            required
          />
        </div>
        <button type="submit">Create Challenge</button>
      </form>
      {successMessage && <p>{successMessage}</p>}
    </div>
  );
};

export default DailyChallengeForm;
