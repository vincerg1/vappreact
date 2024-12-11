import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/menu.css';


function PartnerCreator({partnerData, onSubmit}) {
  const [formData, setFormData] = useState({
    categoria: '',
    subcategoria: '',
    producto: '',
    precio: '',
    imagen: null
  });
  const [partners, setPartners] = useState([]); 
  const [showPartners, setShowPartners] = useState(false);
  const [isEditMode, setEditMode] = useState(false);
  const navigate = useNavigate();
 const { partnerId } = useParams();
 
  const categorias = {
    Partner: { // Nueva categoría general para Partners
      Complementos: {
        Complementos: ['Pan de Ajo', 'Lasaña'],
      },
      Bebidas: {
        Vinos: ['Lambrusco'],
        Refrescos: ['Coca Cola Original'],
      },
      Postres: {
        Helados: ['Chocolate', 'Coco'],
        Tarta: ['Tarta'],
      },
    }
  };
  

  useEffect(() => {
    if (partnerId && !partnerData) {
      loadPartnerData(partnerId);
    }
  }, [partnerId]);
  useEffect(() => {
    if (partnerData) {
      setFormData(partnerData);
      setEditMode(true);
    } else if (partnerId) {
      loadPartnerData(partnerId);
    }
  }, [partnerData, partnerId]);
  
  const loadPartnerData = async (id) => {
    try {
      const response = await fetch(`http://localhost:3001/PartnerData/${id}`);
      const data = await response.json();
      setFormData(data); // Aquí asumimos que 'data' ya tiene la propiedad 'imagen' con la URL correcta
      setEditMode(true);
    } catch (error) {
      console.error("Error al cargar datos del partner", error);
    }
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFormData(prev => ({ ...prev, imagen: e.target.files[0] }));
    }
  };
  const handleImageChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file && file instanceof File) {
        setFormData({ ...formData, imagen: file });
      } else {
        console.error('El archivo seleccionado no es válido');
      }
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const submitFormData = new FormData();
    submitFormData.append('categoria', formData.categoria);
    submitFormData.append('subcategoria', formData.subcategoria);
    submitFormData.append('producto', formData.producto);
    submitFormData.append('precio', formData.precio);
    
    if (formData.imagen && formData.imagen instanceof Blob) {
      submitFormData.append('imagen', formData.imagen, formData.imagen.name);
    } else if (isEditMode) {
      // Si estás en modo de edición pero no se seleccionó una nueva imagen, 
      // puedes decidir no enviar la imagen o manejarlo de alguna manera específica.
    }
  
    const url = isEditMode ? `http://localhost:3001/PartnerData/${partnerId}` : 'http://localhost:3001/PartnerData';
    const method = isEditMode ? 'PATCH' : 'POST';
  
    try {
      const response = await fetch(url, {
        method: method,
        body: submitFormData,
      });
  
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Error al procesar el formulario");
      }
  
      const data = await response.json();
      console.log("Partner creado o actualizado con éxito!", data);
      navigate('/_Inicio/_Menu_p1/_MenuOverview'); // Ajusta esta ruta según sea necesario
    } catch (error) {
      console.error("Error en la petición:", error);
      alert(`Error: ${error.message || error.toString()}`);
    }
  };
  
  
  



  return (
    <div>
      <h1 className="PDCRL">Partner Creator</h1>
     <h1>{partnerData ? 'Editar Partner' : 'Crear Partner'}</h1>
     <form onSubmit={handleSubmit}>
      <div>
        <label>Categoría:</label>
        <select 
        name="categoria" 
        value={formData.categoria} 
        onChange={handleChange}>
          <option value="">Seleccione una categoría</option>
          {Object.keys(categorias.Partner).map(categoria => (
            <option key={categoria} value={categoria}>{categoria}</option>
          ))}
        </select>
      </div>
      
      {formData.categoria && (
        <div>
          <label>Subcategoría:</label>
          <select 
          name="subcategoria" 
          value={formData.subcategoria}
           onChange={handleChange}>
            <option value="">Seleccione una subcategoría</option>
            {Object.keys(categorias.Partner[formData.categoria]).map(subcategoria => (
              <option key={subcategoria} value={subcategoria}>{subcategoria}</option>
            ))}
          </select>
        </div>
      )}

      {formData.subcategoria && (
        <div>
          <label>Producto:</label>
          <select name="producto" value={formData.producto} onChange={handleChange}>
            <option value="">Seleccione un producto</option>
            {categorias.Partner[formData.categoria][formData.subcategoria].map(producto => (
              <option key={producto} value={producto}>{producto}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label>Precio:</label>
        <input
          type="number"
          name="precio"
          step="0.01"
          value={formData.precio}
          onChange={handleChange}
          placeholder="Precio"
          min="0"
        />
      </div>

      {formData.imagen && typeof formData.imagen === 'string' && (
  // Asegúrate de que la ruta de la imagen sea accesible desde el frontend
  <div>
    <label>Imagen actual:</label>
    <img 
      src={`http://localhost:3001/${formData.imagen}`} 
      alt="Imagen actual del partner"
      className="image-preview" 
    />
  </div>
)}
<div>
  <input
    type="file"
    name="imagen"
    onChange={handleImageChange}
  />
</div>



    <button type="submit">{isEditMode ? 'Actualizar Partner' : 'Crear Partner'}</button>
     
      
        

    </form>
    </div>
  );
}

export default PartnerCreator;
