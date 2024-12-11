import { useState } from 'react';

const ReviewForm = ({ email, onClose }) => {
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);
  const [errorMessage, setErrorMessage] = useState("");

  // Verificar si el email está siendo recibido
  console.log('Email recibido en el formulario:', email);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !review || !rating) {
      setErrorMessage("Faltan datos para enviar el review.");
      return;
    }

    if (review.length > 255) {
      setErrorMessage("El review no debe superar los 255 caracteres.");
      return;
    }

    fetch('http://localhost:3001/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, review, rating }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Review enviado correctamente.');
        onClose();  // Cerrar el formulario al enviar el review
      } else {
        setErrorMessage(data.message || 'Error enviando el review.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error en la conexión.');
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Review:</label>
        <textarea 
          value={review} 
          onChange={(e) => setReview(e.target.value)} 
          maxLength="255" 
          required 
        />
        <p>{255 - review.length} caracteres restantes</p>
      </div>
      <div>
        <label>Puntuación:</label>
        <select value={rating} onChange={(e) => setRating(e.target.value)} required>
          {[1, 2, 3, 4, 5].map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      <button type="submit">Enviar Review</button>
    </form>
  );
};

export default ReviewForm;
