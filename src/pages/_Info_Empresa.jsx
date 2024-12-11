import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import '../styles/formularios.css';

const InfoEmpresa = () => {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zipCodes, setZipCodes] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedZipCode, setSelectedZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressLatitude, setAddressLatitude] = useState('');
  const [addressLongitude, setAddressLongitude] = useState('');
  const [city, setCity] = useState('');
  const [cityLatitude, setCityLatitude] = useState('');
  const [cityLongitude, setCityLongitude] = useState('');
  const [logo, setLogo] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const [companyInfo, setCompanyInfo] = useState([]); // Cambiado a array para manejar múltiples tiendas
  const [editMode, setEditMode] = useState(false);
  const [showForm, setShowForm] = useState(false); // Estado para controlar la visibilidad del formulario
  const [currentEditId, setCurrentEditId] = useState(null); // Estado para almacenar el ID de la tienda que se está editando

  // Cargar países
  useEffect(() => {
    axios.get('http://api.geonames.org/countryInfoJSON?username=vincerg1')
      .then((response) => {
        setCountries(response.data.geonames);
      })
      .catch((error) => {
        console.error('Error al cargar la lista de países:', error);
      });
  }, []);

  // Cargar regiones al seleccionar país
  useEffect(() => {
    if (selectedCountry) {
      axios.get(`http://api.geonames.org/childrenJSON?geonameId=${selectedCountry}&username=vincerg1`)
        .then((response) => {
          setRegions(response.data.geonames);
        })
        .catch((error) => {
          console.error('Error al cargar la lista de regiones:', error);
        });
    }
  }, [selectedCountry]);

  // Cargar códigos ZIP al seleccionar región
  useEffect(() => {
    if (selectedRegion) {
      axios.get(`http://api.geonames.org/childrenJSON?geonameId=${selectedRegion}&username=vincerg1`)
        .then((response) => {
          setZipCodes(response.data.geonames);
        })
        .catch((error) => {
          console.error('Error al cargar la lista de códigos ZIP:', error);
        });
    }
  }, [selectedRegion]);

  // Cargar información de las tiendas
  useEffect(() => {
    axios.get('http://localhost:3001/api/info-empresa')
      .then((response) => {
        setCompanyInfo(response.data);
      })
      .catch((error) => {
        console.error('Error al cargar la información de la empresa:', error);
      });
  }, []);

  const handleGuardarCambios = () => {
    const formData = new FormData();

    formData.append('pais', selectedCountry);
    formData.append('region', selectedRegion);
    formData.append('codigo_postal', selectedZipCode);
    formData.append('direccion', address);
    formData.append('coordenadas_latitud', addressLatitude);
    formData.append('coordenadas_longitud', addressLongitude);
    formData.append('ciudad', city);
    formData.append('ciudad_latitud', cityLatitude);
    formData.append('ciudad_longitud', cityLongitude);
    formData.append('logo_url', logo);
    formData.append('nombre_empresa', companyName);
    formData.append('correo_contacto', email);
    formData.append('telefono_contacto', phone);

    const method = editMode ? 'patch' : 'post';
    const url = editMode ? `http://localhost:3001/api/info-empresa/${currentEditId}` : 'http://localhost:3001/api/info-empresa';

    if (editMode && !currentEditId) {
      console.error("Error: no se ha especificado el ID de la tienda a editar.");
      return;
    }

    axios({
      method,
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
      .then((response) => {
        console.log('Datos guardados correctamente:', response.data);
        setShowButtons(true);
        setShowForm(false); // Ocultar el formulario después de guardar
        setEditMode(false);
        setCurrentEditId(null);
        // Recargar la información de las tiendas después de guardar
        axios.get('http://localhost:3001/api/info-empresa')
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

  const handleEdit = (company) => {
    setEditMode(true);
    setShowForm(true);
    setCurrentEditId(company.id); // Asegurarse de que el ID sea asignado
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
  };

  const handleDelete = (companyId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar la información de la empresa?')) {
      axios.delete(`http://localhost:3001/api/info-empresa/${companyId}`)
        .then(() => {
          alert('Información de la empresa eliminada.');
          setCompanyInfo(companyInfo.filter(company => company.id !== companyId));
        })
        .catch((error) => {
          console.error('Error al eliminar la empresa:', error);
        });
    }
  };

  return (
    <div>
      <h1 className="PDCRL">Panel de Control / Información de la Empresa</h1>
      <button onClick={() => { setEditMode(false); setShowForm(!showForm); }}>{showForm ? 'Cerrar Formulario' : 'Agregar Nueva Tienda'}</button>

      {companyInfo.length > 0 && (
        <div>
          <h2>Información Guardada</h2>
          <table>
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

      <Modal isOpen={showForm} onRequestClose={() => setShowForm(false)} contentLabel="Formulario de Tienda" className="modal" overlayClassName="modal-overlay">
        <button className="close-modal-button" onClick={() => setShowForm(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', fontSize: '1.5em', cursor: 'pointer' }}>❌</button>
        <form className='FINF_EMP'>
          <h2>{editMode ? 'Edita la Información de la Empresa' : 'Agregar Nueva Tienda'}</h2>
          
          {/* País, región, dirección y coordenadas */}
          <label>País:</label>
          <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
            <option value="">Selecciona un país</option>
            {countries.map((country) => (
              <option key={country.geonameId} value={country.geonameId}>{country.countryName}</option>
            ))}
          </select>

          <label>Región:</label>
          <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
            <option value="">Selecciona una región</option>
            {regions.map((region) => (
              <option key={region.geonameId} value={region.geonameId}>{region.name}</option>
            ))}
          </select>

          <label>Código ZIP (Postal):</label>
          <select value={selectedZipCode} onChange={(e) => setSelectedZipCode(e.target.value)}>
            <option value="">Selecciona un código ZIP</option>
            {zipCodes.map((zipCode) => (
              <option key={zipCode.geonameId} value={zipCode.geonameId}>{zipCode.name}</option>
            ))}
          </select>

          <label>Dirección:</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />

          <label>Latitud de la Dirección:</label>
          <input type="text" value={addressLatitude} onChange={(e) => setAddressLatitude(e.target.value)} />

          <label>Longitud de la Dirección:</label>
          <input type="text" value={addressLongitude} onChange={(e) => setAddressLongitude(e.target.value)} />

          <label>Ciudad:</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />

          <label>Latitud de la Ciudad:</label>
          <input type="text" value={cityLatitude} onChange={(e) => setCityLatitude(e.target.value)} />

          <label>Longitud de la Ciudad:</label>
          <input type="text" value={cityLongitude} onChange={(e) => setCityLongitude(e.target.value)} />

          <label>Logo (cargar logo):</label>
          <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files[0])} />

          <label>Nombre de la Empresa:</label>
          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />

          <label>Correo de Atención al Cliente:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label>Teléfono de Contacto:</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <div>
            <button type="button" onClick={handleGuardarCambios}>Guardar Cambios</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InfoEmpresa;
