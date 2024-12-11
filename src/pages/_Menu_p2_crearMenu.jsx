import React, { useState, useContext, useRef, useEffect  } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import _PizzaContext from '../pages/_PizzaContext';
import axios from 'axios';

const CreateMenuForm = ({ pizzaData, onSubmit, isEditMode }) => {
  const [formData, setFormData] = useState({
    Nombre: '',
    Categoria: '',
    selectSize: [],
    PriceBySize: { S: '', M: '', L: '', XL: '', XXL: '', ST: '' },
    Ingredientes: [],
    metodoCoccion: '', 
    imagen: null,
  });
const sizes = ["S", "M", "L", "XL", "XXL", "ST"];
const { ingredientes } = useContext(_PizzaContext);
const ingredientesDeCategoria = ingredientes ? ingredientes.filter(ing => ing.categoria === 'Ingredientes') : [];
const metodosDeCoccion = ["Horneado", "Al vapor", "Hervido", "Salteado", "Frito", "Parrilla", "A leña", "A fuego lento"];
const [imageFile, setImageFile] = useState(null);
const formRef = useRef(null);
const navigate = useNavigate();
const { pizzaId } = useParams()
const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]);

useEffect(() => {
  if (pizzaData) {
  
    setFormData({
      ...pizzaData,
      selectSize: pizzaData.selectSize || [], 
      Ingredientes: pizzaData.Ingredientes ? pizzaData.Ingredientes : [],
    });
  }
}, [pizzaData]);

const ingredientesUnicosPorIDI = Object.values(ingredientes.reduce((acc, ingrediente) => {
  if (ingrediente.categoria === 'Ingredientes' && !acc[ingrediente.IDI]) {
    acc[ingrediente.IDI] = ingrediente;
  }
  return acc;
}, {}));
const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prevFormData => {
    const updatedFormData = { ...prevFormData, [name]: value };
    console.log("Nuevo estado de formData:", updatedFormData);
    return updatedFormData;
  });
};
const handleSizeChange = (e) => {
  const { value, checked } = e.target;
  setFormData(prevFormData => {
    const newSelectSize = checked
      ? [...prevFormData.selectSize, value]
      : prevFormData.selectSize.filter(size => size !== value);
    
  
     const updatedPriceBySize = { ...prevFormData.PriceBySize };
     if (!checked) {
       delete updatedPriceBySize[value];
     }

    return {
      ...prevFormData,
       selectSize: newSelectSize,
       PriceBySize: updatedPriceBySize
    };
  });
};
const handlePriceChange = (e, size) => {
  const { value } = e.target;
  setFormData(prevFormData => ({
    ...prevFormData,
    PriceBySize: {
      ...prevFormData.PriceBySize,
      [size]: value
    }
  }));
}
const addIngredient = () => {
  setFormData(prevData => {
    const cantBySize = {};
    prevData.selectSize.forEach(size => {
      cantBySize[size] = 0;
    });

    return {
      ...prevData,
      Ingredientes: [
        ...prevData.Ingredientes, 
        {  IDI: '', ingrediente: '',  cantBySize } 
      ],
    };
  });
};
const removeIngredient = (index) => {
  setFormData(prevData => {
    const updatedIngredientes = [...prevData.Ingredientes];
    updatedIngredientes.splice(index, 1);
    return { ...prevData, Ingredientes: updatedIngredientes };
  });
};
const handleIngredientChange = (e, index) => {
    const selectedIngredientIDI = e.target.value;

    setFormData(prevData => {
      const updatedIngredientes = prevData.Ingredientes.map((ing, ingIndex) => {
        if (ingIndex === index) {
          // Encuentra el ingrediente seleccionado por su IDI
          const ingredienteSeleccionado = ingredientesUnicosPorIDI.find(ing => ing.IDI === selectedIngredientIDI);
          if (ingredienteSeleccionado) {
            return {
              ...ing,
              IDI: selectedIngredientIDI, // Asegúrate de que esta sea la propiedad que guarda el IDI
              ingrediente: ingredienteSeleccionado.producto,
            };
          } else {
            console.error('No se encontró el ingrediente con el IDI:', selectedIngredientIDI);
            return { ...ing };
          }
        }
        return ing; 
      });

      return {
        ...prevData,
        Ingredientes: updatedIngredientes,
      };
    });
  };
const handleAmountChange = (e, index, size) => {
  const { value } = e.target;

  setFormData((prevData) => {
    const updatedIngredientes = [...prevData.Ingredientes];
    const ingredienteActualizado = { ...updatedIngredientes[index] };

    // Inicializar cantBySize si no existe
    if (!ingredienteActualizado.cantBySize) {
      ingredienteActualizado.cantBySize = {};
    }

  
    ingredienteActualizado.cantBySize[size] = parseInt(value, 10);
    updatedIngredientes[index] = ingredienteActualizado;

    return { ...prevData, Ingredientes: updatedIngredientes };
  });
};
const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    setImageFile(file);
  }
};
const handleImageChange = (e) => {
  if (e.target.files.length > 0) {
    const file = e.target.files[0];
    if (file && file instanceof File) {
      setImageFile(file);
    } else {
      console.error('El archivo seleccionado no es válido');
    }
  }
};
const handleNavigate = () => {
  navigate('/_Inicio/_Menu_p1/_MenuOverview');
};
const handleCreatePizza = async (e, formData, actionType) => {
  e.preventDefault();
  
  // Crear un objeto FormData para enviar
  const dataToSend = new FormData();
  
  // Filtrar precios que no estén vacíos
  const preciosFiltrados = {};
  for (const size in formData.PriceBySize) {
    const precio = formData.PriceBySize[size];
    if (precio !== '' && !isNaN(precio)) {
      preciosFiltrados[size] = precio;
    }
  }
  console.log('Precios filtrados:', preciosFiltrados);

  // Agregar datos básicos al objeto FormData
  dataToSend.append('nombre', formData.Nombre.trim());
  dataToSend.append('categoria', formData.Categoria);
  dataToSend.append('selectSize', JSON.stringify(formData.selectSize));
  dataToSend.append('priceBySize', JSON.stringify(preciosFiltrados));
  
  
  formData.Ingredientes.forEach((ing, index) => {
    const ingredienteData = {
      IDI: ing.IDI, // Este debe ser el ID del ingrediente
      ingrediente: ing.ingrediente, // Este es el nombre del ingrediente
      cantBySize: ing.cantBySize,
    };
    // Añadimos el ingrediente con su ID al FormData
    dataToSend.append(`ingredientes[${index}]`, JSON.stringify(ingredienteData));
  });
  
  
  if (imageFile instanceof File) {
    dataToSend.append('imagen', imageFile, imageFile.name);
  } else {
    console.error('No se ha seleccionado un archivo de imagen o el archivo no es válido');
    return; 
  }
  
  // Establecer el método de cocción
  dataToSend.append('metodoCoccion', formData.metodoCoccion);

  // Debugging: Imprimir los valores del FormData antes de enviar
  for (let [key, value] of dataToSend.entries()) {
    console.log(`${key}:`, value);
  }

  // Intentar enviar los datos al servidor
  try {
    const response = await axios.post('http://localhost:3001/menu_pizzas', dataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log("Pizza creada exitosamente:", response.data);
    alert("Pizza creada exitosamente");
    setFormData({
      Nombre: '',
      Categoria: '',
      selectSize: [],
      PriceBySize: { S: '', M: '', L: '', XL: '', XXL: '', ST: '' },
      Ingredientes: [],
      metodoCoccion: '', 
      imagen: null,
    });
    formRef.current.reset();
    setImageFile(null); 
  } catch (error) {
    console.error('Error al crear la pizza:', error.response?.data || error.message);
    alert("Error al crear la pizza. Por favor, revisa la consola para más detalles.");
  }
  
};


// const handleFormSubmit = async (e) => {
//   e.preventDefault();
  
//   const dataToSend = new FormData();
  
//   Object.entries(formData).forEach(([key, value]) => {
//     if (key !== 'imagen') {
//       dataToSend.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
//     }
//   });

//   if (imageFile && imageFile instanceof Blob) {
//     dataToSend.append('imagen', imageFile, imageFile.name);
//   }

//   const url = isEditMode ? `http://localhost:3001/menu_pizzas/${pizzaId}` : 'http://localhost:3001/menu_pizzas';
//   const method = isEditMode ? 'PATCH' : 'POST';

//   try {
//     const response = await axios({
//       method: method,
//       url: url,
//       data: dataToSend,
//       headers: {
//         'Content-Type': 'multipart/form-data'
//       }
//     });

//     console.log("Respuesta del servidor:", response.data);
//     navigate('/_Inicio/_Menu_p1/_MenuOverview'); // Ajusta esta ruta según sea necesario
//   } catch (error) {
//     console.error("Error en la petición:", error);
//     alert(`Error: ${error.message || error.toString()}`);
//   }
// };


// const handleFormSubmit = (e) => {
//   e.preventDefault();
//   if (isEditMode) {
//     // Actualizar pizza
//     onSubmit(formData, 'update');
//   } else {
//     // Crear pizza
//     handleCreatePizza(e, formData, 'create');
//   }
// };



const handleFormSubmit = async (e) => {
  e.preventDefault();

  if (isEditMode) {
    // En modo de edición, actualizamos la pizza existente
    const dataToSend = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'imagen') {
        dataToSend.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });

    if (imageFile instanceof Blob) {
      dataToSend.append('imagen', imageFile, imageFile.name);
    }

    try {
      const response = await axios({
        method: 'PATCH',
        url: `http://localhost:3001/menu_pizzas/${pizzaId}`,
        data: dataToSend,
      });

      console.log("Respuesta del servidor:", response.data);
      navigate('/_Inicio/_Menu_p1/_MenuOverview');
    } catch (error) {
      console.error("Error en la petición:", error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    }
  } else {
    // Si no estamos en modo de edición, intentamos crear una nueva pizza
    handleCreatePizza(e, formData, 'create');
  }
};







  return (
    <div>
      <h1 className="PDCRL">{pizzaId ? 'Editar Menu' : 'Crear Menu'}</h1>
      <h1>{pizzaId ? 'Editar Pizza' : 'Crear Una Pizza'}</h1>
      <form ref={formRef} className="form_crearpizza" onSubmit={handleFormSubmit}>
        <div>
          <label htmlFor="Nombre">Nombre de la Pizza:</label>
          <input
            type="text"
            id="Nombre"
            name="Nombre"
            value={formData.Nombre}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="Categoria">Categoría:</label>
          <select
            id="Categoria"
            name="Categoria"
            value={formData.Categoria}
            onChange={handleChange}
          >
            <option value="">Seleccione una categoría</option>
            {["Pizza Tradicional", "Pizza Frita", "Pizza Sin Gluten", "Pizza Dulce", "Pizza Molde", "Pizza Frutal", "Calzone"].map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>
        <div className='SizeAndPriceSection'>
          <label>Tamaños y Precios: </label>
        <div className="sizes-prices-container">
        {sizes.map((size) => (
        <div key={size} className="size-price">
          <label className="size-checkbox">
            <input
              type="checkbox"
              name="size"
              value={size}
              checked={formData.selectSize.includes(size)}
              onChange={handleSizeChange}
            />
            
            {size}
            
          </label>
          
            {formData.selectSize.includes(size) && (
              <input
                type="number"
                className="price-input"
                placeholder={`Precio ${size}`}
                value={formData.PriceBySize[size] || ''}
                onChange={(e) => handlePriceChange(e, size)}
              />
              
            )}
            
          </div>
          
        ))}
          </div>
          </div>
          <fieldset>
            
            <legend>Ingredientes Pizza {formData.Nombre}</legend>
            <ul className="ingredientes-container">
              {formData.Ingredientes.map((ingrediente, index) => (
                 <div key={index} className="ingrediente-container">
                  <div>
                    <label htmlFor={`Ingrediente${index}`}>Ingrediente {index + 1}:</label>
                    <select
                    className="ingrediente-select"
                    id={`Ingrediente${index}`}
                    name={`Ingrediente${index}`}
                    value={ingrediente.IDI} 
                    onChange={(e) => handleIngredientChange(e, index)}
                  >
                    <option value="">Seleccione un ingrediente</option>
                    {ingredientesUnicosPorIDI.map((ing) => (
                    <option key={ing.IDI} value={ing.IDI}>
                        {ing.producto}
                      </option>
                    ))}
                  </select>
                  </div>
                  <div className="cantidad-container">
                  {formData.selectSize.map((size) => (
                    <div key={`${index}-${size}`}>
                      <label htmlFor={`Cantidad${index}-${size}`}>{size}:</label>
                      <input
                        className="cantidad-input"
                        type="number"
                        id={`Cantidad${index}-${size}`}
                        name={size}
                        value={ingrediente.cantBySize[size] || 0}
                        onChange={(e) => handleAmountChange(e, index, size)}
                      />
                      
                    </div>
                  
                  ))}
                  </div>
                  <button onClick={() => removeIngredient(index)}>Eliminar</button>
                </div>
              ))}
            </ul>
            <button type="button" onClick={addIngredient} className="add-ingredient-button">
              Agregar Ingrediente!
            </button>
          </fieldset>
          <div>
        <label htmlFor="MetodoCoccion">Método de Cocción:</label>
        <select
          id="MetodoCoccion"
          name="metodoCoccion" 
          value={formData.metodoCoccion} 
          onChange={handleChange} 
        >
          <option value="">Seleccione un método de cocción</option>
          {metodosDeCoccion.map(metodo => (
              <option key={metodo} value={metodo}>{metodo}</option>
          ))}
        </select>
        {formData.imagen && (
          <img 
          src={`http://localhost:3001/${formData.imagen}`} 
          alt="Imagen actual de la pizza"
          className="image-preview" 
           />
        )}
        <input
              type="file"
              name="imagen"
              onChange={handleImageChange}
          />
          </div>
          <button 
          type="submit">
         {isEditMode ? 'Actualizar Pizza' : 'Crear Pizza'}
          </button>
      </form>
      <button onClick={handleNavigate}>Ir al Menú Overview</button>
    </div>
  );
  
};

export default CreateMenuForm;
