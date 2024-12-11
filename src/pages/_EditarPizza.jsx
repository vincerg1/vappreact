import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreateMenuForm from './_Menu_p2_crearMenu';

const EditarPizza = () => {
  const { pizzaId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    Nombre: '',
    Categoria: '',
    selectSize: [],
    PriceBySize: { S: '', M: '', L: '', XL: '', XXL: '', ST: '' },
    Ingredientes: [],
    metodoCoccion: '',
    imagen: null,
  });
  const [imageFile, setImageFile] = useState(null); // Estado para manejar el archivo de imagen
  
  useEffect(() => {
    if (pizzaId) {
      const fetchPizzaData = async () => {
        try {
          const response = await axios.get(`http://localhost:3001/menu_pizzas/${pizzaId}`);
          if (response.data && response.data.data) {

            const ingredientesParsed = JSON.parse(response.data.data.ingredientes);

            setFormData({
              ...response.data.data,
              Nombre: response.data.data.nombre || '',
              Categoria: response.data.data.categoria || '',
              selectSize: JSON.parse(response.data.data.selectSize) || [],
              PriceBySize: response.data.data.PriceBySize ? JSON.parse(response.data.data.PriceBySize) : {},
              Ingredientes: ingredientesParsed || [],
              metodoCoccion: response.data.data.metodoCoccion || '',
              imagen: response.data.data.imagen || null,

            });

        
          } else {
            // Manejar la ausencia de datos o un formato de datos incorrecto
            console.error('Datos de pizza no encontrados o en formato incorrecto:', response.data);
            setMessage('Datos de pizza no encontrados o en formato incorrecto');
          }
          
          console.log('selectSize after fetch', formData.selectSize);

        } catch (error) {
          if (error.response && error.response.status === 404) {
            setMessage('Pizza no encontrada');
          } else {
            console.error('Error al cargar los datos de la pizza:', error);
            setMessage('Error al cargar los datos de la pizza');
          }
        }
      };
      fetchPizzaData();
    }
  }, [pizzaId]);

  useEffect(() => {
    console.log('formData actualizado:', formData);
  }, [formData]);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleUpdatePizza = async (updatedFormData) => {
    const dataToSend = new FormData();
    Object.entries(updatedFormData).forEach(([key, value]) => {
      if (key !== 'imagen') {
        dataToSend.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });
    if (imageFile) {
      dataToSend.append('imagen', imageFile, imageFile.name);
    }
    try {
      const response = await axios.patch(`http://localhost:3001/menu_pizzas/${pizzaId}`, dataToSend);
      console.log(response.data);
      navigate('/_Inicio/_Menu_p1/_MenuOverview');
    } catch (error) {
      console.error('Error al actualizar la pizza:', error);
    }
  };
  

  console.log('estructura del fomrdata en la edicion de pizza', formData)

  return formData ? (
<CreateMenuForm
  pizzaData={formData}
  isEditMode={true}
  onImageChange={handleImageChange}
  onSubmit={(formData, action) => {
    if (action === 'update') {
      handleUpdatePizza(formData);
    }
  }}
/>
  ) : (
    <p>Cargando...</p>
  );
};



export default EditarPizza;
