import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/FormPartner.css'; 

function PartnerCreator({ partnerData, onSubmit }) {
  const [formData, setFormData] = useState({
    IDI: '',
    categoria: '',
    subcategoria: '',
    producto: '',
    precio: '',
    imagen: null
  });
  const [partnerOptions, setPartnerOptions] = useState({});
  const [isEditMode, setEditMode] = useState(false);
  const [imageFile, setImageFile] = useState(null); 
  const navigate = useNavigate();
  const { partnerId } = useParams();

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const response = await fetch('http://localhost:3001/inventario-partner');
        const result = await response.json();
  
        if (result.message === 'success') {
          const partnersOrganizados = result.data.reduce((acc, item) => {
            if (!acc[item.subcategoria]) {
              acc[item.subcategoria] = [];
            }
            acc[item.subcategoria].push({ producto: item.producto, IDI: item.IDI }); // Incluimos el IDI
            return acc;
          }, {});
  
          setPartnerOptions(partnersOrganizados);
        }
      } catch (error) {
        console.error("Error cargando los datos de Partner:", error);
      }
    };
  
    fetchPartners();
  }, []);
  useEffect(() => {
    if (partnerId) {
      const loadPartnerData = async () => {
        try {
          const response = await fetch(`http://localhost:3001/PartnerData/${partnerId}`);
          const result = await response.json();

          if (result.message === 'success') {
            setFormData(result.data);
            setEditMode(true);
          }
        } catch (error) {
          console.error("Error al cargar PartnerData:", error);
        }
      };
      loadPartnerData();
    }
  }, [partnerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
  
    if (name === 'producto') {
      // Buscar el IDI del producto seleccionado
      const selectedProduct = partnerOptions[formData.subcategoria]?.find(p => p.producto === value);
      const IDI = selectedProduct ? selectedProduct.IDI : '';
  
      setFormData(prev => ({ ...prev, [name]: value, IDI })); // Guardamos el IDI junto con el producto
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  const handleImageChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
  
      // Validar formato de archivo
      const validFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validFormats.includes(file.type)) {
        alert("⚠️ Solo se permiten imágenes en formato JPG, PNG o WEBP.");
        return;
      }
  
      // Validar tamaño de archivo (máximo 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        alert("⚠️ La imagen es demasiado grande. Por favor, sube una imagen menor a 2MB.");
        return;
      }
  
      // Verificar dimensiones de la imagen
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = function () {
        const { width, height } = img;
  
        if (width < 300 || height < 300) {
          alert("⚠️ La imagen es muy pequeña. Debe ser al menos 300x300 píxeles.");
          return;
        }
        if (width > 2000 || height > 2000) {
          alert("⚠️ La imagen es muy grande. Intenta subir una imagen de menor tamaño.");
          return;
        }
  
        // Si pasa todas las validaciones, asignar la imagen al estado y formData
        setImageFile(file);
        setFormData(prev => ({ ...prev, imagen: file }));
      };
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!formData.IDI) {
      alert("❌ Error: No se pudo encontrar el IDI del producto seleccionado.");
      return;
    }
  
    const submitFormData = new FormData();
    submitFormData.append('IDI', formData.IDI); // Agregamos el IDI
    submitFormData.append('categoria', formData.categoria || 'Partner');
    submitFormData.append('subcategoria', formData.subcategoria);
    submitFormData.append('producto', formData.producto);
    submitFormData.append('precio', formData.precio);
  
    if (imageFile) {
      submitFormData.append('imagen', imageFile, imageFile.name);
    } else if (!isEditMode) {
      submitFormData.append('imagen', '');
    }
  
    const url = isEditMode
      ? `http://localhost:3001/PartnerData/${partnerId}`
      : 'http://localhost:3001/PartnerData';
    const method = isEditMode ? 'PATCH' : 'POST';
  
    try {
      const response = await fetch(url, { method, body: submitFormData });
      if (!response.ok) {
        throw new Error("Error al procesar el formulario");
      }
      navigate('/_Inicio/_Menu_p1/_MenuOverview');
    } catch (error) {
      console.error("Error en la petición:", error);
      alert(`Error: ${error.message}`);
    }
  };
  const handleNavigate = () => {
    navigate('/_Inicio/_Menu_p1/_MenuOverview');
  };

 return (
<div className="partner-form-container">
  <form onSubmit={handleSubmit} className="partner-form">
    <h1 className="partner-form-title">
      {isEditMode ? 'Editar Partner' : 'Crear Partner'}
    </h1>

    {/* Botón de cerrar/navegar flotante */}
    <button onClick={handleNavigate} className="IrMenuOver">
      Ir al Menú Overview
    </button>

    <div className="partner-form-group">
      <label>Subcategoría:</label>
      <select name="subcategoria" value={formData.subcategoria} onChange={handleChange}>
        <option value="">Seleccione una subcategoría</option>
        {Object.keys(partnerOptions).map(subcategoria => (
          <option key={subcategoria} value={subcategoria}>{subcategoria}</option>
        ))}
      </select>
    </div>
    {formData.subcategoria && (
        <div className="partner-form-group">
          <label>Producto:</label>
          <select name="producto" value={formData.producto} onChange={handleChange}>
            <option value="">Seleccione un producto</option>
            {partnerOptions[formData.subcategoria]?.map(({ producto }) => (
              <option key={producto} value={producto}>{producto}</option>
            ))}
          </select>
        </div>
      )}
    <div className="partner-form-group">
      <label>Precio:</label>
      <input type="number" name="precio" step="0.01" value={formData.precio} onChange={handleChange} min="0" />
    </div>

    <div className="partner-form-group">
      <label>Imagen:</label>
      <input type="file" name="imagen" onChange={handleImageChange} />
      {formData.imagen && typeof formData.imagen === 'string' && (
        <img
          src={`http://localhost:3001/${formData.imagen}`}
          alt="Imagen actual"
          className="partner-image-preview"
        />
      )}
    </div>

    <button type="submit" className="partner-form-button">
      {isEditMode ? 'Actualizar' : 'Crear'}
    </button>
  </form>
</div>
);
  
}

export default PartnerCreator;
