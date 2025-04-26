import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import '../styles/infoEmpresa.css'; 

const InfoEmpresa = () => {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zipCodes, setZipCodes] = useState([]);
  const [promoVideoUrl, setPromoVideoUrl] = useState('');   
  const [promoVideo, setPromoVideo] = useState(null); 
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedZipCode, setSelectedZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressLatitude, setAddressLatitude] = useState('');
  const [addressLongitude, setAddressLongitude] = useState('');
  const [city, setCity] = useState('');
  const [cityLatitude, setCityLatitude] = useState('');
  const [cityLongitude, setCityLongitude] = useState('');
  const [logo, setLogo] = useState(null);                      // Logo de la empresa
  const [notificationImg, setNotificationImg] = useState(null); // Imagen de notificación
  
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [showButtons, setShowButtons] = useState(false);
  const [companyInfo, setCompanyInfo] = useState([]); 
  const [editMode, setEditMode] = useState(false);
  const [showForm, setShowForm] = useState(false); 
  const [currentEditId, setCurrentEditId] = useState(null); 

  const [socials, setSocials] = useState([]);        
  const [selectedSocial, setSelectedSocial] = useState(""); 
  const [socialUrl, setSocialUrl] = useState("");
  const socialOptions = ["Facebook", "Instagram", "Whatsapp", "TikTok", "LinkedIn"];

  // 1) Cargar lista de países
  useEffect(() => {
    axios.get('http://api.geonames.org/countryInfoJSON?username=vincerg1')
      .then((response) => {
        setCountries(response.data.geonames);
      })
      .catch((error) => {
        console.error('Error al cargar la lista de países:', error);
      });
  }, []);

  // 2) Cargar regiones al seleccionar país
  useEffect(() => {
    if (selectedCountry) {
      axios
        .get(`http://api.geonames.org/childrenJSON?geonameId=${selectedCountry}&username=vincerg1`)
        .then((response) => {
          setRegions(response.data.geonames);
        })
        .catch((error) => {
          console.error('Error al cargar la lista de regiones:', error);
        });
    }
  }, [selectedCountry]);

  // 3) Cargar ZIP al seleccionar región
  useEffect(() => {
    if (selectedRegion) {
      axios
        .get(`http://api.geonames.org/childrenJSON?geonameId=${selectedRegion}&username=vincerg1`)
        .then((response) => {
          setZipCodes(response.data.geonames);
        })
        .catch((error) => {
          console.error('Error al cargar la lista de códigos ZIP:', error);
        });
    }
  }, [selectedRegion]);

  // 4) Cargar la información de la empresa
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/info-empresa`)
      .then((response) => {
        setCompanyInfo(response.data);
      })
      .catch((error) => {
        console.error('Error al cargar la información de la empresa:', error);
      });
  }, []);

  // Evento principal: guardar cambios al dar click en "Guardar Cambios"
  const handleGuardarCambios = () => {
    // formData para enviar archivos + campos
    const formData = new FormData();
    
    // Campos de texto
    formData.append('pais', selectedCountry);
    formData.append('region', selectedRegion);
    formData.append('codigo_postal', selectedZipCode);
    formData.append('direccion', address);
    formData.append('coordenadas_latitud', addressLatitude);
    formData.append('coordenadas_longitud', addressLongitude);
    formData.append('ciudad', city);
    formData.append('ciudad_latitud', cityLatitude);
    formData.append('ciudad_longitud', cityLongitude);
    formData.append('nombre_empresa', companyName);
    formData.append('correo_contacto', email);
    formData.append('telefono_contacto', phone);
    formData.append('video_promocional_url', promoVideoUrl); 
    formData.append('video_promocional_file', promoVideo);   
    // Archivos:
    formData.append('logo_url', logo); 
    formData.append('notification_img_url', notificationImg);

    // Redes sociales, en JSON
    formData.append('redes_sociales', JSON.stringify(socials));
    
    // Determinar si creamos o editamos
    const method = editMode ? 'patch' : 'post';
    const url = editMode
      ? `${process.env.REACT_APP_API_URL}/api/info-empresa/${currentEditId}`
      : `${process.env.REACT_APP_API_URL}/api/info-empresa`;

    if (editMode && !currentEditId) {
      console.error("Error: no se ha especificado el ID de la tienda a editar.");
      return;
    }

    axios({
      method,
      url,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
      .then((response) => {
        console.log('Datos guardados correctamente:', response.data);
        setShowButtons(true);
        setShowForm(false); // Ocultar el formulario después de guardar
        setEditMode(false);
        setCurrentEditId(null);

        // Recargar la información de las tiendas
        axios.get(`${process.env.REACT_APP_API_URL}/api/info-empresa`)
          .then((response) => {
            setCompanyInfo(response.data);
          })
          .catch((error) => {
            console.error('Error al recargar la información de la empresa:', error);
          });
      })
      .catch((error) => {
        console.error('Error al guardar la información de la empresa:', error);
      });
  };

  // Función para editar
  const handleEdit = (company) => {
    setEditMode(true);
    setShowForm(true);
    setCurrentEditId(company.id); // ID a editar

    // Asignar campos
    setSelectedCountry(company.pais);
    setSelectedRegion(company.region);
    setSelectedZipCode(company.codigo_postal);
    setAddress(company.direccion);
    setAddressLatitude(company.coordenadas_latitud);
    setAddressLongitude(company.coordenadas_longitud);
    setCity(company.ciudad);
    setCityLatitude(company.ciudad_latitud);
    setCityLongitude(company.ciudad_longitud);
    setCompanyName(company.nombre_empresa);
    setEmail(company.correo_contacto);
    setPhone(company.telefono_contacto);

    // Nota: podrías rellenar socials y notificación si ya está guardado,
    // si la API te da esos campos.
  };

  // Función para eliminar
  const handleDelete = (companyId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar la información de la empresa?')) {
      axios.delete(`${process.env.REACT_APP_API_URL}/api/info-empresa/${companyId}`)
        .then(() => {
          alert('Información de la empresa eliminada.');
          setCompanyInfo(companyInfo.filter(company => company.id !== companyId));
        })
        .catch((error) => {
          console.error('Error al eliminar la empresa:', error);
        });
    }
  };

  // Manejo de redes sociales
  const handleAddSocial = () => {
    if (selectedSocial && socialUrl) {
      const newSocials = [...socials, { nombre: selectedSocial, url: socialUrl }];
      setSocials(newSocials);
      setSelectedSocial("");
      setSocialUrl("");
    }
  };
  const handleRemoveSocial = (index) => {
    setSocials(socials.filter((_, i) => i !== index));
  };

  return (
    <div className='infoEmpresaContenedor'>
      <button onClick={() => {
        setEditMode(false);
        setShowForm(!showForm);
      }}>
        {showForm ? 'Cerrar Formulario' : 'Agregar Nueva Tienda'}
      </button>

      {companyInfo.length > 0 && (
        <div className='infoEmpresaContenedorInfo'>
          <h2>Información Empresa</h2>
          <table className='infoEmpresaContenedorTable'>
            <thead>
              <tr>
                <th>Nombre de la Empresa</th>
                <th>Teléfono</th>
                <th>Correo Electrónico</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companyInfo.map((company) => (
                <tr key={company.id}>
                  <td>{company.nombre_empresa}</td>
                  <td>{company.telefono_contacto}</td>
                  <td>{company.correo_contacto}</td>
                  <td>
                    <button onClick={() => handleEdit(company)}>Editar</button>
                    <button onClick={() => handleDelete(company.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={showForm}
        onRequestClose={() => setShowForm(false)}
        contentLabel="Formulario de Tienda"
        overlayClassName="modal-overlay"
        className="modal-content"
      >
        <button 
          className="close-modal-button"
          onClick={() => setShowForm(false)}
        >
          ❌
        </button>

        <form className='FINF_EMP'>
          <h2>{editMode ? 'Edita la Información de la Empresa' : 'Agregar Nueva Tienda'}</h2>

          {/* País */}
          <label>País:</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
          >
            <option value="">Selecciona un país</option>
            {countries.map((country) => (
              <option key={country.geonameId} value={country.geonameId}>
                {country.countryName}
              </option>
            ))}
          </select>

          {/* Región */}
          <label>Región:</label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            <option value="">Selecciona una región</option>
            {regions.map((region) => (
              <option key={region.geonameId} value={region.geonameId}>
                {region.name}
              </option>
            ))}
          </select>

          {/* Código ZIP */}
          <label>Código ZIP (Postal):</label>
          <select
            value={selectedZipCode}
            onChange={(e) => setSelectedZipCode(e.target.value)}
          >
            <option value="">Selecciona un código ZIP</option>
            {zipCodes.map((zipCode) => (
              <option key={zipCode.geonameId} value={zipCode.geonameId}>
                {zipCode.name}
              </option>
            ))}
          </select>

          {/* Dirección */}
          <label>Dirección:</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {/* Latitud de Dirección */}
          <label>Latitud de la Dirección:</label>
          <input
            type="text"
            value={addressLatitude}
            onChange={(e) => setAddressLatitude(e.target.value)}
          />

          {/* Longitud de Dirección */}
          <label>Longitud de la Dirección:</label>
          <input
            type="text"
            value={addressLongitude}
            onChange={(e) => setAddressLongitude(e.target.value)}
          />

          {/* Ciudad */}
          <label>Ciudad:</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          {/* Latitud de la Ciudad */}
          <label>Latitud de la Ciudad:</label>
          <input
            type="text"
            value={cityLatitude}
            onChange={(e) => setCityLatitude(e.target.value)}
          />

          {/* Longitud de la Ciudad */}
          <label>Longitud de la Ciudad:</label>
          <input
            type="text"
            value={cityLongitude}
            onChange={(e) => setCityLongitude(e.target.value)}
          />

          {/* Logo */}
          <label>Logo (cargar logo):</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogo(e.target.files[0])}
          />

          {/* Imagen de Notificación */}
          <label>Imagen de Notificación (Pizza Lista):</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNotificationImg(e.target.files[0])}
          />
            <label>Video Promocional</label>
            <input type="file" accept="video/mp4" onChange={(e) => setPromoVideo(e.target.files[0])} />
            
          {/* Nombre de la Empresa */}
          <label>Nombre de la Empresa:</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />

          {/* Correo de Atención */}
          <label>Correo de Atención al Cliente:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* Teléfono */}
          <label>Teléfono de Contacto:</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
         
          {/* Redes Sociales */}
          <label>Redes Sociales:</label>
          <div className="socials-block">
            <div className="add-social">
              <select
                value={selectedSocial}
                onChange={(e) => setSelectedSocial(e.target.value)}
              >
                <option value="">Selecciona una red social</option>
                {socialOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="URL del perfil (https://...)"
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
              />

              <button type="button" onClick={handleAddSocial}>
                Agregar
              </button>
            </div>

            <ul>
              {socials.map((social, index) => (
                <li key={index}>
                  <strong>{social.nombre}:</strong>{" "}
                  <a href={social.url} target="_blank" rel="noopener noreferrer">
                    {social.url}
                  </a>{" "}
                  <button
                    type="button"
                    onClick={() => handleRemoveSocial(index)}
                    className="remove-social-button"
                  >
                    ❌
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <button type="button" onClick={handleGuardarCambios}>
              Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InfoEmpresa;
