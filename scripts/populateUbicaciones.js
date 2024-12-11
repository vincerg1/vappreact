const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

// Reemplaza 'YOUR_API_KEY' con tu clave API de Google
const GOOGLE_API_KEY = 'AIzaSyAi1A8DDiBPGA_KQy2G47JVhFnt_QF0fN8';

const dbPath = path.resolve(__dirname, '../server/miBaseDeDatos.db');
const db = new sqlite3.Database(dbPath);

const extractCoordinates = (url) => {
  const match = url.match(/@([\d.-]+),([\d.-]+)/);
  if (match) {
    return {
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
    };
  }
  
  const altMatch = url.match(/q=([\d.-]+),([\d.-]+)/);
  if (altMatch) {
    return {
      lat: parseFloat(altMatch[1]),
      lng: parseFloat(altMatch[2]),
    };
  }
  
  return null;
};

const getGeocodingData = async (lat, lng) => {
  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: {
      latlng: `${lat},${lng}`,
      key: GOOGLE_API_KEY,
    },
  });

  if (response.data.status !== 'OK') {
    throw new Error(`Geocoding error: ${response.data.status}`);
  }

  const result = response.data.results[0];
  const components = result.address_components;

  let ciudad = 'Desconocida';
  let codigo_postal = 'Desconocido';

  components.forEach((component) => {
    if (component.types.includes('locality')) {
      ciudad = component.long_name;
    }
    if (component.types.includes('postal_code')) {
      codigo_postal = component.long_name;
    }
  });

  return {
    ciudad,
    codigo_postal,
  };
};

async function populateUbicaciones() {
  db.all('SELECT id_cliente, address_1, numeroDeCompras FROM clientes', async (err, rows) => {
    if (err) {
      console.error('Error al obtener clientes:', err);
      return;
    }

    for (const row of rows) {
      try {
        const coordinates = extractCoordinates(row.address_1);

        if (!coordinates) {
          console.error(`No se pudieron extraer coordenadas para: ${row.address_1}`);
          continue;
        }

        const geocodingData = await getGeocodingData(coordinates.lat, coordinates.lng);

        db.run(
          `INSERT INTO ubicaciones (id_cliente, lat, lng, ciudad, codigo_postal, numero_de_compras)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id_cliente) DO UPDATE SET
           lat = excluded.lat,
           lng = excluded.lng,
           ciudad = excluded.ciudad,
           codigo_postal = excluded.codigo_postal,
           numero_de_compras = excluded.numero_de_compras`,
          [
            row.id_cliente,
            coordinates.lat,
            coordinates.lng,
            geocodingData.ciudad,
            geocodingData.codigo_postal,
            row.numeroDeCompras,
          ],
          (err) => {
            if (err) {
              console.error('Error al insertar en ubicaciones:', err);
            }
          }
        );
      } catch (error) {
        console.error(`No se pudieron obtener datos de geocodificación para: ${row.address_1}`);
        console.error(error);
      }
    }
  });
}

populateUbicaciones();
