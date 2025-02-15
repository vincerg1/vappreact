const express = require('express');
const db = require('./database.js');
const cors = require('cors');
const cron = require('node-cron');
const app = express();
const port = 3001;
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const moment = require('moment-timezone');
const PDFDocument = require('pdfkit'); 
const nodemailer = require('nodemailer');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
module.exports = open({
  filename: path.join(__dirname, 'miBaseDeDatos.db'),
  driver: sqlite3.Database
});
const client = new OAuth2Client('718859045648-ac01g0oqu3pdd87tc84n195harhp5t57.apps.googleusercontent.com')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// const determinarZonaRiesgo = (disponible, limite, fechaCaducidad) => {
//   const fechaCaducidadParsed = parseISO(fechaCaducidad);
//   const fechaActual = new Date();

//   if (fechaCaducidadParsed < fechaActual) {
//     return 5; // Caducado
//   } else if (disponible <= limite) {
//     return 4; // Inactivo por escasez
//   } else if (disponible <= limite * 1.2) {
//     return 3; // Riesgo alto
//   } else if (disponible <= limite * 2) {
//     return 2; // Riesgo medio
//   } else {
//     return 1; // Riesgo bajo
//   }
// };

// const determinarEstadoDelProducto = (zonaRiesgo) => {
//   return zonaRiesgo < 4; // Activo si la zona de riesgo es menor que 4
// };
 function esFechaValida(fecha) {
   const fechaParsed = Date.parse(fecha);
   return !isNaN(fechaParsed);
 }
 const jwt = require('jsonwebtoken');
 const JWT_SECRET_KEY = 'tu_clave_secreta'; 
 

 // the generation zone
function generateAuthToken(client) {

   const token = jwt.sign({ id: client.id, segmento: client.segmento }, JWT_SECRET_KEY, { expiresIn: '1h' });
   return token;
}
function actualizarIndicadoresCliente(id_cliente, fecha_actualizacion, callback) {
  db.serialize(() => {
    // Obtener todas las ventas del cliente
    db.all(`SELECT * FROM registro_ventas WHERE id_cliente = ?`, [id_cliente], (err, ventas) => {
      if (err) {
        callback(err);
        return;
      }

      const numeroDeCompras = ventas.length;
      let diasDesdeUltimaCompra = 9999;
      if (numeroDeCompras === 0) {
        // Cliente sin compras
        const segmento = 1; // POTENCIAL
        db.run(
          `UPDATE clientes SET segmento = ?, numDelivery = 0, numPickUp = 0, diaMasComprado = NULL, diaDelMesMasComprado = NULL, horaMasComprada = NULL, ofertaMasUsada = NULL, totalDescuentos = 0, MetodoDePago = NULL, id_pizzaMasComprada = NULL, precio_pizzaMasComprada = NULL, size_pizzaMasComprada = NULL WHERE id_cliente = ?`,
          [segmento, id_cliente],
          function (err) {
            if (err) {
              callback(err);
              return;
            }
            callback(null);
          }
        );
        return;
      }

      // Calcular indicadores básicos
      const MontoTotalCompras = ventas.reduce((sum, venta) => sum + venta.total_con_descuentos, 0);
      const totalDescuentos = ventas.reduce((sum, venta) => sum + venta.total_descuentos, 0);
      const ticketPromedio = MontoTotalCompras / numeroDeCompras;
      const ticketObjetivo = ticketPromedio * 1.15; // 15% mayor que el ticket promedio

      // Calcular el método de pago más usado
      const metodoDePagoData = ventas.reduce((acc, venta) => {
        acc[venta.metodo_pago] = (acc[venta.metodo_pago] || 0) + 1;
        return acc;
      }, {});
      const MetodoDePago = Object.keys(metodoDePagoData).reduce((a, b) => metodoDePagoData[a] > metodoDePagoData[b] ? a : b, null);

      let numDelivery = 0;
      let numPickUp = 0;

      ventas.forEach((venta) => {
        const metodoEntrega = JSON.parse(venta.metodo_entrega || '{}');

        // Validar Delivery correctamente
        if (metodoEntrega.Delivery && metodoEntrega.Delivery.address) {
          numDelivery += 1; // Incrementar si existe un Delivery válido
        }

        // Validar PickUp correctamente
        if (metodoEntrega.PickUp && metodoEntrega.PickUp.nombre) {
          numPickUp += 1;
        }
      });

        // Validar coherencia entre numeroDeCompras y métodos de entrega
        if (numDelivery + numPickUp > numeroDeCompras) {
          console.warn(
            `Inconsistencia detectada: Total métodos (${numDelivery + numPickUp}) > número de compras (${numeroDeCompras})`
          );
        }

      // Días y horas más frecuentes
      const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
      const diaMasComprado = ventas.reduce((acc, venta) => {
        const dia = new Date(venta.fecha).getDay();
        acc[dia] = (acc[dia] || 0) + 1;
        return acc;
      }, {});
      const diaMasCompradoId = diasSemana[Object.keys(diaMasComprado).reduce((a, b) => diaMasComprado[a] > diaMasComprado[b] ? a : b)];

      const diaDelMesMasComprado = ventas.reduce((acc, venta) => {
        const dia = new Date(venta.fecha).getDate();
        acc[dia] = (acc[dia] || 0) + 1;
        return acc;
      }, {});
      const diaDelMesMasCompradoId = Object.keys(diaDelMesMasComprado).reduce((a, b) => diaDelMesMasComprado[a] > diaDelMesMasComprado[b] ? a : b);

      const horas = ventas.map((venta) => {
        const hora = new Date(`1970-01-01T${venta.hora}`).getHours();
        console.log('Hora procesada:', venta.hora, '->', hora); // Log para inspección
        return hora;
      });
      
      const horaPromedioExacta = horas.reduce((sum, hora) => sum + hora, 0) / horas.length;
      console.log('Hora promedio exacta calculada:', horaPromedioExacta);
      
      // Almacenar con 2 decimales
      const horaMasComprada = parseFloat(horaPromedioExacta.toFixed(2));

      // Identificar la pizza más comprada
      const pizzaData = ventas.reduce((acc, venta) => {
        const productos = JSON.parse(venta.productos || '[]');
        productos.forEach((producto) => {
          acc[producto.id_pizza] = (acc[producto.id_pizza] || 0) + producto.cantidad;
        });
        return acc;
      }, {});
      const id_pizzaMasComprada = Object.keys(pizzaData).reduce((a, b) => pizzaData[a] > pizzaData[b] ? a : b, null);
      let precio_pizzaMasComprada = null;
      let size_pizzaMasComprada = null;

      if (id_pizzaMasComprada) {
        ventas.forEach((venta) => {
          const productos = JSON.parse(venta.productos || '[]');
          productos.forEach((producto) => {
            if (producto.id_pizza == id_pizzaMasComprada) {
              precio_pizzaMasComprada = producto.price;
              size_pizzaMasComprada = producto.size;
            }
          });
        });
      }

      // Calcular la oferta más usada
      const cuponesData = ventas.reduce((acc, venta) => {
        const cupones = JSON.parse(venta.cupones || '[]');
        cupones.forEach((cupon) => {
          acc[cupon.Oferta_Id] = (acc[cupon.Oferta_Id] || 0) + 1;
        });
        return acc;
      }, {});
      const ofertaMasUsada = Object.keys(cuponesData).reduce((a, b) => cuponesData[a] > cuponesData[b] ? a : b, null);

      // Calcular el segmento
      let segmento;
      if (ventas.length > 0) {
        const ultimaCompraRaw = ventas[ventas.length - 1].fecha;
        const ultimaCompra = new Date(ultimaCompraRaw);
      
        if (isNaN(ultimaCompra.getTime())) {
          console.error(`❌ ERROR: La fecha de la última compra (${ultimaCompraRaw}) no es válida.`);
        } else {
          const diasDesdeUltimaCompra = Math.floor((new Date(fecha_actualizacion) - ultimaCompra) / (1000 * 60 * 60 * 24));
          console.log(`✅ Última compra: ${ultimaCompra}, Fecha de actualización: ${fecha_actualizacion}, Días calculados: ${diasDesdeUltimaCompra}`);
        }
      }

          // Priorizar condiciones más específicas (MVC) primero
          if (numeroDeCompras > 5 && diasDesdeUltimaCompra < 15 && ticketPromedio > 20) {
            segmento = 4; // MVC
          } else if (numeroDeCompras > 1 && diasDesdeUltimaCompra < 30 && ticketPromedio > 15) {
            segmento = 3; // ACTIVO
          } else if (numeroDeCompras > 1 && diasDesdeUltimaCompra > 30) {
            segmento = 2; // INACTIVO
          } else {
            segmento = 1; // POTENCIAL
          }

          

      // Actualizar la tabla clientes con los datos calculados
      db.run(
        `
        UPDATE clientes
        SET
            numeroDeCompras = ?,
            MontoTotalCompras = ?,
            ticketPromedio = ?,
            ticketObjetivo = ?,
            Dias_Ucompra = ?,
            Max_Amount = ?,
            Cantidad_Pizzas = ?,
            numDelivery = ?,
            numPickUp = ?,
            diaMasComprado = ?,
            diaDelMesMasComprado = ?,
            horaMasComprada = ?,
            ofertaMasUsada = ?,
            totalDescuentos = ?,
            MetodoDePago = ?,
            id_pizzaMasComprada = ?,
            precio_pizzaMasComprada = ?,
            size_pizzaMasComprada = ?,
            segmento = ?
        WHERE id_cliente = ?;
        `,
        [
          numeroDeCompras,
          MontoTotalCompras,
          ticketPromedio,
          ticketObjetivo,
          diasDesdeUltimaCompra,
          Math.max(...ventas.map((venta) => venta.total_con_descuentos)), // Max_Amount
          ventas.reduce((sum, venta) => sum + JSON.parse(venta.productos || '[]').reduce((sum, prod) => sum + prod.cantidad, 0), 0), // Cantidad_Pizzas
          numDelivery,
          numPickUp,
          diaMasCompradoId,
          diaDelMesMasCompradoId,
          horaMasComprada,
          ofertaMasUsada,
          totalDescuentos,
          MetodoDePago,
          id_pizzaMasComprada,
          precio_pizzaMasComprada,
          size_pizzaMasComprada,
          segmento,
          id_cliente,
        ],
        function (err) {
          if (err) {
            callback(err);
            return;
          }

          console.log(`Indicadores del cliente ${id_cliente} actualizados con éxito.`);
          callback(null);
        }
      );
    });
  });
}
function actualizarEstadoRepartidor(id, estado, res) {
  const query = 'UPDATE repartidores SET estado = ? WHERE id_repartidor = ?';
  db.run(query, [estado, id], function (err) {
      if (err) {
          console.error('Error al actualizar estado:', err);
          res.status(500).json({ success: false, message: 'Error al actualizar el estado.' });
          return;
      }

      res.json({ success: true, message: `Estado del repartidor con ID ${id} actualizado a ${estado}.` });
  });
}
const extractCoordinates = (url) => {
  const match = url.match(/@([\d.-]+),([\d.-]+)/);
  if (match) {
    return {
      lat: parseFloat(match[1]),
      lon: parseFloat(match[2]),  // Usamos "lon" en lugar de "lng" para evitar confusión
    };
  }
  
  const altMatch = url.match(/q=([\d.-]+),([\d.-]+)/);
  if (altMatch) {
    return {
      lat: parseFloat(altMatch[1]),
      lon: parseFloat(altMatch[2]),  // Usamos "lon" en lugar de "lng" para evitar confusión
    };
  }
  
  return null;
};
const generarHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash; // Convertir a un número de 32 bits
  }
  return hash;
};
const generarIDI = (nombreProducto) => {
  const nombreLimpio = nombreProducto.replace(/\s+/g, '').toUpperCase();
  const hash = generarHash(nombreLimpio);
  const IDI = Math.abs(hash).toString(36).substr(-5).toUpperCase();
  return IDI;
};
const generateOfferCode = (description) => {
  const timestamp = Date.now();
  const hash = Math.abs(description.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + timestamp).toString(36).substr(0, 6).toUpperCase();
  return `OFF${hash}`;
};
const bcrypt = require('bcrypt');
const traducirDia = (diaIngles) => {
  const dias = {
      monday: 'lunes',
      tuesday: 'martes',
      wednesday: 'miercoles',
      thursday: 'jueves',
      friday: 'viernes',
      saturday: 'sabado',
      sunday: 'domingo'
  };
  const diaTraducido = dias[diaIngles.toLowerCase()] || diaIngles;
  return normalizarTexto(diaTraducido); // Normalizar el día traducido
};
const normalizarTexto = (texto) => {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};
const actualizarRankingIngredientes = async () => {
  try {
      console.log("🔄 Iniciando actualización del ranking...");

      // 1️⃣ Obtener TODAS las ventas correctamente
      const respuestaVentas = await db.all('SELECT productos FROM registro_ventas');

      if (!respuestaVentas || respuestaVentas.length === 0) {
          console.error("❌ Error: No hay datos en productos.");
          return;
      }

      let ventas = [];
      try {
          for (const row of respuestaVentas) {
              const productos = JSON.parse(row.productos); // Convertir JSON de cada fila
              if (Array.isArray(productos)) {
                  ventas = ventas.concat(productos);
              }
          }
      } catch (error) {
          console.error("❌ Error al parsear productos:", error);
          return;
      }

      if (!Array.isArray(ventas) || ventas.length === 0) {
          console.error("❌ Error: ventas no es un array válido.", ventas);
          return;
      }

      console.log("📊 Ventas obtenidas:", ventas);

      // 2️⃣ Obtener menú de pizzas
      const respuestaMenuPizzas = await db.all('SELECT id, ingredientes FROM menu_pizzas');
      const menuPizzas = respuestaMenuPizzas.map(pizza => ({
          ...pizza,
          ingredientes: JSON.parse(pizza.ingredientes) // Convertir ingredientes a JSON
      }));

      console.log("🍕 Menú de pizzas obtenido:", menuPizzas);

      // 3️⃣ Calcular ranking
      const totalesPorIngrediente = {};

      ventas.forEach(venta => {
          const pizzaVendida = menuPizzas.find(pizza => pizza.id === venta.id_pizza);
          if (pizzaVendida) {
              pizzaVendida.ingredientes.forEach(ing => {
                  if (ing.cantBySize && ing.cantBySize[venta.size]) {
                      const cantidadIngrediente = ing.cantBySize[venta.size] * venta.cantidad;
                      if (totalesPorIngrediente[ing.IDI]) {
                          totalesPorIngrediente[ing.IDI].cantidad += cantidadIngrediente;
                      } else {
                          totalesPorIngrediente[ing.IDI] = {
                              cantidad: cantidadIngrediente,
                              nombre: ing.ingrediente
                          };
                      }
                  } else {
                      console.warn(`⚠️ Ingrediente ${ing.ingrediente} no tiene cantidad definida para tamaño ${venta.size}`);
                  }
              });
          } else {
              console.error(`⚠️ No se encontró la pizza con ID ${venta.id_pizza}`);
          }
      });

      console.log("📈 Ranking de ingredientes calculado:", totalesPorIngrediente);

      // 4️⃣ Guardar en `ranking_ingredientes`
      await db.run("DELETE FROM ranking_ingredientes"); // Limpiar la tabla antes de actualizar
      for (const [idi, info] of Object.entries(totalesPorIngrediente)) {
          await db.run(
              "INSERT INTO ranking_ingredientes (IDI, totalVendido, nombre) VALUES (?, ?, ?)",
              [idi, info.cantidad, info.nombre]
          );
      }

      console.log("✅ Ranking actualizado en la base de datos.");

  } catch (error) {
      console.error("❌ Error actualizando ranking:", error);
  }
};


app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



cron.schedule('0 0 * * *', () => {
  console.log('=== Cron Job Iniciado: Evaluando horarios, cupones y Dias_Ucompra ===');

  // Obtener la fecha actual
  const fechaHoy = new Date();
  
  // Traducción de días de la semana
  const diasEnEspanol = {
    monday: 'lunes',
    tuesday: 'martes',
    wednesday: 'miercoles',
    thursday: 'jueves',
    friday: 'viernes',
    saturday: 'sabado',
    sunday: 'domingo',
  };

  const diaActual = diasEnEspanol[moment().format('dddd').toLowerCase()] || 'desconocido';
  const horaActual = moment().format('HH:mm');

  console.log(`Día actual: ${diaActual}, Hora actual: ${horaActual}`);

  if (diaActual === 'desconocido') {
    console.error('❌ Error: Día no reconocido.');
    return;
  }

  // 1️⃣ Evaluar horarios activos
  const queryHorario = `
      SELECT * 
      FROM horarios 
      WHERE LOWER(Day) = ? 
      ORDER BY Hora_inicio ASC
  `;

  db.all(queryHorario, [diaActual], (err, horarios) => {
    if (err) {
      console.error('❌ Error al obtener horarios:', err);
      return;
    }

    if (!horarios || horarios.length === 0) {
      console.log(`⚠️ No hay horarios definidos para el día ${diaActual}.`);
      return;
    }

    console.log(`✔️ Horarios encontrados para el día ${diaActual}:`, horarios);

    const dentroDeHorarioActivo = horarios.some((horario) => {
      const horaInicio = horario.Hora_inicio;
      const horaFin = horario.Hora_fin === '00:00' ? '23:59' : horario.Hora_fin;

      console.log(`Evaluando turno ${horario.Shift}: ${horaInicio} - ${horaFin}...`);
      return horaActual >= horaInicio && horaActual <= horaFin;
    });

    if (!dentroDeHorarioActivo) {
      console.log('✅ No hay horarios activos actualmente. Desactivando repartidores...');

      db.run(
        'UPDATE repartidores SET estado = ? WHERE estado = ?',
        ['Inactivo', 'Activo'],
        function (err) {
          if (err) {
            console.error('❌ Error al actualizar estados de repartidores:', err);
            return;
          }

          console.log(`✔️ Estados actualizados a "Inactivo" para ${this.changes} repartidores.`);
        }
      );
    } else {
      console.log('🚀 Hay horarios activos actualmente. No se realizan cambios.');
    }
  });

  // 2️⃣ Evaluar y resetear cupones si la hora fin ya pasó
  const queryCupones = `
      SELECT * 
      FROM ofertas 
      WHERE Tipo_Cupon = 'permanente' AND Estado = 'Activa'
  `;

  db.all(queryCupones, (err, cupones) => {
    if (err) {
      console.error('❌ Error al obtener cupones:', err);
      return;
    }

    if (!cupones || cupones.length === 0) {
      console.log('⚠️ No hay cupones activos para evaluar.');
      return;
    }

    cupones.forEach((cupon) => {
      const horaFin = moment(cupon.Hora_Fin, 'HH:mm');
      const diasActivos = JSON.parse(cupon.Dias_Activos) || [];

      if (diasActivos.includes(diaActual) && moment().isSameOrAfter(horaFin)) {
        console.log(`⏳ Reseteando cupones para la oferta ${cupon.Oferta_Id}, hora fin alcanzada.`);

        const resetQuery = `
          UPDATE ofertas 
          SET Cupones_Disponibles = Cupones_Asignados 
          WHERE Oferta_Id = ?
        `;

        db.run(resetQuery, [cupon.Oferta_Id], function (err) {
          if (err) {
            console.error(`❌ Error al resetear cupones para oferta ${cupon.Oferta_Id}:`, err);
            return;
          }

          console.log(`✔️ Cupones reseteados para la oferta ${cupon.Oferta_Id}.`);
        });
      }
    });
  });

  // 3️⃣ ACTUALIZAR `Dias_Ucompra` para todos los clientes
  const queryClientes = `
      SELECT id_cliente, (SELECT MAX(fecha) FROM registro_ventas WHERE registro_ventas.id_cliente = clientes.id_cliente) AS ultimaCompra
      FROM clientes;
  `;

  db.all(queryClientes, [], (err, clientes) => {
    if (err) {
      console.error('❌ Error al obtener clientes:', err);
      return;
    }

    if (!clientes || clientes.length === 0) {
      console.log('⚠️ No hay clientes en la base de datos.');
      return;
    }

    console.log(`📊 Clientes encontrados: ${clientes.length}`);

    clientes.forEach((cliente) => {
      const { id_cliente, ultimaCompra } = cliente;

      if (!ultimaCompra) {
        console.log(`⚠️ Cliente ${id_cliente} no tiene compras registradas.`);
        return;
      }

      const ultimaCompraDate = new Date(ultimaCompra);

      if (isNaN(ultimaCompraDate.getTime())) {
        console.error(`❌ ERROR: La fecha de la última compra (${ultimaCompra}) de cliente ${id_cliente} no es válida.`);
        return;
      }

      // Calcular la diferencia de días
      const diasDesdeUltimaCompra = Math.floor((fechaHoy - ultimaCompraDate) / (1000 * 60 * 60 * 24));

      console.log(`📅 Cliente ${id_cliente} - Última compra: ${ultimaCompraDate.toISOString()} - Días desde última compra: ${diasDesdeUltimaCompra}`);

      // Actualizar `Dias_Ucompra`
      const updateQuery = `
          UPDATE clientes
          SET Dias_Ucompra = ?
          WHERE id_cliente = ?;
      `;

      db.run(updateQuery, [diasDesdeUltimaCompra, id_cliente], function (err) {
        if (err) {
          console.error(`❌ Error al actualizar Dias_Ucompra para el cliente ${id_cliente}:`, err);
        } else {
          console.log(`✅ Cliente ${id_cliente} actualizado: Dias_Ucompra = ${diasDesdeUltimaCompra}`);
        }
      });
    });
  });

  console.log('=== Cron Job Finalizado: Evaluación completa ===\n');
});



// the get zone
app.get("/api/ingredientes-uso", (req, res) => {
  const query = `
    WITH base_ingredients AS (
        SELECT
            json_extract(i.value, '$.IDI') AS IDI,
            json_extract(i.value, '$.ingrediente') AS ingrediente,
            SUM(json_extract(p.value, '$.cantidad') * json_extract(i.value, '$.cantBySize.' || json_extract(p.value, '$.size'))) AS total_vendido
        FROM registro_ventas r
        JOIN json_each(r.productos) p  
        JOIN menu_pizzas mp ON json_extract(p.value, '$.id_pizza') = mp.id
        JOIN json_each(mp.ingredientes) i  
        GROUP BY json_extract(i.value, '$.IDI')
    ), extra_ingredients AS (
        SELECT
            json_extract(e.value, '$.IDI') AS IDI,
            json_extract(e.value, '$.nombre') AS ingrediente,
            SUM(json_extract(p.value, '$.cantidad') * json_extract(e.value, '$.cantBySize')) AS total_vendido
        FROM registro_ventas r
        JOIN json_each(r.productos) p  
        JOIN json_each(p.value, '$.extraIngredients') e  
        GROUP BY json_extract(e.value, '$.IDI')
    ), daily_consumption AS (
        SELECT
            json_extract(i.value, '$.IDI') AS IDI,
            json_extract(i.value, '$.ingrediente') AS ingrediente,
            date(r.fecha) AS dia,
            SUM(json_extract(p.value, '$.cantidad') * json_extract(i.value, '$.cantBySize.' || json_extract(p.value, '$.size'))) AS total_diario
        FROM registro_ventas r
        JOIN json_each(r.productos) p
        JOIN menu_pizzas mp ON json_extract(p.value, '$.id_pizza') = mp.id
        JOIN json_each(mp.ingredientes) i
        WHERE r.fecha >= date('now', '-6 days')
        GROUP BY json_extract(i.value, '$.IDI'), dia
    ), aggregated_daily AS (
        SELECT 
            IDI, ingrediente, 
            json_group_array(total_diario) AS consumo_diario,
            AVG(total_diario) AS promedio_semanal
        FROM daily_consumption
        GROUP BY IDI
    )
    SELECT 
        COALESCE(bi.IDI, ei.IDI) AS IDI,
        COALESCE(bi.ingrediente, ei.ingrediente) AS ingrediente,
        COALESCE(bi.total_vendido, 0) + COALESCE(ei.total_vendido, 0) AS total_vendido,
        IFNULL(ad.consumo_diario, '[]') AS consumo_diario,
        IFNULL(ad.promedio_semanal, 0) AS promedio_semanal
    FROM base_ingredients bi
    FULL OUTER JOIN extra_ingredients ei ON bi.IDI = ei.IDI
    LEFT JOIN aggregated_daily ad ON COALESCE(bi.IDI, ei.IDI) = ad.IDI
    GROUP BY COALESCE(bi.IDI, ei.IDI), COALESCE(bi.ingrediente, ei.ingrediente)
    ORDER BY total_vendido DESC;
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("❌ Error en la consulta SQL:", err);
      return res.status(500).json({ error: "Error en la consulta SQL" });
    }

    console.log("📊 Datos obtenidos en el backend:", rows);

    if (!rows || rows.length === 0) {
      console.warn("⚠️ No se encontraron resultados en la consulta.");
      return res.json([]);
    }

    res.json(rows);
  });
});
app.get('/ranking_ingredientes', (req, res) => {
  const query = 'SELECT * FROM ranking_ingredientes';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener los datos de ranking_ingredientes:', err.message);
      res.status(500).json({ error: 'Error al obtener los datos' });
    } else {
      res.status(200).json(rows);
    }
  });
});
app.get('/registro_ventas/by_fecha_ASC', (req, res) => {
  const sql = 'SELECT * FROM registro_ventas WHERE venta_procesada = 0 ORDER BY fecha ASC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});
app.get('/api/daily-challenges', (req, res) => {
  const query = `SELECT * FROM ofertas WHERE Tipo_Oferta = 'DailyChallenge'`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al recuperar Daily Challenges:', err.message);
      res.status(500).json({ error: 'Error al recuperar Daily Challenges.' });
    } else {
      console.log('Daily Challenges recuperados:', rows); // Log para verificar los datos
      res.json(rows);
    }
  });
});
app.get('/api/daily-challenge/:id', (req, res) => {
  const ofertaId = req.params.id;

  const query = `SELECT * FROM ofertas WHERE Oferta_Id = ?`;
  db.get(query, [ofertaId], (err, row) => {
    if (err) {
      console.error('Error al recuperar la oferta:', err.message);
      res.status(500).json({ error: 'Error al recuperar la oferta.' });
    } else {
      console.log('Datos recuperados:', row); // Log para verificar los datos
      res.json(row); // Incluye todos los campos, incluyendo Instrucciones_Link
    }
  });
});
app.get('/api/daily-challenge/:id/responses', (req, res) => {
  const daily_challenge_id = req.params.id;

  const query = `SELECT * FROM ChallengeResponses WHERE daily_challenge_id = ?`;
  
  db.all(query, [daily_challenge_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener las respuestas' });
    }
    res.json(rows);
  });
});
app.get('/IngredientExtraPrices', (req, res) => {
  const query = 'SELECT * FROM IngredientExtraPrices';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener los datos de IngredientExtraPrices:', err.message);
      res.status(500).json({ error: 'Error al obtener los datos' });
    } else {
      res.status(200).json(rows);
    }
  });
});
app.get('/reportes/posiciones-repartidores', (req, res) => {
  const { timeRange } = req.query;

  // Mapear los rangos de tiempo a consultas SQL
  const queryMap = {
    '7days': `SELECT w.id_repartidor, SUM(w.monto_pagado) AS total_distancia, COUNT(w.id_wallet) AS total_pedidos
              FROM wallet_repartidores w
              JOIN precio_delivery p ON p.id_precio = 1
              WHERE w.fecha_consolidacion >= DATE('now', '-6 days')
              GROUP BY w.id_repartidor`,
    '15days': `SELECT w.id_repartidor, SUM(w.monto_pagado) AS total_distancia, COUNT(w.id_wallet) AS total_pedidos
               FROM wallet_repartidores w
               JOIN precio_delivery p ON p.id_precio = 1
               WHERE w.fecha_consolidacion >= DATE('now', '-14 days')
               GROUP BY w.id_repartidor`,
    '30days': `SELECT w.id_repartidor, SUM(w.monto_pagado) AS total_distancia, COUNT(w.id_wallet) AS total_pedidos
               FROM wallet_repartidores w
               JOIN precio_delivery p ON p.id_precio = 1
               WHERE w.fecha_consolidacion >= DATE('now', '-29 days')
               GROUP BY w.id_repartidor`,
  };

  // Usar la consulta correspondiente o un valor predeterminado
  const sql = queryMap[timeRange] || queryMap['7days'];

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error en el endpoint /reportes/posiciones-repartidores:", err.message);
      res.status(400).json({ error: err.message });
      return;
    }

    if (!rows.length) {
      res.json({ message: "No data available", data: [] });
      return;
    }

    // Calcular la suma total de pedidos y distancia
    const totalPedidos = rows.reduce((sum, row) => sum + row.total_pedidos, 0);
    const totalDistancia = rows.reduce((sum, row) => sum + row.total_distancia, 0);

    if (totalPedidos === 0 || totalDistancia === 0) {
      res.json({ message: "No data available", data: [] });
      return;
    }

    // Calcular índice y ordenar
    const posiciones = rows.map(row => {
      const normalizadosPedidos = (row.total_pedidos / totalPedidos) * 50;
      const normalizadosDistancia = (row.total_distancia / totalDistancia) * 50;
      const indice = normalizadosPedidos + normalizadosDistancia;

      return {
        id_repartidor: row.id_repartidor,
        total_pedidos: row.total_pedidos,
        total_distancia: row.total_distancia.toFixed(2),
        indice: indice.toFixed(2),
      };
    }).sort((a, b) => b.indice - a.indice); // Ordenar por índice descendente

    res.json({
      message: "success",
      data: posiciones,
    });
  });
});
app.get('/reportes/repartidores', (req, res) => {
  const { timeRange, repartidor } = req.query;

  // Mapear los rangos de tiempo a consultas SQL
  const queryMap = {
    '7days': `SELECT DATE(w.fecha_consolidacion) AS fecha, w.monto_pagado, p.precio 
              FROM wallet_repartidores w
              CROSS JOIN precio_delivery p
              WHERE w.fecha_consolidacion >= DATE('now', '-6 days')`,
    '15days': `SELECT DATE(w.fecha_consolidacion) AS fecha, w.monto_pagado, p.precio 
               FROM wallet_repartidores w
               CROSS JOIN precio_delivery p
               WHERE w.fecha_consolidacion >= DATE('now', '-14 days')`,
    '30days': `SELECT DATE(w.fecha_consolidacion) AS fecha, w.monto_pagado, p.precio 
               FROM wallet_repartidores w
               CROSS JOIN precio_delivery p
               WHERE w.fecha_consolidacion >= DATE('now', '-29 days')`,
  };

  // Usar la consulta correspondiente o un valor predeterminado
  let sql = queryMap[timeRange] || queryMap['7days'];

  // Filtrar por repartidor si está presente
  if (repartidor && repartidor !== '') {
    sql += ` AND w.id_repartidor = ?`;
  }

  console.log(`Ejecutando consulta para timeRange: ${timeRange}, repartidor: ${repartidor}`);
  console.log(`Consulta SQL: ${sql}`);

  const params = repartidor && repartidor !== '' ? [repartidor] : [];

  // Ejecutar la consulta en la base de datos
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Error en el endpoint /reportes/repartidores:", err.message);
      res.status(400).json({ error: err.message });
      return;
    }

    if (!rows.length) {
      console.warn("No se encontraron registros para la consulta");
      res.json({ pedidos: 0, distancia: 0, pedidosPorDia: [] });
      return;
    }

    // Calcular indicadores
    const pedidosPorDia = {};
    let totalPedidos = 0;
    let totalDistancia = 0;

    rows.forEach((row) => {
      const distancia = row.precio > 0 ? row.monto_pagado / row.precio : 0;
      totalDistancia += distancia;

      // Agrupar pedidos y distancias por fecha
      if (!pedidosPorDia[row.fecha]) {
        pedidosPorDia[row.fecha] = { cantidad: 0, distancia: 0 };
      }
      pedidosPorDia[row.fecha].cantidad++;
      pedidosPorDia[row.fecha].distancia += distancia;

      totalPedidos++;
    });

    const pedidosPorDiaArray = Object.entries(pedidosPorDia)
      .sort(([fechaA], [fechaB]) => new Date(fechaA) - new Date(fechaB)) 
      .map(([fecha, data]) => ({
        fecha,
        cantidad: data.cantidad,
        distancia: data.distancia.toFixed(2),
      }));

    // Responder con los indicadores
    res.json({
      message: "success",
      data: {
        pedidos: totalPedidos,
        distancia: totalDistancia.toFixed(2),
        pedidosPorDia: pedidosPorDiaArray,
      },
    });
  });
});
app.get('/registro_ventas/filtrado', (req, res) => {
  const { timeRange } = req.query;

  // Mapear los rangos de tiempo a consultas SQL
  const queryMap = {
    '7days': `SELECT * FROM registro_ventas WHERE fecha >= DATE('now', '-6 days')`,
    '15days': `SELECT * FROM registro_ventas WHERE fecha >= DATE('now', '-14 days')`,
    '30days': `SELECT * FROM registro_ventas WHERE fecha >= DATE('now', '-29 days')`,
  };

  // Usar la consulta correspondiente o un valor predeterminado
  const sql = queryMap[timeRange] || queryMap['7days'];

  console.log(`Ejecutando consulta para timeRange: ${timeRange}`);
  console.log(`Consulta SQL: ${sql}`);

  // Ejecutar la consulta en la base de datos
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error en el endpoint /registro_ventas/filtrado:", err.message);
      res.status(400).json({ error: err.message });
      return;
    }

    console.log("Resultados obtenidos:", rows);
    res.json({
      message: "success",
      data: rows,
    });
  });
});
app.get('/repartidores/activos', (req, res) => {
  const query = 'SELECT id_repartidor, nombre FROM repartidores WHERE estado = "Activo"';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener repartidores activos:', err);
      res.status(500).json({ success: false, message: 'Error interno al obtener repartidores activos.' });
    } else {
      res.json({ success: true, data: rows });
    }
  });
});
app.get('/repartidores/:id/estado-horario', (req, res) => {
  const { id } = req.params;
  const diaActual = traducirDia(moment().format('dddd')); // Día actual en español
  const horaActual = moment().format('HH:mm'); // Hora actual

  console.log(`Evaluando horarios laborales para el día ${diaActual}, hora actual: ${horaActual}`);

  const query = `
      SELECT * 
      FROM horarios 
      WHERE LOWER(Day) = ? 
      ORDER BY Hora_inicio ASC
  `;

  db.all(query, [diaActual], (err, horarios) => {
      if (err) {
          console.error('Error al consultar horarios:', err);
          res.status(500).json({ puedeActivar: false, mensaje: 'Error interno al consultar horarios.' });
          return;
      }

      if (!horarios || horarios.length === 0) {
          console.warn(`No se encontraron horarios para el día ${diaActual}.`);
          res.json({ puedeActivar: false, mensaje: `No hay horarios laborales definidos para hoy (${diaActual}).` });
          return;
      }

      console.log(`✔️ Horarios encontrados:`, horarios);

      // Validar si el repartidor está dentro de un horario válido
      const horarioValido = horarios.some((horario) => {
          let horaFin = horario.Hora_fin === '00:00' ? '23:59' : horario.Hora_fin; // Manejo de medianoche
          const esValido = horaActual >= horario.Hora_inicio && horaActual <= horaFin;
          console.log(`Evaluando turno ${horario.Shift}: Inicio ${horario.Hora_inicio}, Fin ${horario.Hora_fin}, ¿Valido? ${esValido}`);
          return esValido;
      });

      if (horarioValido) {
          res.json({ puedeActivar: true, mensaje: 'Estás dentro de un horario laboral válido.' });
      } else {
          const proximoTurno = horarios.find((horario) => horaActual < horario.Hora_inicio);
          const mensaje =
              proximoTurno
                  ? `Tu próximo turno comienza a las ${proximoTurno.Hora_inicio}.`
                  : 'No tienes más turnos laborales hoy.';
          console.warn(`El repartidor no está en horario laboral válido. ${mensaje}`);
          res.json({ puedeActivar: false, mensaje });
      }
  });
});
app.get('/repartidores/:id', (req, res) => {
  const { id } = req.params;

  const query = 'SELECT estado FROM repartidores WHERE id_repartidor = ?';
  db.get(query, [id], (err, row) => {
      if (err) {
          console.error('Error al obtener el estado del repartidor:', err);
          res.status(500).json({ success: false, message: 'Error al obtener el estado' });
          return;
      }

      if (!row) {
          res.status(404).json({ success: false, message: 'Repartidor no encontrado' });
          return;
      }

      res.json({ success: true, estado: row.estado });
  });
});
app.get('/registro_ventas/ruta_disponibilidad/:enRuta', (req, res) => {
  const enRuta = req.params.enRuta;

  const query = `
      SELECT id_order, estado_entrega, id_repartidor 
      FROM registro_ventas 
      WHERE enRuta = ?
  `;

  db.all(query, [enRuta], (err, rows) => {
    if (err) {
      console.error('Error al consultar la disponibilidad de la ruta:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron pedidos para la ruta proporcionada' });
    }

    // Enviar la lista de pedidos con sus estados de entrega
    res.json(rows);
  });
});
app.get("/rutas/:id", (req, res) => {
  const { id } = req.params;
  const query = "SELECT * FROM rutas WHERE id_ruta = ?";
  db.get(query, [id], (err, row) => {
      if (err) {
          console.error(`Error al obtener la ruta con ID ${id}:`, err);
          res.status(500).json({ success: false, message: "Error al obtener la ruta" });
      } else if (row) {
          res.json({ success: true, data: row });
      } else {
          res.status(404).json({ success: false, message: "Ruta no encontrada" });
      }
  });
});
app.get("/rutas", (req, res) => {
  const query = "SELECT * FROM rutas";
  db.all(query, [], (err, rows) => {
      if (err) {
          console.error("Error al obtener las rutas:", err);
          res.status(500).json({ success: false, message: "Error al obtener las rutas" });
      } else {
          res.json({ success: true, data: rows });
      }
  });
});
app.get('/delivery/price', (req, res) => {
  db.get('SELECT precio FROM precio_delivery WHERE id_precio = 1', (err, row) => {
    if (err) {
      console.error('Error al obtener el precio del delivery:', err);
      res.status(500).json({ error: 'Error al obtener el precio del delivery' });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'No se encontró el precio del delivery' });
    } else {
      res.json({ success: true, precio: row.precio });
    }
  });
});
app.get('/wallet/:id_repartidor', (req, res) => {
  const { id_repartidor } = req.params;
  const filtro = req.query.filtro;

  let whereClause = 'WHERE id_repartidor = ?';
  let params = [id_repartidor];

  if (filtro === 'diario') {
      whereClause += ' AND DATE(fecha_consolidacion) = DATE("now")';
  } else if (filtro === 'mensual') {
      whereClause += ' AND strftime("%Y-%m", fecha_consolidacion) = strftime("%Y-%m", "now")';
  }

  db.all(`SELECT * FROM wallet_repartidores ${whereClause}`, params, (err, wallet) => {
      if (err) {
          console.error('Error al obtener la información de la wallet:', err);
          res.status(500).json({ success: false, message: 'Error al obtener la información de la wallet' });
      } else {
          res.json({ success: true, data: wallet });
      }
  });
});
app.get('/registro_ventas/disponibilidad/:id', (req, res) => {
  const idOrder = req.params.id;

  const query = `
      SELECT estado_entrega, id_repartidor 
      FROM registro_ventas 
      WHERE id_order = ?
  `;

  db.get(query, [idOrder], (err, row) => {
    if (err) {
      console.error('Error al consultar la disponibilidad del pedido:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Enviar información sobre la disponibilidad del pedido
    res.json({ 
      data: {
        estado_entrega: row.estado_entrega,
        id_repartidor: row.id_repartidor || null
      }
    });
  });
});
app.get('/repartidores', (req, res) => {
  db.all('SELECT * FROM repartidores', [], (err, rows) => {
      if (err) {
          console.error('Error al obtener repartidores:', err.message);
          res.status(500).json({ error: 'Error al obtener repartidores' });
      } else {
          res.json({ success: true, data: rows });
      }
  });
});
app.get('/pedidos_en_cola/:ubicacionId', async (req, res) => {
  const { ubicacionId } = req.params;
  try {
    // Consulta a la base de datos para obtener el número de pedidos en cola para la ubicación especificada
    const query = `SELECT pedidos_en_cola FROM PedidosEnCola WHERE id_ubicacion = ?`;

    db.get(query, [ubicacionId], (error, row) => {
      if (error) {
        console.error('Error al obtener pedidos en cola:', error);
        res.status(500).json({ success: false, message: 'Error al obtener pedidos en cola' });
        return;
      }

      if (row) {
        res.json({ success: true, pedidosEnCola: row.pedidos_en_cola });
    } else {
        res.json({ success: true, pedidosEnCola: 0 }); // Cambia success a true
    }
    });

  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).json({ success: false, message: 'Error al obtener pedidos en cola' });
  }
});
app.get('/api/pizzeria-settings', (req, res) => {
  const query = 'SELECT * FROM PizzeriaSettings WHERE id = 1'; // Ajusta según tus necesidades
  db.get(query, (err, row) => {  // Usa 'get' si esperas un solo resultado
    if (err) {
      res.status(500).json({ message: 'Error al obtener el estado de suspensión' });
      console.error(err.message);
      return;
    }
    res.json(row);
  });
});
app.get('/api/horarios', (req, res) => {
  const query = 'SELECT * FROM Horarios'; // Asumiendo que tu tabla se llama 'Horarios'
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ message: 'Error al obtener los horarios' });
      console.error(err.message);
      return;
    }
    res.json(rows); // Devuelve todos los horarios disponibles
  });
});
app.get('/api/horarios/:day', (req, res) => {
  const { day } = req.params;

  const query = `SELECT * FROM Horarios WHERE Day = ?`;

  db.all(query, [day], (err, rows) => {
      if (err) {
          console.error('Error al obtener los horarios:', err);
          res.status(500).json({ error: 'Error al obtener los horarios' });
      } else {
          res.status(200).json(rows);
      }
  });
});
app.get('/clientes/:id_cliente', (req, res) => {
  const { id_cliente } = req.params;

  const sql = 'SELECT * FROM clientes WHERE id_cliente = ?';
  
  db.get(sql, [id_cliente], (err, row) => {
    if (err) {
      console.error('Error al obtener la información del cliente:', err);
      return res.status(500).json({ error: 'Error al obtener la información del cliente' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    res.json(row);
  });
});
app.get('/api/incentivos/:id', (req, res) => {
  const { id } = req.params;
  
  const query = 'SELECT * FROM IncentivosTO WHERE id = ?';
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error al obtener el incentivo:', err);
      res.status(500).json({ error: 'Error al obtener el incentivo' });
    } else if (!row) {
      res.status(404).json({ error: 'Incentivo no encontrado' });
    } else {
      res.json(row);
    }
  });
});
app.get('/api/incentivos', (req, res) => {
  const query = 'SELECT * FROM IncentivosTO';

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Error al obtener los incentivos' });
    } else {
      res.json(rows);
    }
  });
})
app.get('/ofertas/:segmento', (req, res) => {
  const { segmento } = req.params;
  
  const sql = `SELECT * FROM ofertas WHERE Segmentos_Aplicables LIKE ?`;
  const params = [`%${segmento}%`];

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }

    // Calculamos el tiempo restante según el tipo de cupón
    const ofertasConTiempoRestante = rows.map(offer => {
      const currentTime = moment();

      // Si el cupón es temporal, calculamos las horas restantes
      if (offer.Tipo_Cupon === 'temporal') {
        const horaInicio = moment(offer.Hora_Inicio, 'HH:mm');
        const horaFin = moment(offer.Hora_Fin, 'HH:mm');
        const diasActivos = JSON.parse(offer.Dias_Activos || '[]'); // Días activos del cupón

        const diaActual = moment().format('dddd'); // Ejemplo: Lunes, Martes, etc.
        let timeLeftInSeconds = 0;
        
        if (diasActivos.includes(diaActual)) {
          if (currentTime.isBefore(horaInicio)) {
            // Oferta bloqueada, mostrar cuenta regresiva hasta la hora de inicio
            timeLeftInSeconds = horaInicio.diff(currentTime, 'seconds');
          } else if (currentTime.isBetween(horaInicio, horaFin)) {
            // Oferta activa, mostrar tiempo restante hasta la hora de fin
            timeLeftInSeconds = horaFin.diff(currentTime, 'seconds');
          } else {
            // Si ya pasó el horario del día actual
            timeLeftInSeconds = 0; // Oferta bloqueada
          }
        } else {
          // El día actual no es un día activo, bloquear oferta
          timeLeftInSeconds = 0;
        }

        return {
          ...offer,
          timeLeft: timeLeftInSeconds > 0 ? timeLeftInSeconds : 0,  // Si ha expirado, ponemos 0
          isBlocked: timeLeftInSeconds <= 0 // Bloqueamos si el tiempo es 0
        };
      } else {
        // Para cupones permanentes, la oferta está activa mientras haya cupones disponibles
        const isBlocked = offer.Cupones_Disponibles <= 0;

        return {
          ...offer,
          timeLeft: null, // No hay cuenta regresiva
          isBlocked: isBlocked
        };
      }
    });

    res.json({
      "message": "success",
      "data": ofertasConTiempoRestante
    });
  });
});
app.get('/ofertas/edit/:Oferta_Id', (req, res) => {
  const { Oferta_Id } = req.params;

  console.log('ID de la oferta solicitada para edición:', Oferta_Id); // Log para ver el ID

  if (isNaN(Oferta_Id)) {
    console.log('ID no es un número válido:', Oferta_Id);
    return res.status(400).json({ "error": "Invalid Oferta_Id. Must be a number." });
  }

  const sql = 'SELECT * FROM ofertas WHERE Oferta_Id = ?';
  db.get(sql, [Oferta_Id], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ "error": "Internal Server Error. Please try again later." });
    }

    if (!row) {
      console.log('No se encontró oferta con el ID:', Oferta_Id);
      return res.status(404).json({ "message": "No offer found with the provided Oferta_Id." });
    }

    console.log('Oferta encontrada:', row); // Log para ver los datos
    res.json({
      "message": "success",
      "data": row
    });
  });
});
app.get('/api/reviews', (req, res) => {
  const query = `SELECT email, review, rating, created_at FROM reviews ORDER BY created_at DESC LIMIT 5`;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener los reviews:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    res.json(rows);
  });
});
app.get('/api/reviews/:email', (req, res) => {
  const { email } = req.params;

  const query = 'SELECT * FROM reviews WHERE email = ?';
  db.all(query, [email], (err, rows) => {
    if (err) {
      console.error('Error al obtener las reviews:', err);
      res.status(500).json({ error: 'Error al obtener las reviews del usuario' });
    } else if (rows.length > 0) {
      res.status(200).json(rows);
    } else {
      res.status(404).json({ message: 'No se encontraron reviews para este usuario' });
    }
  });
});
app.get('/api/info-empresa', (req, res) => {
  const query = `SELECT * FROM InfoEmpresa`; // Obtener todos los registros de la tabla InfoEmpresa

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener la información de la empresa' });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'No se encontró la información de la empresa' });
    }
    res.json(rows); // Enviar todas las filas
  });
});
app.get('/api/info-empresa/:id', (req, res) => {
  const id = req.params.id;

  // Consulta para obtener la información de la tienda desde la base de datos
  const sql = "SELECT * FROM InfoEmpresa WHERE id = ?";
  const params = [id];

  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ "message": "No se encontró la tienda con el ID proporcionado." });
      return;
    }
    res.json({
      "message": "success",
      "data": row
    });
  });
});
app.get('/ofertas', (req, res) => {
  db.all('SELECT * FROM ofertas', [], (err, rows) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});
app.get('/extractCoordinates', (req, res) => {
  const { url } = req.query;
  const coords = extractCoordinates(url);
  if (coords) {
    res.json(coords);
  } else {
    res.status(400).json({ error: 'Invalid URL format or URL missing' });
  }
});
app.get('/testdb', (req, res) => {
  db.all("SELECT * FROM clientes", [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});
app.get('/DetallesLote/:InventarioID', (req, res) => {
  const { InventarioID } = req.params;
  const sql = 'SELECT * FROM DetallesLote WHERE InventarioID = ?';

  db.get(sql, [InventarioID], (err, row) => {
    if (err) {
      res.status(500).send({ error: err.message });
      return;
    }
    const existe = row ? true : false;
    res.json({ existe });
  });
});
app.get('/inventario', (req, res) => {
  db.all("SELECT * FROM inventario", [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});
app.get('/inventario/:IDR', (req, res) => {
  const { IDR } = req.params;
  const sql = "SELECT * FROM inventario WHERE IDR = ?"; 
  const params = [IDR];

  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    if (row) {
      res.json({
        "message": "success",
        "data": row
      });
    } else {
      res.status(404).json({ "message": "Not found" });
    }
  });
});
app.get('/inventario/por-idi/:IDI', (req, res) => {
  const { IDI } = req.params;
  const sql = "SELECT IDR, IDI, producto, disponible, unidadMedida, fechaCaducidad FROM inventario WHERE IDI = ? ORDER BY fechaCaducidad ASC, IDR ASC";
  const params = [IDI];

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }

    if (rows.length === 0) {
      res.json({
        "message": "No hay lotes disponibles para este ingrediente.",
        "data": []
      });
      return;
    }

    res.json({
      "message": "success",
      "data": rows
    });
  });
});
app.get('/menu_pizzas/:id', (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM menu_pizzas WHERE id = ?";
  const params = [id];

  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }

    try {
      // Convertir los campos que están en formato string JSON a objetos reales
      row.ingredientes = JSON.parse(row.ingredientes);
      row.selectSize = JSON.parse(row.selectSize);
      row.PriceBySize = JSON.parse(row.PriceBySize);
      row.PIDI = JSON.parse(row.PIDI);
    } catch (error) {
      console.error("Error al parsear datos JSON:", error);
      res.status(500).json({ "error": "Error interno al parsear datos." });
      return;
    }

    res.json({
      "message": "success",
      "data": row
    });
  });
});
app.get('/menu_pizzas', (req, res) => {
  db.all("SELECT * FROM menu_pizzas", [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});
app.get('/api/menus', async (req, res) => {
  try {
    const menus = await obtenerPizzasDesdeLaBaseDeDatos(); // Debes implementar esta función
    res.json(menus);
  } catch (error) {
    console.error("Error al obtener los menús:", error);
    res.status(500).send('Error al obtener los menús');
  }
});
app.get('/PartnerData', (req, res) => {
  const sql = 'SELECT * FROM PartnerData';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});
app.get('/PartnerData/:id', (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM PartnerData WHERE id = ?";
  const params = [id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": row
    });
  });
});
db.get('SELECT * FROM clientes', [], (err, result) => {
  if (err) {
    console.error('Error fetching users:', err);
  } else {
    // console.log('Sample user data:', result);
  }
});
app.get('/registro_ventas', (req, res) => {
  const sql = 'SELECT * FROM registro_ventas';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});
app.get('/registro_ventas/cliente/:id', (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM registro_ventas WHERE id_cliente = ?";
  const params = [id];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});
app.get('/comentarios/cliente/:idCliente', (req, res) => {
  const idCliente = req.params.idCliente;
  const sql = "SELECT * FROM comentarios WHERE id_cliente = ?";
  db.all(sql, [idCliente], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});
app.get('/limites', (req, res) => {
  // Consulta para obtener todos los límites
  const sql = 'SELECT * FROM SetLimite';
  
  // Ejecutar la consulta en la base de datos
  db.all(sql, [], (err, rows) => {
    if (err) {
      // Manejar el error, posiblemente devolviendo un código de estado HTTP 500
      res.status(500).send(err.message);
    } else {
      // Devolver los resultados de la consulta al cliente
      res.status(200).json(rows);
    }
  });
});
app.get('/limites/:IDI', (req, res) => {
  const { IDI } = req.params;
  const sql = 'SELECT * FROM SetLimite WHERE IDI = ?';

  db.get(sql, [IDI], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (row) {
      res.status(200).json(row);
    } else {
      res.status(404).send('Limite no encontrado para el ingrediente con IDI: ' + IDI);
    }
  });
});
app.get('/ventas', (req, res) => {
  const { startDate, endDate, customer, location } = req.query;
  let sql = `SELECT * FROM registro_ventas WHERE 1=1`;
  let params = [];

  if (startDate) {
    sql += ` AND fecha >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND fecha <= ?`;
    params.push(endDate);
  }
  if (customer !== 'ALL') {
    sql += ` AND id_cliente = ?`;
    params.push(customer);
  }
  if (location) {
    sql += ` AND id_cliente IN (SELECT id_cliente FROM clientes WHERE address_1 LIKE ?)`;
    params.push(`%${location}%`);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});
app.get('/historial_clientes', (req, res) => {
  const { startDate, endDate, customer, location } = req.query;
  let sql = `SELECT * FROM HistorialCliente WHERE 1=1`;
  let params = [];

  if (startDate) {
    sql += ` AND fecha >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND fecha <= ?`;
    params.push(endDate);
  }
  if (customer !== 'ALL') {
    sql += ` AND id_cliente = ?`;
    params.push(customer);
  }
  if (location) {
    sql += ` AND id_cliente IN (SELECT id_cliente FROM clientes WHERE address_1 LIKE ?)`;
    params.push(`%${location}%`);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});
app.get('/clientes', (req, res) => {
  const sql = `
    SELECT id_cliente, email, password, bday, suspension_status, suspension_end_date, created_at 
    FROM clientes
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});
app.get('/locations', (req, res) => {
  const sql = `SELECT DISTINCT address_1 FROM clientes WHERE address_1 IS NOT NULL`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const locations = rows.map(row => row.address_1.split(',')[0].trim()); // Supongamos que address_1 tiene la ciudad como primera parte
    res.json(locations);
  });
});
app.get('/ventas/promedios', (req, res) => {
  const { startDate, endDate, customer, location } = req.query;

  let whereClause = '';
  const queryParams = [];

  if (customer && customer !== 'ALL') {
    whereClause += ' AND id_cliente = ?';
    queryParams.push(customer);
  }

  if (location && location !== 'ALL') {
    whereClause += ' AND id_cliente IN (SELECT id_cliente FROM ubicaciones WHERE ciudad = ?)';
    queryParams.push(location);
  }

  const queryHistorico = `
    SELECT SUM(cantidad) as total_pizzas, COUNT(DISTINCT fecha) as total_dias
    FROM registro_ventas
    WHERE 1=1 ${whereClause}
  `;

  const queryReciente = `
    SELECT SUM(cantidad) as total_pizzas, COUNT(DISTINCT fecha) as total_dias
    FROM registro_ventas
    WHERE fecha BETWEEN ? AND ? ${whereClause}
  `;

  db.get(queryHistorico, queryParams, (err, rowHistorico) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    db.get(queryReciente, [startDate, endDate, ...queryParams], (err, rowReciente) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const promedio_historico = rowHistorico.total_pizzas / (rowHistorico.total_dias || 1);
      const promedio_reciente = rowReciente.total_pizzas / (rowReciente.total_dias || 1);

      res.json({
        promedio_historico: promedio_historico || 0,
        total_historico: rowHistorico.total_pizzas || 0,
        promedio_reciente: promedio_reciente || 0,
        total_reciente: rowReciente.total_pizzas || 0,
      });
    });
  });
});
app.get('/ticket_promedio', (req, res) => {
  const { startDate, endDate, customer, location } = req.query;

  if (!startDate || !endDate) {
    console.log('Start date and end date are required');
    res.status(400).json({ error: 'Start date and end date are required' });
    return;
  }

  console.log('Request received with dates:', startDate, endDate);
  console.log('Customer filter:', customer);
  console.log('Location filter:', location);

  let whereClause = '';
  const queryParams = [];

  if (customer && customer !== 'ALL') {
    whereClause += ' AND id_cliente = ?';
    queryParams.push(customer);
  }

  if (location && location !== 'ALL') {
    whereClause += ' AND id_cliente IN (SELECT id_cliente FROM ubicaciones WHERE ciudad = ?)';
    queryParams.push(location);
  }

  const queryHistorico = `
    SELECT AVG(totalPagado) as ticket_promedio_historico
    FROM registro_ventas
    WHERE 1=1 ${whereClause}
  `;

  const queryReciente = `
    SELECT AVG(totalPagado) as ticket_promedio_reciente
    FROM registro_ventas
    WHERE fecha BETWEEN ? AND ? ${whereClause}
  `;

  console.log('Query Histórico:', queryHistorico);
  console.log('Query Reciente:', queryReciente);
  console.log('Query Params:', queryParams);

  db.get(queryHistorico, queryParams, (err, rowHistorico) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    db.get(queryReciente, [startDate, endDate, ...queryParams], (err, rowReciente) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      console.log('Historical data:', rowHistorico);
      console.log('Recent data:', rowReciente);

      res.json({
        ticket_promedio_historico: rowHistorico ? rowHistorico.ticket_promedio_historico : 0,
        ticket_promedio_reciente: rowReciente ? rowReciente.ticket_promedio_reciente : 0,
      });
    });
  });
});
app.get('/top_pizzas', (req, res) => {
  const { startDate, endDate, customer, location } = req.query;

  if (!startDate || !endDate) {
    console.log('Start date and end date are required');
    res.status(400).json({ error: 'Start date and end date are required' });
    return;
  }

  console.log('Request received with dates:', startDate, endDate, customer, location);

  let whereClause = '';
  const queryParams = [];

  if (customer && customer !== 'ALL') {
    whereClause += ' AND id_cliente = ?';
    queryParams.push(customer);
  }

  if (location && location !== 'ALL') {
    whereClause += ' AND id_cliente IN (SELECT id_cliente FROM ubicaciones WHERE ciudad = ?)';
    queryParams.push(location);
  }

  const queryHistorico = `
    SELECT id_pizza, COUNT(*) as total_vendidas
    FROM registro_ventas
    WHERE 1=1 ${whereClause}
    GROUP BY id_pizza
    ORDER BY total_vendidas DESC
    LIMIT 3
  `;

  const queryReciente = `
    SELECT id_pizza, COUNT(*) as total_vendidas
    FROM registro_ventas
    WHERE fecha BETWEEN ? AND ? ${whereClause}
    GROUP BY id_pizza
    ORDER BY total_vendidas DESC
    LIMIT 3
  `;

  db.all(queryHistorico, queryParams, (err, rowsHistorico) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    db.all(queryReciente, [startDate, endDate, ...queryParams], (err, rowsReciente) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      console.log('Historical data:', rowsHistorico);
      console.log('Recent data:', rowsReciente);

      res.json({
        historico: rowsHistorico || [],
        reciente: rowsReciente || [],
      });
    });
  });
});
app.get('/segmentos', (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    console.log('Start date and end date are required');
    res.status(400).json({ error: 'Start date and end date are required' });
    return;
  }

  console.log('Request received with dates:', startDate, endDate);

  const query = `
    SELECT 
      fecha as day,
      SUM(CASE WHEN segmento = 1 THEN 1 ELSE 0 END) as potencial,
      SUM(CASE WHEN segmento = 2 THEN 1 ELSE 0 END) as inactivo,
      SUM(CASE WHEN segmento = 3 THEN 1 ELSE 0 END) as activo,
      SUM(CASE WHEN segmento = 4 THEN 1 ELSE 0 END) as mvc
    FROM HistorialCliente
    WHERE fecha BETWEEN ? AND ?
    GROUP BY day
    ORDER BY day;
  `;

  db.all(query, [startDate, endDate], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    console.log('Segmentos data:', rows);

    res.json(rows);
  });
});
app.get('/zonas', (req, res) => {
  const query = `
    SELECT lat, lon, COUNT(*) as numeroDeCompras
    FROM clientes
    GROUP BY lat, lon
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const totalCompras = rows.reduce((sum, row) => sum + row.numeroDeCompras, 0);

    const data = rows.map(row => ({
      lat: row.lat,
      lon: row.lon,
      numeroDeCompras: row.numeroDeCompras,
      porcentaje: (row.numeroDeCompras / totalCompras) * 100
    }));

    res.json(data);
  });
});
app.get('/ubicaciones', (req, res) => {
  const { ciudad } = req.query;
  let selectUbicacionesSql = `SELECT * FROM ubicaciones`;
  
  if (ciudad && ciudad !== 'All') {
    selectUbicacionesSql += ` WHERE ciudad = ?`;
  }

  db.all(selectUbicacionesSql, ciudad && ciudad !== 'All' ? [ciudad] : [], (err, rows) => {
    if (err) {
      console.error('Error al obtener ubicaciones:', err);
      res.status(500).json({ "error": err.message });
      return;
    }
    res.json(rows);
  });
});
//the post zone // 
app.post('/registro_ventas/bulk', async (req, res) => {
  const ventas = req.body; // Array de ventas recibidas
  console.log('Ventas recibidas para simulación:', ventas);

  if (!Array.isArray(ventas) || ventas.length === 0) {
      return res.status(400).json({ error: 'El cuerpo de la solicitud debe ser un array de ventas' });
  }

  db.serialize(() => {
      db.run('BEGIN TRANSACTION;');

      try {
          let ventasInsertadas = 0;
          let clientesActualizados = new Set(); // Para evitar actualizaciones duplicadas

          ventas.forEach((venta) => {
              const {
                  id_cliente,
                  id_pizza,
                  cantidad,
                  size,
                  price,
                  fecha,
                  hora,
                  metodo_pago,
                  totalPagado
              } = venta;

              // Verificar que los datos esenciales estén presentes
              if (!id_cliente || !id_pizza || !cantidad || !size || !price || !fecha || !hora || !metodo_pago) {
                  console.warn('Venta omitida por datos faltantes:', venta);
                  return;
              }

              // Insertar cada venta individualmente
              const insertSql = `
                  INSERT INTO registro_ventas (
                      id_cliente,
                      fecha,
                      hora,
                      metodo_pago,
                      total_productos,
                      total_con_descuentos,
                      total_descuentos,
                      productos,
                      metodo_entrega,
                      cupones,
                      incentivos,
                      observaciones,
                      estado_entrega,
                      id_repartidor
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
              `;

              const productosJson = JSON.stringify([{ id_pizza, cantidad, size, price }]); // Guardar productos en formato JSON
              const metodo_entrega = '{}'; // Simulación sin método de entrega
              const cupones = '[]'; // Sin cupones en simulación
              const incentivos = '[]'; // Sin incentivos en simulación
              const observaciones = 'Venta simulada';
              const estado_entrega = 'Simulación';
              const id_repartidor = null;

              db.run(
                  insertSql,
                  [
                      id_cliente,
                      fecha,
                      hora,
                      metodo_pago,
                      cantidad, // total_productos
                      totalPagado, // total_con_descuentos
                      0, // total_descuentos en simulación
                      productosJson,
                      metodo_entrega,
                      cupones,
                      incentivos,
                      observaciones,
                      estado_entrega,
                      id_repartidor
                  ],
                  function (err) {
                      if (err) {
                          console.error('Error al insertar venta:', err.message);
                          db.run('ROLLBACK;');
                          return res.status(500).json({ error: err.message });
                      }

                      ventasInsertadas++;

                      // Solo actualizamos cada cliente una vez
                      if (!clientesActualizados.has(id_cliente)) {
                          clientesActualizados.add(id_cliente);

                          actualizarIndicadoresCliente(id_cliente, fecha, (updateErr) => {
                              if (updateErr) {
                                  console.error(`Error al actualizar indicadores del cliente ${id_cliente}:`, updateErr.message);
                              } else {
                                  console.log(`Indicadores del cliente ${id_cliente} actualizados correctamente.`);
                              }
                          });
                      }
                  }
              );
          });

          db.run('COMMIT;', (commitErr) => {
              if (commitErr) {
                  console.error('Error en COMMIT:', commitErr.message);
                  return res.status(500).json({ error: 'Error al confirmar transacción' });
              }

              console.log(`Ventas simuladas registradas con éxito: ${ventasInsertadas}`);
              console.log(`Clientes actualizados: ${Array.from(clientesActualizados).join(', ')}`);

              return res.status(200).json({
                  success: true,
                  message: `${ventasInsertadas} ventas simuladas registradas con éxito`,
                  clientesActualizados: Array.from(clientesActualizados).length
              });
          });
      } catch (error) {
          db.run('ROLLBACK;');
          console.error('Error en la transacción:', error.message);
          return res.status(500).json({ error: 'Error en la transacción de ventas simuladas' });
      }
  });
});
app.post('/api/auth/remember-me', (req, res) => {
  const { email } = req.body;

  const query = `SELECT password FROM clientes WHERE email = ?`;

  db.get(query, [email], (err, row) => {
    if (err) {
      console.error('Error al consultar la base de datos:', err);
      return res.status(500).json({ message: 'Error en el servidor' });
    }

    if (!row) {
      return res.status(404).json({ message: 'Correo no registrado.' });
    }

    // Retorna la contraseña al frontend
    return res.json({ password: row.password });
  });
});
app.post('/api/auth/google-login', async (req, res) => {
  const { token } = req.body;

  try {
    // Verificar el token con Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '718859045648-ac01g0oqu3pdd87tc84n195harhp5t57.apps.googleusercontent.com',
    });

    const payload = ticket.getPayload();
    const { email } = payload;

    // Verificar si el usuario ya existe en la base de datos
    const userQuery = `SELECT * FROM clientes WHERE email = ?`;
    db.get(userQuery, [email], (err, user) => {
      if (err) {
        console.error('Error en la base de datos:', err);
        return res.status(500).json({ message: 'Error en el servidor' });
      }

      if (user) {
        // Usuario existente: iniciar sesión
        return res.json({
          id_cliente: user.id_cliente,
          email: user.email,
        });
      } else {
        // Usuario nuevo: registrar y enviar correo de bienvenida
        const secuenciaSql = `SELECT COUNT(*) as count FROM clientes WHERE DATE(created_at) = DATE('now')`;
        db.get(secuenciaSql, [], (err, row) => {
          if (err) {
            console.error('Error al obtener la secuencia:', err);
            res.status(500).json({ message: 'Error generating sequence' });
            return;
          }

          const secuencia = row.count + 1;
          const id_cliente = `CLNT${new Date().toISOString().split('T')[0].replace(/-/g, '')}${String(secuencia).padStart(3, '0')}`;
          const defaultPassword = 'google_default_password'; // Contraseña predeterminada

          const insertQuery = `
            INSERT INTO clientes (id_cliente, email, password) 
            VALUES (?, ?, ?)
          `;

          db.run(insertQuery, [id_cliente, email, defaultPassword], function (err) {
            if (err) {
              console.error('Error al registrar usuario:', err);
              return res.status(500).json({ message: 'Error en el servidor' });
            }

            // Enviar correo de bienvenida
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: 'mycrushpizzaspain@gmail.com',
                pass: 'pfpjczrsksoytvhv', // Contraseña de aplicación
              },
            });

            const mailOptions = {
              from: 'mycrushpizzaspain@gmail.com',
              to: email,
              subject: 'Welcome to MyPizzaCrush!',
              text: `
                ¡Hola!

                Gracias por registrarte en MyPizzaCrush con tu cuenta de Google. Aquí están tus credenciales:

                - Email: ${email}
                - id_cliente: ${id_cliente}

                Aunque te registraste con Google, puedes usar esta contraseña para acceder directamente en el futuro.

                ¡Gracias por unirte a nuestra comunidad!

                MyPizzaCrush Team
              `,
            };

            transporter.sendMail(mailOptions, (mailErr, info) => {
              if (mailErr) {
                console.error('Error al enviar el correo de bienvenida:', mailErr.message);
              } else {
                console.log('Correo de bienvenida enviado con éxito:', info.response);
              }
            });

            // Responder con éxito
            return res.json({
              id_cliente,
              email,
            });
          });
        });
      }
    });
  } catch (error) {
    console.error('Error en la verificación de Google:', error);
    res.status(401).json({ message: 'Token inválido' });
  }
});
app.post('/admin/register', async (req, res) => {
  const { nombre, correo, contrasena } = req.body;

  if (!nombre || !correo || !contrasena) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  try {
    // Verificar si el correo ya existe
    const adminExistente = await db.get('SELECT * FROM administrador WHERE correo = ?', [correo]);
    if (adminExistente) {
      return res.status(400).json({ message: 'El correo ya está registrado.' });
    }

    // Insertar el nuevo administrador
    await db.run(
      'INSERT INTO administrador (nombre, correo, contrasena) VALUES (?, ?, ?)',
      [nombre, correo, contrasena]
    );

    res.status(201).json({ success: true, message: 'Administrador registrado exitosamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar el administrador.' });
  }
});
app.post('/admin/login', (req, res) => {
  const { correo, contrasena } = req.body;

  // Validar que se envíen los campos
  if (!correo || !contrasena) {
      return res.status(400).json({ message: "Por favor, ingrese correo y contraseña." });
  }

  // Consultar el administrador en la base de datos
  const query = 'SELECT * FROM administrador WHERE correo = ?';
  db.get(query, [correo], (err, row) => {
      if (err) {
          console.error("Error al consultar la base de datos:", err);
          return res.status(500).json({ message: "Error interno del servidor." });
      }

      if (!row) {
          return res.status(404).json({ message: "Administrador no encontrado." });
      }

      // Verificar la contraseña (para texto plano)
      if (row.contrasena !== contrasena) {
          return res.status(401).json({ message: "Credenciales incorrectas." });
      }

      // Inicio de sesión exitoso
      res.json({
          message: "Inicio de sesión exitoso.",
          admin: { id: row.id_admin, nombre: row.nombre, correo: row.correo }
      });
  });
});
app.post("/registro_ventas/finalizar_ruta", async (req, res) => {
  const { id_repartidor, id_ruta, pedidos } = req.body;

  try {
      // Actualizar el estado de los pedidos a "Entregado"
      for (const pedido of pedidos) {
          await db.run(
              `UPDATE registro_ventas SET estado_entrega = 'Entregado' WHERE id_order = ?`,
              [pedido.id_order]
          );

          // Insertar en la wallet consolidada
          await db.run(
              `INSERT INTO wallet (id_order, id_repartidor, monto_por_cobrar, estado) 
               VALUES (?, ?, ?, 'Por Cobrar')`,
              [pedido.id_order, id_repartidor, pedido.costoDelivery]
          );
      }

      res.json({ success: true, message: "Ruta finalizada y wallet actualizada." });
  } catch (error) {
      console.error("Error al finalizar la ruta:", error);
      res.status(500).json({ success: false, message: "Error al finalizar la ruta." });
  }
});
app.post("/rutas", (req, res) => {
  const {
      id_ruta,
      costo_total,
      distancia_total,
      tiempo_estimado,
      numero_paradas,
      id_pedidos,
      direcciones,
      express,
      tienda_salida,
      estado = "Pendiente",
      observaciones = null,
      prioridad = "Media"
  } = req.body;

  const query = `
      INSERT INTO rutas (
          id_ruta, fecha_creacion, costo_total, distancia_total, tiempo_estimado,
          numero_paradas, id_pedidos, direcciones, express, tienda_salida,
          estado, observaciones, prioridad
      ) VALUES (
          ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
  `;

  db.run(
      query,
      [
          id_ruta,
          costo_total,
          distancia_total,
          tiempo_estimado,
          numero_paradas,
          id_pedidos,
          direcciones,
          express,
          tienda_salida,
          estado,
          observaciones,
          prioridad
      ],
      function (err) {
          if (err) {
              console.error("Error al crear una nueva ruta:", err);
              res.status(500).json({ success: false, message: "Error al crear la ruta" });
          } else {
              res.json({ success: true, message: "Ruta creada con éxito", id: this.lastID });
          }
      }
  );
});
app.post('/precio-delivery', (req, res) => {
  const { precio } = req.body;

  // Verificar si ya existe un registro en la tabla para actualizar o insertar uno nuevo
  db.get('SELECT * FROM precio_delivery WHERE id_precio = 1', (err, row) => {
    if (err) {
      console.error('Error al verificar el precio del delivery:', err);
      res.status(500).json({ error: 'Error al verificar el precio del delivery' });
      return;
    }

    if (row) {
      // Si el precio ya existe, se hace una actualización
      db.run(
        'UPDATE precio_delivery SET precio = ? WHERE id_precio = 1',
        [precio],
        function (err) {
          if (err) {
            console.error('Error al actualizar el precio del delivery:', err);
            res.status(500).json({ error: 'Error al actualizar el precio del delivery' });
            return;
          }
          res.json({ success: true, message: 'Precio actualizado correctamente' });
        }
      );
    } else {
      // Si no existe un registro, se inserta uno nuevo
      db.run(
        'INSERT INTO precio_delivery (id_precio, zona, precio) VALUES (1, "General", ?)',
        [precio],
        function (err) {
          if (err) {
            console.error('Error al insertar el precio del delivery:', err);
            res.status(500).json({ error: 'Error al insertar el precio del delivery' });
            return;
          }
          res.json({ success: true, message: 'Precio insertado correctamente' });
        }
      );
    }
  });
});
app.post('/wallet/guardar_precio_delivery', (req, res) => {
  const { id_order, id_repartidor, monto_por_cobrar } = req.body;
  const fechaConsolidacion = new Date().toISOString();
  db.run(
      'INSERT INTO wallet_repartidores (id_order, id_repartidor, monto_por_cobrar, fecha_consolidacion, estado) VALUES (?, ?, ?, ?, ?)',
      [id_order, id_repartidor, monto_por_cobrar, fechaConsolidacion, 'Por Cobrar'],
      (err) => {
          if (err) {
              console.error('Error al guardar el precio del delivery:', err);
              res.status(500).json({ success: false, message: 'Error al guardar el precio del delivery' });
          } else {
              res.json({ success: true });
          }
      }
  );
});
app.post('/repartidores/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).json({ error: "Se requieren ambos campos: usuario y contraseña" });
  }

  const loginQuery = `SELECT * FROM repartidores WHERE username = ? AND password = ?`;

  db.get(loginQuery, [username, password], (err, row) => {
      if (err) {
          console.error("Error al buscar repartidor:", err.message);
          return res.status(500).json({ error: "Error interno del servidor. Por favor, intenta más tarde." });
      }

      if (!row) {
          // Credenciales inválidas
          return res.status(401).json({ error: "Credenciales inválidas" });
      }

      // Verificar si el repartidor está suspendido
      if (row.suspension_status === 1) {
          const currentDate = new Date();
          const suspensionEndDate = new Date(row.suspension_end_date);

          if (currentDate < suspensionEndDate) {
              // Suspensión activa: rechazar login
              const formattedDate = new Intl.DateTimeFormat('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(suspensionEndDate);
            
            

            

              console.log(`Repartidor ${row.id_repartidor} intentó iniciar sesión pero está suspendido hasta ${formattedDate}.`);
              return res.status(403).json({
                  error: `Esta cuenta está suspendida hasta el ${formattedDate}. Por favor, contacta con soporte.`,
              });
          } else {
              // Suspensión finalizada: actualizar estado
              const updateQuery = `UPDATE repartidores 
                                   SET suspension_status = 0, estado = 'Activo'
                                   WHERE id_repartidor = ?`;
              db.run(updateQuery, [row.id_repartidor], function (updateErr) {
                  if (updateErr) {
                      console.error("Error al actualizar estado del repartidor:", updateErr.message);
                      return res.status(500).json({ error: "Error al actualizar el estado del repartidor" });
                  }

                  // Devolver datos del repartidor actualizado
                  row.suspension_status = 0;
                  row.estado = 'Activo';
                  console.log(`Repartidor ${row.id_repartidor} reactivado automáticamente tras finalizar su suspensión.`);
                  res.json({ 
                      success: true, 
                      message: "Tu suspensión ha terminado. Ahora tu cuenta está activa.",
                      repartidor: row 
                  });
              });
          }
      } else {
          // Repartidor no suspendido: permitir login
          console.log(`Repartidor ${row.id_repartidor} inició sesión con éxito.`);
          res.json({ success: true, repartidor: row });
      }
  });
});
app.post('/repartidores', (req, res) => {
  const { nombre, telefono, email, username, password } = req.body;

  db.run(
    'INSERT INTO repartidores (nombre, telefono, email, username, password) VALUES (?, ?, ?, ?, ?)',
    [nombre, telefono, email, username, password],
    function (err) {
      if (err) {
        console.error('Error al crear repartidor:', err);
        res.status(500).json({ error: 'Error al crear repartidor' });
        return;
      }
      res.json({ success: true, id_repartidor: this.lastID });
    }
  );
});
app.post('/fill_pedidos_encola', async (req, res) => {
  try {
    // Obtener todos los registros de ventas no procesadas (venta_procesada = 0)
    const queryRegistros = 'SELECT * FROM registro_ventas WHERE venta_procesada = 0';
    const registros = await new Promise((resolve, reject) => {
      db.all(queryRegistros, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    // Verificar si hay registros pendientes
    if (!Array.isArray(registros) || registros.length === 0) {
      console.log("No hay pedidos pendientes para actualizar en PedidosEnCola");
      return res.json({ success: true, message: "No hay pedidos pendientes para actualizar en PedidosEnCola" });
    }

    // Crear un objeto para contar el número de pedidos por cada id_ubicacion
    const conteoPedidos = {};

    registros.forEach((registro) => {
      let ubicacionId;

      // Parsear el campo `metodo_entrega` para obtener el `id_ubicacion`
      try {
        const metodoEntrega = JSON.parse(registro.metodo_entrega);
        
        if (metodoEntrega.Delivery && metodoEntrega.Delivery.tiendaSalida?.id) {
          ubicacionId = metodoEntrega.Delivery.tiendaSalida.id;
        } else if (metodoEntrega.PickUp && metodoEntrega.PickUp.puntoRecogida?.id) {
          ubicacionId = metodoEntrega.PickUp.puntoRecogida.id;
        }
      } catch (error) {
        console.warn(`Error al parsear metodo_entrega para registro ID ${registro.id_order}:`, error);
      }

      if (ubicacionId) {
        conteoPedidos[ubicacionId] = (conteoPedidos[ubicacionId] || 0) + 1;
      } else {
        console.warn(`No se encontró id_ubicacion válido para el registro ID ${registro.id_order}`);
      }
    });

    // Actualizar la tabla `PedidosEnCola` con el conteo obtenido
    for (const [ubicacionId, pedidosCount] of Object.entries(conteoPedidos)) {
      const updateQuery = `
        INSERT INTO PedidosEnCola (id_ubicacion, pedidos_en_cola)
        VALUES (?, ?)
        ON CONFLICT(id_ubicacion) DO UPDATE SET
          pedidos_en_cola = ?
      `;

      await new Promise((resolve, reject) => {
        db.run(updateQuery, [ubicacionId, pedidosCount, pedidosCount], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      console.log(`PedidosEnCola actualizado para id_ubicacion ${ubicacionId} con ${pedidosCount} pedidos.`);
    }

    console.log("PedidosEnCola actualizado con éxito.");
    res.json({ success: true, message: "PedidosEnCola actualizado con éxito." });
  } catch (error) {
    console.error("Error al actualizar PedidosEnCola:", error);
    res.status(500).json({ success: false, message: "Error al actualizar PedidosEnCola" });
  }
});
app.post('/api/pizzeria-settings', (req, res) => {
  const { is_suspended, suspension_end_time } = req.body;

  console.log('Datos recibidos para actualizar:');
  console.log('is_suspended:', is_suspended);
  console.log('suspension_end_time:', suspension_end_time);

  // Usar INSERT OR REPLACE para insertar si no existe, o actualizar si ya existe
  const query = `
    INSERT OR REPLACE INTO PizzeriaSettings (id, is_suspended, suspension_end_time, updated_at)
    VALUES (1, ?, ?, CURRENT_TIMESTAMP)
  `;

  db.run(query, [is_suspended, suspension_end_time], function (err) {
    if (err) {
      console.error('Error al insertar/actualizar en la base de datos:', err.message);
      return res.status(500).json({ message: 'Error al actualizar el estado de suspensión' });
    }
    console.log('Estado de suspensión actualizado correctamente');
    res.json({ message: 'Estado de suspensión actualizado correctamente' });
  });
});
app.post('/api/horarios', (req, res) => {
  const { day, startTime, endTime, shift } = req.body;

  if (!day || !startTime || !endTime || !shift) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // Insertar el horario en la base de datos
  const query = `INSERT INTO Horarios (Day, Shift, Hora_inicio, Hora_fin) VALUES (?, ?, ?, ?)`;
  const params = [day, shift, startTime, endTime];

  db.run(query, params, function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Error al agregar el horario' });
    }

    // Enviar la respuesta con el ID generado
    res.status(201).json({ message: 'Horario agregado con éxito', Horario_id: this.lastID });
  });
});
app.post('/api/incentivos', async (req, res) => {
  const { TO_minimo, incentivo, detalle, activo } = req.body;
  const query = `INSERT INTO IncentivosTO (TO_minimo, incentivo, detalle, activo) VALUES (?, ?, ?, ?)`;
  try {
    await db.run(query, [TO_minimo, incentivo, detalle, activo]);
    res.status(201).send({ message: 'Incentivo creado con éxito' });
  } catch (error) {
    res.status(500).send({ error: 'Error al crear el incentivo' });
  }
});
app.post('/api/daily-challenge/:id/participate', (req, res) => {
  const { ig_username, post_link, user_id, daily_challenge_id } = req.body;

  // Verificar si faltan datos
  if (!ig_username || !post_link || !user_id || !daily_challenge_id) {
    return res.status(400).json({ message: 'Datos incompletos para la participación.' });
  }

  // Insertar la participación en la base de datos
  const query = `
    INSERT INTO ChallengeResponses (daily_challenge_id, username, post_link, user_id)
    VALUES (?, ?, ?, ?)
  `;
  db.run(query, [daily_challenge_id, ig_username, post_link, user_id], function (err) {
    if (err) {
      console.error('Error al registrar la participación:', err);
      return res.status(500).json({ message: 'Error al registrar la participación.' });
    }

    console.log('Participación registrada:', { daily_challenge_id, ig_username, post_link, user_id });
    return res.json({ success: true, message: 'Participación registrada con éxito.' });
  });
});
app.post('/api/info-empresa', upload.single('logo_url'), (req, res) => {
  // Extraer los datos del cuerpo de la solicitud
  const { 
    pais, 
    region, 
    codigo_postal, 
    direccion, 
    coordenadas_latitud, 
    coordenadas_longitud, 
    ciudad, 
    ciudad_latitud, 
    ciudad_longitud, 
    nombre_empresa, 
    correo_contacto, 
    telefono_contacto 
  } = req.body;
  const logo_url = req.file ? `/uploads/${req.file.filename}` : null;

  // Agregar logs para verificar los datos recibidos
  console.log('Datos recibidos del formulario:', {
    pais, region, codigo_postal, direccion, coordenadas_latitud, coordenadas_longitud, ciudad, ciudad_latitud, ciudad_longitud, nombre_empresa, correo_contacto, telefono_contacto, logo_url
  });

  // Verificar si los datos son válidos antes de guardar
  if (!pais || !region || !codigo_postal || !direccion || !nombre_empresa || !correo_contacto || !telefono_contacto) {
    return res.status(400).json({ error: 'Faltan datos para completar la operación' });
  }

  // Insertar los datos en la base de datos
  const query = `
    INSERT INTO InfoEmpresa (pais, region, codigo_postal, direccion, coordenadas_latitud, coordenadas_longitud, ciudad, ciudad_latitud, ciudad_longitud, logo_url, nombre_empresa, correo_contacto, telefono_contacto)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    pais, 
    region, 
    codigo_postal, 
    direccion, 
    coordenadas_latitud, 
    coordenadas_longitud, 
    ciudad, 
    ciudad_latitud, 
    ciudad_longitud, 
    logo_url, 
    nombre_empresa, 
    correo_contacto, 
    telefono_contacto
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al guardar la información de la empresa' });
    }
    res.json({ success: true, id: this.lastID });
  });
});
app.post('/api/reviews', (req, res) => {
  const { email, review, rating } = req.body; // Asegurarse de que el email se pase correctamente desde el frontend

  // Validaciones básicas
  if (!email || !review || !rating) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
  }

  if (review.length > 255) {
      return res.status(400).json({ success: false, message: 'El review es demasiado largo.' });
  }

  // Verificar si ya existe una reseña del usuario en la fecha actual
  const queryCheck = `
      SELECT * FROM reviews WHERE email = ? AND DATE(created_at) = DATE('now')
  `;

  db.get(queryCheck, [email], (err, row) => {
      if (err) {
          return res.status(500).json({ success: false, message: 'Error al verificar el review.' });
      }

      if (row) {
          return res.status(400).json({ success: false, message: 'Ya has enviado una reseña hoy.' });
      }

      // Si no existe reseña previa, insertar la nueva reseña
      const queryInsert = `INSERT INTO reviews (email, review, rating) VALUES (?, ?, ?)`;
      db.run(queryInsert, [email, review, rating], function (err) {
          if (err) {
              return res.status(500).json({ success: false, message: 'Error al guardar el review.' });
          }

          // Calcular el promedio de las calificaciones para actualizar nivelSatisfaccion
          const queryAvgRating = `
              SELECT AVG(rating) as nivelSatisfaccion FROM reviews WHERE email = ?
          `;
          db.get(queryAvgRating, [email], (err, row) => {
              if (err) {
                  return res.status(500).json({ success: false, message: 'Error al calcular el nivel de satisfacción.' });
              }

              const nivelSatisfaccion = row.nivelSatisfaccion || 0;

              // Actualizar el nivel de satisfacción en la tabla clientes
              const queryUpdateClient = `
                  UPDATE clientes SET nivelSatisfaccion = ? WHERE email = ?
              `;
              db.run(queryUpdateClient, [nivelSatisfaccion, email], function (err) {
                  if (err) {
                      return res.status(500).json({ success: false, message: 'Error al actualizar el nivel de satisfacción.' });
                  }

                  res.json({ success: true, message: 'Reseña registrada y nivel de satisfacción actualizado.' });
              });
          });
      });
  });
});
app.post('/ofertas', upload.single('Imagen'), (req, res) => {
  const moment = require('moment-timezone');
  const {
    // Campos que ya tenías
    Cupones_Asignados, Descripcion, Segmentos_Aplicables,
    Min_Descuento_Percent, Max_Descuento_Percent, Categoria_Cupon,
    Condiciones_Extras, Ticket_Promedio, quantity_condition, Dias_Ucompra, Numero_Compras, Id_cliente_Asig, 
    Max_Amount, Estado, Origen, Tipo_Cupon, Dias_Activos, Hora_Inicio, Hora_Fin,
    Tipo_Oferta, Precio_Cupon, Modo_Precio_Cupon, 
    
    // Campos donde REALMENTE te llega la info del DailyChallenge
    Link_DailyChallenge,
    Instrucciones_DailyChallenge
  } = req.body;

  console.log('Datos recibidos del formulario:', req.body);

  // Asignar los valores que llegan a las columnas "Instrucciones_Link" y "Additional_Instructions"
  const Instrucciones_Link = Link_DailyChallenge || null;           // se guardará el link
  const Additional_Instructions = Instrucciones_DailyChallenge || null; // se guardarán las instrucciones

  // Parse de arrays
  let parsedSegmentos = [];
  let parsedDiasActivos = [];
  try {
    parsedSegmentos = JSON.parse(Segmentos_Aplicables || '[]');
    parsedDiasActivos = JSON.parse(Dias_Activos || '[]');
  } catch (error) {
    console.error('Error parseando JSON', error);
  }

  // Manejo de Imagen
  const Imagen = req.file ? `/uploads/${req.file.filename}` : null;

  // Calculamos cupones disponibles y fecha
  const Cupones_Disponibles = Cupones_Asignados;
  const IssueDate = moment().tz('Europe/Madrid').format('YYYY-MM-DD HH:mm:ss');

  // Generar código de oferta
  const Codigo_Oferta = `OFF${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

  // Calcular precio del cupón
  function calculateCouponPrice(minDiscount, maxDiscount) {
    const basePrice = 0.5;
    const discountFactor = (parseFloat(minDiscount) + parseFloat(maxDiscount)) / 2;
    let calculatedPrice = Math.max(
      basePrice,
      (basePrice + (discountFactor / 100) * 1.5).toFixed(2)
    );
    return Math.min(calculatedPrice, 1.99);
  }

  let precioFinalCupon = null;
  let modoPrecioFinal = Modo_Precio_Cupon;
  if (Categoria_Cupon === 'gratis') {
    precioFinalCupon = 0;
    modoPrecioFinal = 'Today Free';
  } else if (Categoria_Cupon === 'pago') {
    if (Modo_Precio_Cupon === 'automatico') {
      precioFinalCupon = calculateCouponPrice(Min_Descuento_Percent, Max_Descuento_Percent);
    } else if (Modo_Precio_Cupon === 'manual') {
      precioFinalCupon = Precio_Cupon ? parseFloat(Precio_Cupon) : null;
    }
  }

  // Ajustar el INSERT para usar "Instrucciones_Link" y "Additional_Instructions"
  const sql = `
    INSERT INTO ofertas (
      Codigo_Oferta,
      Cupones_Disponibles,
      Descripcion,
      Segmentos_Aplicables,
      Imagen,
      Min_Descuento_Percent,
      Max_Descuento_Percent,
      Categoria_Cupon,
      Condiciones_Extras,
      Ticket_Promedio,
      quantity_condition,
      Dias_Ucompra,
      Numero_Compras,
      Id_cliente_Asig,
      Max_Amount,
      Instrucciones_Link,         
      Additional_Instructions,    
      Estado,
      Cupones_Asignados,
      Origen,
      Tipo_Cupon,
      Dias_Activos,
      Hora_Inicio,
      Hora_Fin,
      IssueDate,
      Tipo_Oferta,
      Precio_Cupon,
      Modo_Precio_Cupon
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Orden de parámetros
  const params = [
    Codigo_Oferta,
    Cupones_Disponibles,
    Descripcion,
    JSON.stringify(parsedSegmentos),
    Imagen,
    Min_Descuento_Percent,
    Max_Descuento_Percent,
    Categoria_Cupon,
    Condiciones_Extras,
    Ticket_Promedio || null,
    quantity_condition || null,
    Dias_Ucompra || null,
    Numero_Compras || null,
    Id_cliente_Asig  || null,
    Max_Amount || null,
    Instrucciones_Link,          
    Additional_Instructions,      
    Estado,
    Cupones_Asignados,
    Origen || 'creada',
    Tipo_Cupon,
    JSON.stringify(parsedDiasActivos),
    Hora_Inicio,
    Hora_Fin,
    IssueDate,
    Tipo_Oferta,
    precioFinalCupon,
    modoPrecioFinal
  ];

  console.log('Parámetros de inserción:', params);

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error al insertar en la base de datos:', err.message);
      return res.status(400).json({ error: err.message });
    }
    res.json({
      message: 'success',
      data: { id: this.lastID }
    });
  });
});
app.post('/DetallesLote', (req, res) => {
  const { IDing, producto, disponible, TiempoUso, PorcentajeXLote, referencia, InventarioID } = req.body;
  const sqlInsert = 'INSERT INTO DetallesLote (IDing, producto, disponible, TiempoUso, PorcentajeXLote, referencia, InventarioID) VALUES (?, ?, ?, ?, ?, ?, ?)';

  // Verificar primero si el InventarioID ya existe
  db.get('SELECT * FROM DetallesLote WHERE InventarioID = ?', [InventarioID], (err, row) => {
    if (err) {
      res.status(500).send({ error: err.message });
      return;
    }
    if (row) {
      res.status(400).send({ error: 'Un lote con ese InventarioID ya existe.' });
      return;
    }

    // Si no existe, insertamos el nuevo lote
    db.run(sqlInsert, [IDing, producto, disponible, TiempoUso, PorcentajeXLote, referencia, InventarioID], function(err) {
      if (err) {
        res.status(500).send({ error: err.message, stack: err.stack });
        return;
      }
      res.status(201).json({ message: 'Nuevo lote creado.', id: this.lastID });
    });
  });
});
app.post('/inventario', (req, res) => {
  const { categoria, subcategoria, producto, disponible, unidadMedida, fechaCaducidad, referencia, estadoForzado = 0 } = req.body;
  const IDI = generarIDI(producto); 
  const ultimaModificacion = new Date().toISOString();

  const sql = `INSERT INTO inventario (IDI, categoria, subcategoria, producto, disponible,  unidadMedida, fechaCaducidad, referencia, ultimaModificacion, estadoForzado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [IDI, categoria, subcategoria, producto, disponible,  unidadMedida, fechaCaducidad, referencia, ultimaModificacion, estadoForzado ? 1 : 0];

  db.run(sql, params, function (err) {
      if (err) {
          res.status(400).json({ "error": err.message });
          return;
      }
      res.json({
          "message": "success",
          "data": {
              ...req.body,
              IDI, 
              IDR: this.lastID,
              ultimaModificacion,
              estadoForzado
          }
      });
  });
});
app.post('/menu_pizzas', upload.single('imagen'), (req, res) => {
  console.log('Cuerpo de la solicitud:', req.body);
  if (!req.file) {
    console.error('No se ha recibido el archivo de imagen.');
    return res.status(400).json({ error: 'No se ha recibido el archivo de imagen.' });
  }
  console.log('Archivo:', req.file);

  try {

    console.log('selectSize (raw):', req.body.selectSize);
    console.log('priceBySize (raw):', req.body.priceBySize);
    console.log('ingredientes (raw):', req.body.ingredientes);
    
  
    const selectSize = req.body.selectSize && isJSON(req.body.selectSize) ? JSON.parse(req.body.selectSize) : [];
    const priceBySize = req.body.priceBySize && isJSON(req.body.priceBySize) ? JSON.parse(req.body.priceBySize) : {};
    const ingredientes = [];
    if (req.body.ingredientes) {
      for (const [key, value] of Object.entries(req.body.ingredientes)) {
        try {
          ingredientes.push(JSON.parse(value));
        } catch (e) {
          return res.status(400).json({ error: `Formato inválido para el ingrediente en la posición ${key}: ${value}` });
        }
      }
    }
    const { nombre, categoria, metodoCoccion } = req.body;
    const archivo = req.file.path;

    // Validacioness
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido y debe ser una cadena no vacía.' });
    }
    if (!categoria) {
      return res.status(400).json({ error: 'La categoría es requerida.' });
    }
    if (!Array.isArray(selectSize)) {
      return res.status(400).json({ error: "Tamaños seleccionados debe ser un array." });
    }
    if (typeof priceBySize !== 'object' || priceBySize == null) {
      return res.status(400).json({ error: "Precios por tamaño debe ser un objeto." });
    }
    if (!Array.isArray(ingredientes)) {
      return res.status(400).json({ error: "Ingredientes debe ser un array." });
    }
    if (typeof metodoCoccion !== 'string') {
      return res.status(400).json({ error: "Método de cocción es requerido y debe ser una cadena." });
    }
    const ingredientesIds = ingredientes.map(ing => ing.IDI);
    // Preparar consulta SQL
    const sql = 'INSERT INTO menu_pizzas (nombre, categoria, selectSize, priceBySize, ingredientes, metodoCoccion, imagen, PIDI) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const params = [
      nombre.trim(),
      categoria,
      JSON.stringify(selectSize),
      JSON.stringify(priceBySize),
      JSON.stringify(ingredientes),
      metodoCoccion,
      archivo,
      JSON.stringify(ingredientesIds)
    ];

    // Ejecutar consulta SQL
    db.run(sql, params, function (err) {
      if (err) {
        console.error('Error al insertar en la base de datos:', err);
        return res.status(500).json({ error: 'Error interno del servidor al insertar pizza.' });
      }
      res.json({
        message: 'success',
        data: {
          id: this.lastID,
          nombre,
          categoria,
          selectSize,
          priceBySize,
          ingredientes,
          metodoCoccion,
          imagen: archivo
        }
      });
    });
  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(400).json({ error: 'Error al procesar la solicitud.' });
  }
  function isJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }
});
app.post('/PartnerData', upload.single('imagen'), (req, res) => {
  const { categoria, subcategoria, producto, precio } = req.body;
  const imagen = req.file ? req.file.path : '';
  const sql = `INSERT INTO PartnerData (categoria, subcategoria, producto, precio, imagen) VALUES (?, ?, ?, ?, ?)`;
  const params = [categoria, subcategoria, producto, precio, imagen];
  
  // Verificar que los campos requeridos estén presentes
  if (!categoria || !producto || precio === undefined) {
    res.status(400).json({ "error": "Faltan campos obligatorios" });
    return;
  }

  // Insertar en la base de datos
  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": req.body,
      "id": this.lastID
    });
  });
});
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Consulta que incluye el campo suspension_status para verificar si el usuario está suspendido
  const queryLogin = `
    SELECT id_cliente, email, phone, name, address_1, address_2, segmento, isbday, numeroDeCompras, Dias_Ucompra,
           Max_Amount, ticketPromedio, ticketObjetivo, MontoTotalCompras, id_pizzaMasComprada, precio_pizzaMasComprada, 
           size_pizzaMasComprada, ofertaMasUsada, diaMasComprado, diaDelMesMasComprado, horaMasComprada, nivelSatisfaccion,
           suspension_status, suspension_end_date
    FROM clientes 
    WHERE email = ? AND password = ?`;  // Verificación de email y password correctos

  db.get(queryLogin, [email, password], (err, row) => {
    if (err) {
      console.error('Error al consultar la base de datos:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (!row) {
      // Si no se encuentra al cliente, devolver un error
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificar si el cliente está suspendido
    if (row.suspension_status === '1') {
      return res.status(403).json({ error: 'Tu cuenta está suspendida temporalmente hasta ' + row.suspension_end_date });
    }

    // Devolver todos los datos obtenidos de la tabla de clientes si el cliente no está suspendido
    return res.json({
      id_cliente: row.id_cliente,
      email: row.email,
      phone: row.phone,
      name: row.name,
      address_1: row.address_1,
      address_2: row.address_2,
      segmento: row.segmento,
      isbday: row.isbday,
      numeroDeCompras: row.numeroDeCompras,
      Dias_Ucompra: row.Dias_Ucompra,
      Max_Amount: row.Max_Amount,
      ticketPromedio: row.ticketPromedio,
      ticketObjetivo: row.ticketObjetivo,
      MontoTotalCompras: row.MontoTotalCompras,
      id_pizzaMasComprada: row.id_pizzaMasComprada,
      precio_pizzaMasComprada: row.precio_pizzaMasComprada,
      size_pizzaMasComprada: row.size_pizzaMasComprada,
      ofertaMasUsada: row.ofertaMasUsada,
      diaMasComprado: row.diaMasComprado,
      diaDelMesMasComprado: row.diaDelMesMasComprado,
      horaMasComprada: row.horaMasComprada,
      nivelSatisfaccion: row.nivelSatisfaccion
    });
  });
});
app.post('/registro_ventas', (req, res) => {
  const venta = req.body;
  console.log('Datos recibidos en el servidor:', venta);

  let responseSent = false; // Bandera para evitar múltiples respuestas

  const sendResponse = (status, message) => {
      if (!responseSent) {
          res.status(status).json(message);
          responseSent = true;
      }
  };

  db.serialize(() => {
      db.run('BEGIN TRANSACTION;', (beginErr) => {
          if (beginErr) {
              sendResponse(500, { error: beginErr.message });
              return;
          }

          const {
              id_order,
              fecha,
              hora,
              id_cliente,
              metodo_pago,
              total_productos,
              total_con_descuentos,
              total_descuentos,
              productos,
              cupones,
              incentivos,
              metodo_entrega,
              observaciones,
              email,
          } = venta;

          const parsedMetodoEntrega = JSON.parse(metodo_entrega || '{}');
          const estado_entrega = 'Pendiente';
          const id_repartidor = parsedMetodoEntrega.PickUp ? 0 : null;

          const insertVentaSql = `
              INSERT INTO registro_ventas (
                  id_order,
                  fecha,
                  hora,
                  id_cliente,
                  metodo_pago,
                  total_productos,
                  total_con_descuentos,
                  total_descuentos,
                  cupones,
                  metodo_entrega,
                  productos,
                  incentivos,
                  observaciones,
                  estado_entrega,
                  id_repartidor
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `;

          const productosJson = JSON.stringify(productos);
          const cuponesJson = JSON.stringify(cupones);
          const incentivosJson = JSON.stringify(incentivos);

          db.run(
              insertVentaSql,
              [
                  id_order,
                  fecha,
                  hora,
                  id_cliente,
                  metodo_pago,
                  total_productos,
                  total_con_descuentos,
                  total_descuentos,
                  cuponesJson,
                  metodo_entrega,
                  productosJson,
                  incentivosJson,
                  observaciones,
                  estado_entrega,
                  id_repartidor,
              ],
              function (ventaErr) {
                  if (ventaErr) {
                      db.run('ROLLBACK;', () => sendResponse(500, { error: ventaErr.message }));
                      return;
                  }

                  const id_venta = this.lastID;
                  console.log(`Venta registrada con éxito. ID de la venta: ${id_venta}`);

                  // Llamar a actualizarIndicadoresCliente
                  actualizarIndicadoresCliente(id_cliente, fecha, (updateErr) => {
                      if (updateErr) {
                          console.error('Error al actualizar indicadores del cliente:', updateErr.message);
                          db.run('ROLLBACK;', () => sendResponse(500, { error: updateErr.message }));
                          return;
                      }

                      console.log(`Indicadores del cliente ${id_cliente} actualizados con éxito.`);

                      // Consultar la información de la empresa
                      db.get('SELECT * FROM InfoEmpresa WHERE id = ?', [1], (infoErr, infoEmpresa) => {
                          if (infoErr) {
                              console.error('Error al obtener la información de la empresa:', infoErr);
                              db.run('ROLLBACK;', () => sendResponse(500, { error: infoErr.message }));
                              return;
                          }

                          console.log('Información de la empresa obtenida:', infoEmpresa);

                          // Notificar a repartidores si es Delivery
                          if (!parsedMetodoEntrega.PickUp && parsedMetodoEntrega.Delivery) {
                              db.all('SELECT email FROM repartidores', [], (repErr, repartidores) => {
                                  if (repErr) {
                                      console.error('Error al obtener los correos de los repartidores:', repErr);
                                  } else if (repartidores.length > 0) {
                                      const transporter = nodemailer.createTransport({
                                          service: 'gmail',
                                          auth: {
                                              user: 'mycrushpizzaspain@gmail.com',
                                              pass: 'pfpjczrsksoytvhv', // Contraseña de la aplicación
                                          },
                                      });

                                      const mailPromises = repartidores.map((repartidor) => {
                                          const mailOptions = {
                                              from: 'mycrushpizzaspain@gmail.com',
                                              to: repartidor.email,
                                              subject: 'Nuevo Pedido de Delivery - MyPizzaCrush',
                                              text: `
                                                  ¡Hola!

                                                  Se ha registrado un nuevo pedido de Delivery.

                                                  Detalles del pedido:
                                                  - Orden ID: ${id_order}
                                                  - Dirección de entrega: ${parsedMetodoEntrega.Delivery?.address || 'No especificada'}
                                                  - Cliente ID: ${id_cliente}
                                                  - Hora del pedido: ${hora}
                                                  - Total: €${total_con_descuentos}

                                                  Por favor, revisa tu panel para más detalles.

                                                  ¡Gracias!
                                                  MyPizzaCrush Team
                                              `,
                                          };

                                          return transporter.sendMail(mailOptions);
                                      });

                                      Promise.all(mailPromises)
                                          .then((results) => {
                                              console.log('Correos enviados con éxito a los repartidores:', results);
                                          })
                                          .catch((err) => {
                                              console.error('Error al enviar correos a los repartidores:', err);
                                          });
                                  } else {
                                      console.log('No se encontraron repartidores para notificar.');
                                  }
                              });
                          }

                          // Generar factura en PDF y enviar al cliente
                          const doc = new PDFDocument({ margin: 30 });
                          const pdfFilePath = path.join(__dirname, `factura_${id_order}.pdf`);
                          const writeStream = fs.createWriteStream(pdfFilePath);
                          doc.pipe(writeStream);

                          doc.fontSize(14).font('Courier-Bold').text('MyPizzaCrush - Confirmación de Pedido', { align: 'center' });
                          doc.moveDown(0.5);
                          doc.fontSize(10).font('Courier').text(`Registro Fiscal: ${infoEmpresa?.registro_fiscal || 'No disponible'}`);
                          doc.text(`Dirección: ${infoEmpresa?.direccion || 'No disponible'}`);
                          doc.text(`Teléfono: ${infoEmpresa?.telefono_contacto || 'No disponible'}`);
                          doc.text(`Correo: ${infoEmpresa?.correo_contacto || 'No disponible'}`);
                          doc.moveDown(1);
                          doc.fontSize(12).text(`Orden: ${id_order}`);
                          doc.text(`Fecha: ${fecha}`);
                          doc.text(`Hora: ${hora}`);
                          doc.text(`Cliente ID: ${id_cliente}`);
                          doc.text(`Método de Pago: ${metodo_pago}`);
                          doc.end();

                          writeStream.on('finish', () => {
                              const transporter = nodemailer.createTransport({
                                  service: 'gmail',
                                  auth: {
                                      user: 'mycrushpizzaspain@gmail.com',
                                      pass: 'pfpjczrsksoytvhv',
                                  },
                              });

                              const mailOptions = {
                                  from: 'mycrushpizzaspain@gmail.com',
                                  to: email,
                                  subject: 'Confirmación de Pedido - MyPizzaCrush',
                                  text: 'Adjuntamos tu factura digital en formato PDF.',
                                  attachments: [
                                      {
                                          filename: `factura_${id_order}.pdf`,
                                          path: pdfFilePath,
                                      },
                                  ],
                              };

                              transporter.sendMail(mailOptions, (err, info) => {
                                  if (err) {
                                      console.error('Error al enviar el correo:', err);
                                  } else {
                                      console.log('Correo enviado con éxito al cliente:', info.response);
                                  }
                              });

                              db.run('COMMIT;', (commitErr) => {
                                  if (commitErr) {
                                      sendResponse(500, { error: commitErr.message });
                                      return;
                                  }

                                  sendResponse(200, {
                                      success: true,
                                      message: 'Venta registrada y cliente actualizado con éxito',
                                      id_venta,
                                  });
                              });
                          });
                      });
                  });
              }
          );
      });
  });
});
app.post('/clientes', (req, res) => {
  const { email, password, phone, name, address_1, address_2, bday } = req.body;

  // Validar campos obligatorios
  if (!email || !password || !name || !phone) {
    res.status(400).json({ error: 'Faltan datos obligatorios: email, password, name o phone.' });
    return;
  }

  // Obtener la secuencia diaria de clientes
  const secuenciaSql = `SELECT COUNT(*) as count FROM clientes WHERE DATE(created_at) = DATE('now')`;

  db.get(secuenciaSql, [], (err, row) => {
    if (err) {
      console.error('Error al obtener la secuencia:', err);
      res.status(500).json({ error: 'Error interno al generar la secuencia.' });
      return;
    }

    const secuencia = row.count + 1;
    const id_cliente = `CT${new Date().toISOString().split('T')[0].replace(/-/g, '')}${String(secuencia).padStart(3, '0')}`;

    // Insertar el cliente con segmento inicial 1 (POTENCIAL)
    const insertClienteSql = `
      INSERT INTO clientes (id_cliente, email, password, phone, name, address_1, address_2, bday, segmento, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'));
    `;

    db.run(
      insertClienteSql,
      [id_cliente, email, password, phone, name, address_1, address_2, bday, 1], // Segmento inicial 1
      function (err) {
        if (err) {
          console.error('Error al agregar cliente:', err);
          res.status(500).json({ error: 'Error interno al registrar el cliente.' });
          return;
        }

        res.json({
          message: 'Cliente agregado con éxito',
          id_cliente: id_cliente,
          segmento: 1, // Confirmación explícita del segmento
        });
      }
    );
  });
});
app.post('/agregar_cliente', (req, res) => {
  const { email, password, bday, mapsUrl } = req.body;

  console.log('Datos recibidos en el servidor:', { email, password, bday, mapsUrl });

  // Verificar si el email ya está registrado
  const emailCheckSql = `SELECT email FROM clientes WHERE email = ?`;
  db.get(emailCheckSql, [email], (err, row) => {
    if (err) {
      console.error('Error al verificar email:', err.message);
      res.status(500).json({ error: 'Error checking email in the database' });
      return;
    }

    if (row) {
      res.status(400).json({ error: 'This email is already registered.' });
      return;
    }

    // Continuar con el registro del cliente si el email no está registrado
    const secuenciaSql = `SELECT COUNT(*) as count FROM clientes WHERE DATE(created_at) = DATE('now')`;
    db.get(secuenciaSql, [], (err, row) => {
      if (err) {
        console.error('Error al obtener la secuencia:', err.message);
        res.status(500).json({ error: 'Error generating sequence' });
        return;
      }

      const secuencia = row.count + 1;
      const id_cliente = `CLNT${new Date().toISOString().split('T')[0].replace(/-/g, '')}${String(secuencia).padStart(3, '0')}`;

      console.log('Generado id_cliente:', id_cliente);

      const insertClienteSql = `
        INSERT INTO clientes (id_cliente, email, password, bday, address_1)
        VALUES (?, ?, ?, ?, ?);
      `;

      db.run(insertClienteSql, [id_cliente, email, password, bday, mapsUrl], function (err) {
        if (err) {
          console.error('Error al agregar cliente:', err.message);
          res.status(500).json({ error: 'Error adding client to the database' });
          return;
        }

        console.log('Cliente agregado con éxito, ID:', id_cliente);

        // Configurar nodemailer para enviar el correo de bienvenida
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'mycrushpizzaspain@gmail.com', // Tu correo electrónico
            pass: 'pfpjczrsksoytvhv', // Contraseña de aplicación generada
          },
        });

        const mailOptions = {
          from: 'mycrushpizzaspain@gmail.com',
          to: email,
          subject: 'Welcome to MyPizzaCrush!',
          text: `
            ¡Hola!

            Gracias por registrarte en MyPizzaCrush. Aquí están tus credenciales:

            - Email: ${email}
            - id_cliente: ${id_cliente}
            

            Te recomendamos guardar este correo para futuras referencias.

            ¡Gracias por unirte a nuestra comunidad!

            MyPizzaCrush Team
          `,
        };

        transporter.sendMail(mailOptions, (mailErr, info) => {
          if (mailErr) {
            console.error('Error al enviar el correo de bienvenida:', mailErr.message);
          } else {
            console.log('Correo de bienvenida enviado con éxito:', info.response);
          }
        });

        res.json({ message: 'Cliente agregado con éxito y correo de bienvenida enviado', id_cliente });
      });
    });
  });
});
app.post('/historial_cliente/actualizar', (req, res) => {
  const {
    id_cliente,
    numeroDeCompras,
    MontoTotalCompras,
    ticketPromedio,
    id_pizzaMasComprada,
    size_pizzaMasComprada,
    precio_pizzaMasComprada,
    diaMasComprado,
    diaDelMesMasComprado,
    horaMasComprada
  } = req.body;

  const updateHistorialSql = `
    INSERT INTO HistorialCliente (id_cliente, fecha_actualizacion, numeroDeCompras, MontoTotalCompras, ticketPromedio, id_pizzaMasComprada, size_pizzaMasComprada, precio_pizzaMasComprada, diaMasComprado, diaDelMesMasComprado, horaMasComprada)
    VALUES (?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id_cliente) DO UPDATE SET 
      fecha_actualizacion = DATE('now'),
      numeroDeCompras = ?,
      MontoTotalCompras = ?,
      ticketPromedio = ?,
      id_pizzaMasComprada = ?,
      size_pizzaMasComprada = ?,
      precio_pizzaMasComprada = ?,
      diaMasComprado = ?,
      diaDelMesMasComprado = ?,
      horaMasComprada = ?;
  `;

  db.run(updateHistorialSql, [
    id_cliente,
    numeroDeCompras,
    MontoTotalCompras,
    ticketPromedio,
    id_pizzaMasComprada,
    size_pizzaMasComprada,
    precio_pizzaMasComprada,
    diaMasComprado,
    diaDelMesMasComprado,
    horaMasComprada,

    // Valores para el conflicto (en caso de que ya exista un historial)
    numeroDeCompras,
    MontoTotalCompras,
    ticketPromedio,
    id_pizzaMasComprada,
    size_pizzaMasComprada,
    precio_pizzaMasComprada,
    diaMasComprado,
    diaDelMesMasComprado,
    horaMasComprada
  ], function(err) {
    if (err) {
      console.error('Error al actualizar el historial del cliente:', err);
      res.status(500).json({ error: 'Error al actualizar el historial.' });
      return;
    }

    res.json({ message: 'Historial actualizado correctamente.' });
  });
});
app.post('/limites', async (req, res) => {
  const { IDI, TLimite } = req.body;
  console.log(`Recibido para crear límite: ${IDI}, con TLimite: ${TLimite}`);

  // Asegúrate de que TLimite es un número y no es null o undefined
  if (typeof TLimite !== 'number' || TLimite === null) {
    return res.status(400).send('TLimite debe ser un número válido.');
  }

  // Verificar primero si el IDI ya existe en la tabla SetLimite
  db.get('SELECT * FROM SetLimite WHERE IDI = ?', [IDI], async (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (row) {
      // Si el IDI ya existe, no se crea un nuevo registro
      res.status(409).send('Un límite ya existe para este IDI.');
    } else {
      // Si el IDI no existe, crea el nuevo registro
      try {
        const sql = 'INSERT INTO SetLimite (IDI, TLimite) VALUES (?, ?)';
        await db.run(sql, [IDI, TLimite]);
        res.status(201).send('Límite agregado con éxito');
      } catch (err) {
        console.error('Error al insertar el límite:', err);
        res.status(500).send(err.message);
      }
    }
  });
});

// the patch zone //
app.patch('/inventario/descontar', async (req, res) => {
  try {
      console.log("🔄 Recibida solicitud en /inventario/descontar con datos:", req.body);  

      const { id_venta } = req.body;

      if (!id_venta) {
          console.error("❌ Error: No se recibió un id_venta.");
          return res.status(400).json({ error: "Se requiere un id_venta para descontar ingredientes." });
      }

      // 1️⃣ Obtener los productos de la venta específica desde `registro_ventas`
      const venta = await new Promise((resolve, reject) => {
          db.get("SELECT productos FROM registro_ventas WHERE id_venta = ?", [id_venta], (err, row) => { 
              if (err) reject(err);
              else resolve(row);
          });
      });

      if (!venta || !venta.productos) {
          console.error(`❌ Venta con id_venta ${id_venta} no encontrada o sin productos.`);
          return res.status(404).json({ error: "Venta no encontrada o sin productos." });
      }

      console.log("✅ Productos encontrados:", venta.productos);

      const productos = JSON.parse(venta.productos);  // Convertir string JSON a objeto

      for (const producto of productos) {
          console.log(`🔍 Procesando pizza ID: ${producto.id_pizza}`);

          let ingredientes = [];

          // ✅ Si es una pizza personalizada (ID 101 o 103), usar `extraIngredients` directamente
          if (producto.id_pizza === 101 || producto.id_pizza === 103) {
              console.log(`🛑 Bypass activado para pizza ID ${producto.id_pizza}. Usando ingredientes extra.`);
              ingredientes = producto.extraIngredients || [];
          } else {
              // 2️⃣ Obtener ingredientes de la pizza desde `menu_pizzas`
              const pizza = await new Promise((resolve, reject) => {
                  db.get("SELECT ingredientes FROM menu_pizzas WHERE id = ?", [producto.id_pizza], (err, row) => {
                      if (err) reject(err);
                      else resolve(row);
                  });
              });

              if (!pizza) {
                  console.error(`❌ No se encontraron ingredientes para la pizza ID: ${producto.id_pizza}`);
                  continue;
              }

              ingredientes = JSON.parse(pizza.ingredientes);
          }

          console.log(`✅ Ingredientes obtenidos para pizza ID: ${producto.id_pizza}`, ingredientes);

          // 3️⃣ Validar disponibilidad en inventario antes de descontar
          ingredientes = await Promise.all(ingredientes.map(async (ing) => {
              const lotes = await new Promise((resolve, reject) => {
                  db.all(
                      "SELECT IDR, disponible FROM inventario WHERE IDI = ? ORDER BY fechaCaducidad ASC, IDR ASC",
                      [ing.IDI],
                      (err, rows) => {
                          if (err) reject(err);
                          else resolve(rows);
                      }
                  );
              });

              const cantidadDisponible = lotes.reduce((acc, lote) => acc + lote.disponible, 0);
              const cantidadNecesaria = ((ing.cantBySize?.[producto.size] || ing.cantBySize) || 0) * producto.cantidad;

              if (cantidadDisponible < cantidadNecesaria) {
                  console.warn(`⚠️ No hay suficiente stock para ${ing.nombre} (IDI: ${ing.IDI}). Necesita ${cantidadNecesaria}, disponible ${cantidadDisponible}. Eliminando del procesamiento.`);
                  return null;
              }
              return ing;
          }));

          ingredientes = ingredientes.filter(Boolean); // Eliminar ingredientes nulos

          for (const ing of ingredientes) {
            console.log(`🔄 Procesando ingrediente: ${ing.nombre} (IDI: ${ing.IDI})`);
          
            // Buscar lotes disponibles
            const lotes = await new Promise((resolve, reject) => {
              db.all(
                "SELECT IDR, disponible FROM inventario WHERE IDI = ? ORDER BY fechaCaducidad ASC, IDR ASC",
                [ing.IDI],
                (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
                }
              );
            });
          
            let cantidadRestante = ((ing.cantBySize?.[producto.size] || ing.cantBySize) || 0) * producto.cantidad;
          
            for (let lote of lotes) {
              if (cantidadRestante <= 0) break;
          
              let cantidadADescontar = Math.min(cantidadRestante, lote.disponible);
              cantidadRestante -= cantidadADescontar;
          
              console.log(`➖ Descontando ${cantidadADescontar} de lote IDR ${lote.IDR}`);
          
              await new Promise((resolve, reject) => {
                db.run(
                  "UPDATE inventario SET disponible = ? WHERE IDR = ?",
                  [lote.disponible - cantidadADescontar, lote.IDR],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
            }
          
            if (cantidadRestante > 0) {
              console.warn(`⚠️ No se pudo cubrir completamente el ingrediente ${ing.nombre} (${ing.IDI}). Faltan ${cantidadRestante} unidades.`);
            }
          }          
      }

      res.json({ message: "✅ Ingredientes descontados correctamente." });
  } catch (error) {
      console.error("❌ Error interno al descontar ingredientes:", error);
      res.status(500).json({ error: "Error interno al descontar ingredientes." });
  }
});
app.patch('/api/offers/:id/reset-coupons', async (req, res) => {
  const offerId = req.params.id;
  const { Cupones_Disponibles } = req.body;

  console.log('PATCH /reset-coupons recibido:', { offerId, Cupones_Disponibles });

  try {
    await db.run(
      `UPDATE ofertas SET Cupones_Disponibles = ? WHERE Oferta_Id = ?`,
      [Cupones_Disponibles, offerId]
    );

    res.status(200).json({ message: 'Cupones reseteados correctamente' });
  } catch (error) {
    console.error('Error en /reset-coupons:', error);
    res.status(500).json({ error: 'Error al resetear los cupones' });
  }
});
app.patch('/repartidores/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
      const repartidor = await db.get('SELECT * FROM repartidores WHERE id_repartidor = ?', [id]);

      if (!repartidor) {
          return res.status(404).json({ success: false, message: 'Repartidor no encontrado' });
      }

      // Verificar si el repartidor está suspendido
      if (repartidor.suspension_status) {
          // Asegurar que el estado quede "Inactivo"
          await db.run('UPDATE repartidores SET estado = ? WHERE id_repartidor = ?', ['Inactivo', id]);
          return res.status(400).json({ 
              success: false, 
              message: `El repartidor está suspendido hasta ${moment(repartidor.suspension_end_date).format('YYYY-MM-DD HH:mm')}` 
          });
      }

      // Actualizar estado si no está suspendido
      await db.run('UPDATE repartidores SET estado = ? WHERE id_repartidor = ?', [estado, id]);
      res.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (error) {
      console.error('Error al cambiar el estado del repartidor:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});
app.patch('/repartidores/:id', (req, res) => {
  const { nombre, telefono, email, username, password, suspension_status, suspension_duration } = req.body; // Añadimos nuevos campos
  const id = req.params.id;

  // Calcular la fecha de fin de suspensión si se proporciona una duración
  let suspension_end_date = null;
  if (suspension_status && suspension_duration) {
    if (suspension_duration !== -1) { // No es permanente
      const currentDate = new Date();
      const localOffset = currentDate.getTimezoneOffset() * 60000; // Offset en milisegundos
      suspension_end_date = new Date(currentDate.getTime() + suspension_duration * 60 * 1000 - localOffset); // Ajuste de huso horario
      suspension_end_date = suspension_end_date.toISOString().slice(0, 19).replace('T', ' '); // Formato para SQLite
    }
  }

  const query = `
    UPDATE repartidores
    SET nombre = COALESCE(?, nombre),
        telefono = COALESCE(?, telefono),
        email = COALESCE(?, email),
        username = COALESCE(?, username),
        password = COALESCE(?, password),
        suspension_status = COALESCE(?, suspension_status),
        suspension_end_date = CASE
          WHEN ? IS NOT NULL THEN ?
          ELSE suspension_end_date
        END
    WHERE id_repartidor = ?;
  `;

  db.run(
    query,
    [
      nombre, telefono, email, username, password,
      suspension_status, suspension_end_date, suspension_end_date, id
    ],
    function (err) {
      if (err) {
        console.error('Error al actualizar repartidor:', err.message);
        res.status(500).json({ error: 'Error al actualizar repartidor.' });
        return;
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});
app.patch('/api/update-pedidos-en-cola', (req, res) => {
  console.log('Iniciando actualización de PedidosEnCola...');

  const queryCount = `
    SELECT 
      COALESCE(
        json_extract(metodo_entrega, '$.Delivery.tiendaSalida.id'),
        json_extract(metodo_entrega, '$.PickUp.puntoRecogida.id')
      ) AS id_ubicacion,
      COUNT(*) AS pedidos_en_cola
    FROM registro_ventas
    WHERE venta_procesada = 0
    GROUP BY id_ubicacion
  `;

  db.all(queryCount, [], (err, rows) => {
    if (err) {
      console.error('Error al contar pedidos en cola:', err);
      return res.status(500).json({ error: 'Error al contar pedidos en cola' });
    }

    console.log('Resultado de la consulta SQL (pedidos en cola):', rows);

    const updatePromises = [];

    if (rows.length > 0) {
      // Actualizar ubicaciones con pedidos pendientes
      rows.forEach(row => {
        const updateQuery = `
          INSERT INTO PedidosEnCola (id_ubicacion, pedidos_en_cola)
          VALUES (?, ?)
          ON CONFLICT(id_ubicacion) DO UPDATE SET
            pedidos_en_cola = excluded.pedidos_en_cola;
        `;
        updatePromises.push(
          new Promise((resolve, reject) => {
            db.run(updateQuery, [row.id_ubicacion, row.pedidos_en_cola], function (updateErr) {
              if (updateErr) reject(updateErr);
              else resolve();
            });
          })
        );
      });
    }

    // Manejar ubicaciones sin pedidos pendientes (actualizar a 0)
    const allUbicacionesQuery = `SELECT id_ubicacion FROM PedidosEnCola`;
    db.all(allUbicacionesQuery, [], (allErr, ubicaciones) => {
      if (allErr) {
        console.error('Error al obtener todas las ubicaciones:', allErr);
        return res.status(500).json({ error: 'Error al obtener todas las ubicaciones' });
      }

      // Crear un Set con ubicaciones con pedidos
      const ubicacionesConPedidos = new Set(rows.map(row => row.id_ubicacion));

      // Actualizar las ubicaciones existentes a 0 si no tienen pedidos
      ubicaciones.forEach(ubicacion => {
        if (!ubicacionesConPedidos.has(ubicacion.id_ubicacion)) {
          const resetQuery = `
            UPDATE PedidosEnCola
            SET pedidos_en_cola = 0
            WHERE id_ubicacion = ?;
          `;
          updatePromises.push(
            new Promise((resolve, reject) => {
              db.run(resetQuery, [ubicacion.id_ubicacion], function (resetErr) {
                if (resetErr) reject(resetErr);
                else resolve();
              });
            })
          );
        }
      });

      // Ejecutar todas las actualizaciones
      Promise.all(updatePromises)
        .then(() => {
          console.log('PedidosEnCola actualizados con éxito.');
          res.status(200).json({ success: true, message: 'PedidosEnCola actualizados correctamente.' });
        })
        .catch((updateErr) => {
          console.error('Error al actualizar PedidosEnCola:', updateErr);
          res.status(500).json({ error: 'Error al actualizar PedidosEnCola.' });
        });
    });
  });
});
app.patch("/registro_ventas/finalizar_ruta/:enRuta", async (req, res) => {
  const { enRuta } = req.params;

  try {
      await db.run(
          `UPDATE registro_ventas SET estado_entrega = 'Entregado' WHERE enRuta = ?`,
          [enRuta]
      );

      res.json({ success: true, message: "Pedidos de la ruta actualizados a 'Entregado'." });
  } catch (error) {
      console.error("Error al finalizar los pedidos de la ruta:", error);
      res.status(500).json({ success: false, message: "Error al actualizar los pedidos." });
  }
});
app.patch('/registro_ventas/finalizar_pedido/:pedidoId', (req, res) => {
  const { pedidoId } = req.params;
  const { estado_entrega } = req.body;

  console.log('PATCH recibido:');
  console.log('Pedido ID:', pedidoId);
  console.log('Estado Entrega:', estado_entrega);

  if (estado_entrega !== 'Entregado') {
      console.error('Estado no válido:', estado_entrega);
      return res.status(400).json({ success: false, message: 'Estado no válido para finalizar el pedido.' });
  }

  const query = `UPDATE registro_ventas SET estado_entrega = ? WHERE id_order = ?`;
  db.run(query, [estado_entrega, pedidoId], function (err) {
      if (err) {
          console.error('Error al finalizar el pedido:', err.message);
          return res.status(500).json({ success: false, message: 'Error al finalizar el pedido.' });
      }

      console.log('Filas actualizadas:', this.changes);
      if (this.changes > 0) {
          res.json({ success: true, message: 'Pedido finalizado con éxito.' });
      } else {
          console.warn('Pedido no encontrado con ID:', pedidoId);
          res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
      }
  });
});
app.patch('/registro_ventas/tomar_ruta/:enRuta', (req, res) => {
  const { enRuta } = req.params;
  const { id_repartidor } = req.body;

  const query = `
      UPDATE registro_ventas
      SET estado_entrega = 'Asignado', id_repartidor = ?
      WHERE enRuta = ?
  `;

  db.run(query, [id_repartidor, enRuta], function (err) {
      if (err) {
          console.error("Error al tomar la ruta:", err.message);
          return res.status(500).json({ success: false, message: "Error al tomar la ruta" });
      }

      res.json({ success: true });
  });
});
app.patch("/rutas/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
  const values = [...Object.values(updates), id];

  const query = `
      UPDATE rutas SET ${setClause} WHERE id_ruta = ?
  `;

  db.run(query, values, function (err) {
      if (err) {
          console.error(`Error al actualizar la ruta con ID ${id}:`, err);
          res.status(500).json({ success: false, message: "Error al actualizar la ruta" });
      } else if (this.changes > 0) {
          res.json({ success: true, message: "Ruta actualizada con éxito" });
      } else {
          res.status(404).json({ success: false, message: "Ruta no encontrada" });
      }
  });
});
app.patch('/precio-delivery', (req, res) => {
  const { precio } = req.body;

  db.run(
    'UPDATE precio_delivery SET precio = ? WHERE id = 1', // Asumiendo que siempre queremos actualizar el precio en el registro con ID 1
    [precio],
    function (err) {
      if (err) {
        console.error('Error al actualizar el precio del delivery:', err);
        res.status(500).json({ error: 'Error al actualizar el precio del delivery' });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'No se encontró el registro para actualizar' });
      } else {
        res.json({ success: true, message: 'Precio actualizado correctamente' });
      }
    }
  );
});
app.patch('/registro_ventas', async (req, res) => {
  const { orders } = req.body;

  try {
    for (const order of orders) {
      const { id_order, enRuta } = order;
      await db.run(
        'UPDATE registro_ventas SET enRuta = ? WHERE id_order = ?',
        [enRuta, id_order]
      );
    }

    res.status(200).json({ message: 'Estado enRuta actualizado con éxito.' });
  } catch (error) {
    console.error("Error al actualizar enRuta:", error);
    res.status(500).json({ error: error.message });
  }
});
app.patch('/registro_ventas/tomar_pedido/:pedidoId', (req, res) => {
  const { pedidoId } = req.params;
  const { estado_entrega, id_repartidor } = req.body;
  db.run('UPDATE registro_ventas SET estado_entrega = ?, id_repartidor = ? WHERE id_order = ?', [estado_entrega, id_repartidor, pedidoId], (err) => {
      if (err) {
          console.error('Error al tomar el pedido:', err);
          res.status(500).json({ success: false, message: 'Error al tomar el pedido' });
      } else {
          res.json({ success: true });
      }
  });
});
app.patch('/wallet/consolidar/:id_repartidor', (req, res) => {
  const { id_repartidor } = req.params;
  db.run(
      'UPDATE wallet_repartidores SET estado = ? WHERE id_repartidor = ? AND estado = ?',
      ['Consolidado', id_repartidor, 'Por Cobrar'],
      (err) => {
          if (err) {
              console.error('Error al consolidar la wallet:', err);
              res.status(500).json({ success: false, message: 'Error al consolidar la wallet' });
          } else {
              res.json({ success: true });
          }
      }
  );
});
app.patch('/wallet/pago/:id_repartidor', (req, res) => {
  const { id_repartidor } = req.params;

  // Obtener todos los registros con estado "Consolidado" para el repartidor
  db.all(
    'SELECT * FROM wallet_repartidores WHERE id_repartidor = ? AND estado = ?',
    [id_repartidor, 'Consolidado'],
    (err, rows) => {
      if (err) {
        console.error('Error al obtener los registros consolidados:', err);
        res.status(500).json({ success: false, message: 'Error al obtener los registros consolidados' });
        return;
      }

      if (rows.length === 0) {
        res.status(400).json({ success: false, message: 'No hay montos por cobrar para este repartidor.' });
        return;
      }

      // Actualizar cada registro de forma independiente
      rows.forEach((row) => {
        const nuevoMontoPagado = row.monto_por_cobrar; // El monto a pagar será igual al monto por cobrar actual de ese registro

        db.run(
          'UPDATE wallet_repartidores SET estado = ?, monto_por_cobrar = 0, monto_pagado = monto_pagado + ? WHERE id_wallet = ?',
          ['Pagado', nuevoMontoPagado, row.id_wallet],
          (err) => {
            if (err) {
              console.error('Error al actualizar el registro:', err);
            }
          }
        );
      });

      // Responder cuando todos los registros hayan sido actualizados
      res.json({ success: true });
    }
  );
});
app.patch('/registro_ventas/tomar_pedido/:id', (req, res) => {
  const idOrder = req.params.id;
  const { id_repartidor } = req.body; // Tomar el id_repartidor del cuerpo de la solicitud

  const updateQuery = `
      UPDATE registro_ventas 
      SET estado_entrega = 'Asignado', id_repartidor = ?
      WHERE id_order = ?
  `;

  db.run(updateQuery, [id_repartidor, idOrder], function (err) {
      if (err) {
          console.error('Error al actualizar el pedido:', err.message);
          return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Pedido asignado con éxito' });
  });
});
app.patch('/registro_ventas/:id_venta/procesar', (req, res) => {
  const id_venta = req.params.id_venta;

  // Actualizamos la base de datos para marcar la orden como procesada (venta_procesada = 1)
  const query = 'UPDATE registro_ventas SET venta_procesada = 1 WHERE id_venta = ?';

  db.run(query, [id_venta], function (err) {
    if (err) {
      console.error('Error al procesar la orden:', err.message);
      return res.status(500).json({ success: false, message: 'Error al procesar la orden' });
    }

    // Verificamos si se actualizó alguna fila
    if (this.changes > 0) {
      res.status(200).json({ success: true, message: 'Orden procesada con éxito' });
    } else {
      res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
  });
});
app.patch('/api/horarios/:id', (req, res) => {
  const { id } = req.params;
  const { day, startTime, endTime, shift } = req.body;

  const query = `UPDATE Horarios SET Day = ?, Hora_inicio = ?, Hora_fin = ?, Shift = ? WHERE Horario_id = ?`;
  const params = [day, startTime, endTime, shift, id];

  db.run(query, params, function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Error al actualizar el horario' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    res.status(200).json({ message: 'Horario actualizado correctamente' });
  });
});
app.patch('/clientes/:id_cliente', (req, res) => {
  const { id_cliente } = req.params;
  const { name, phone, address_1 } = req.body;  // Incluimos address_1 en el body de la petición

  const sql = `UPDATE clientes SET name = ?, phone = ?, address_1 = ? WHERE id_cliente = ?`;

  db.run(sql, [name, phone, address_1, id_cliente], function (err) {
    if (err) {
      console.error('Error al actualizar el cliente:', err);
      res.status(500).json({ error: 'Error al actualizar la información del cliente.' });
      return;
    }

    res.json({ message: 'Cliente actualizado correctamente.' });
  });
});
app.patch('/api/incentivos/:id', (req, res) => {
  const { id } = req.params;
  const { TO_minimo, incentivo, detalle, activo } = req.body;

  const query = `
    UPDATE IncentivosTO 
    SET TO_minimo = ?, incentivo = ?, detalle = ?, activo = ? 
    WHERE id = ?
  `;
  const values = [TO_minimo, incentivo, detalle, activo, id];

  db.run(query, values, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Error al actualizar el incentivo' });
    } else {
      res.json({ message: 'Incentivo actualizado' });
    }
  });
});
app.patch('/ofertas/:Oferta_Id', upload.single('Imagen'), (req, res) => {
  console.log('Request received for PATCH /ofertas/:Oferta_Id');
  console.log('Request body:', req.body);
  console.log('File:', req.file);

  const {
    Cupones_Asignados, Descripcion, Segmentos_Aplicables,
    Min_Descuento_Percent, Max_Descuento_Percent, Categoria_Cupon,
    Condiciones_Extras, Ticket_Promedio, quantity_condition, Dias_Ucompra, Numero_Compras, Id_cliente_Asig, Max_Amount,
    Instrucciones_Link, Estado, Origen, Tipo_Cupon, Dias_Activos, Hora_Inicio, Hora_Fin,
    Additional_Instructions, Tipo_Oferta, Precio_Cupon, Modo_Precio_Cupon
  } = req.body;

  const Imagen = req.file ? `/uploads/${req.file.filename}` : req.body.Imagen;

  let parsedSegmentos, parsedDiasActivos;
  try {
    parsedSegmentos = JSON.parse(Segmentos_Aplicables || '[]');
    console.log('Parsed Segmentos_Aplicables:', parsedSegmentos);
  } catch (error) {
    console.error('Error parsing Segmentos_Aplicables:', error);
    parsedSegmentos = [];
  }

  try {
    parsedDiasActivos = JSON.parse(Dias_Activos || '[]');
    console.log('Parsed Dias_Activos:', parsedDiasActivos);
  } catch (error) {
    console.error('Error parsing Dias_Activos:', error);
    parsedDiasActivos = [];
  }

  // Función para calcular el precio automático del cupón
  const calculateCouponPrice = (minDiscount, maxDiscount) => {
    const basePrice = 0.5; // Precio base
    const discountFactor = (parseFloat(minDiscount) + parseFloat(maxDiscount)) / 2;
    let calculatedPrice = Math.max(basePrice, (basePrice + (discountFactor / 100) * 1.5).toFixed(2));
    return Math.min(calculatedPrice, 1.99); // Precio máximo permitido
  };

  // Validar y ajustar Precio_Cupon y Modo_Precio_Cupon
  let precioFinalCupon = null;
  let modoPrecioFinal = Modo_Precio_Cupon;

  if (Categoria_Cupon === 'gratis') {
    precioFinalCupon = 0;
    modoPrecioFinal = 'Today Free';
  } else if (Categoria_Cupon === 'pago') {
    if (Modo_Precio_Cupon === 'automatico') {
      precioFinalCupon = calculateCouponPrice(Min_Descuento_Percent, Max_Descuento_Percent);
    } else if (Modo_Precio_Cupon === 'manual') {
      precioFinalCupon = Precio_Cupon ? parseFloat(Precio_Cupon) : null;
    }
  }

  const sql = `
    UPDATE ofertas
    SET
      Cupones_Asignados = ?, Descripcion = ?, Segmentos_Aplicables = ?, Imagen = ?,
      Min_Descuento_Percent = ?, Max_Descuento_Percent = ?, Categoria_Cupon = ?,
      Condiciones_Extras = ?, Ticket_Promedio = ?, quantity_condition = ?, Dias_Ucompra = ?, Numero_Compras = ?, Id_cliente_Asig  = ?,
      Max_Amount = ?, Instrucciones_Link = ?, Estado = ?, Origen = ?, Tipo_Cupon = ?,
      Dias_Activos = ?, Hora_Inicio = ?, Hora_Fin = ?, Additional_Instructions = ?,
      Tipo_Oferta = ?, Precio_Cupon = ?, Modo_Precio_Cupon = ?
    WHERE Oferta_Id = ?
  `;

  const params = [
    Cupones_Asignados,
    Descripcion,
    JSON.stringify(parsedSegmentos),
    Imagen,
    Min_Descuento_Percent || null,
    Max_Descuento_Percent || null,
    Categoria_Cupon || 'gratis',
    Condiciones_Extras,
    Ticket_Promedio || null,
    quantity_condition || null,
    Dias_Ucompra || null,
    Numero_Compras || null,
    Id_cliente_Asig  || null,
    Max_Amount,
    Instrucciones_Link || null,          
    Estado,
    Origen,
    Tipo_Cupon,
    JSON.stringify(parsedDiasActivos),
    Hora_Inicio,
    Hora_Fin,
    Additional_Instructions || null,      
    Tipo_Oferta,
    precioFinalCupon,
    modoPrecioFinal,
    req.params.Oferta_Id
  ];

  console.log('SQL:', sql);
  console.log('Params:', params);

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error updating offer:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'success' });
  });
});
app.patch('/api/offers/:id/use-coupon', (req, res) => {
  const offerId = req.params.id;

  // Obtener la cantidad actual de cupones disponibles
  db.get(`SELECT Cupones_Disponibles FROM ofertas WHERE Oferta_Id = ?`, [offerId], (err, row) => {
    if (err) {
      console.error('Error al obtener los cupones disponibles:', err.message);
      return res.status(500).json({ error: 'Error al obtener los cupones disponibles.' });
    }

    if (row.Cupones_Disponibles <= 0) {
      // Si ya no hay cupones disponibles, no permitir más uso
      return res.status(400).json({ error: 'No hay cupones disponibles.' });
    }

    // Reducimos el número de cupones disponibles
    const cuponesRestantes = row.Cupones_Disponibles - 1;

    // Actualizar la base de datos con el nuevo número de cupones disponibles
    db.run(`UPDATE ofertas SET Cupones_Disponibles = ? WHERE Oferta_Id = ?`, [cuponesRestantes, offerId], function (err) {
      if (err) {
        console.error('Error al actualizar los cupones disponibles:', err.message);
        return res.status(500).json({ error: 'Error al actualizar los cupones disponibles.' });
      }

      // Enviar respuesta con la nueva cantidad de cupones
      res.json({
        message: 'Cupón utilizado exitosamente',
        data: {
          Oferta_Id: offerId,
          Cupones_Disponibles: cuponesRestantes,
        },
      });
    });
  });
});
app.patch('/api/daily-challenge/:id/claim-coupon', (req, res) => {
  const { ig_username, post_link, user_id } = req.body;
  const daily_challenge_id = req.params.id;

  if (!ig_username || !post_link || !user_id) {
    console.log('Datos incompletos recibidos:', { ig_username, post_link, user_id });
    return res.status(400).json({ message: 'Datos incompletos para reclamar el cupón.' });
  }

  // Verificar si hay cupones disponibles y obtener información del Daily Challenge
  const query = `
    SELECT Cupones_Disponibles, Min_Descuento_Percent, Max_Descuento_Percent 
    FROM ofertas 
    WHERE Oferta_Id = ? AND Tipo_Oferta = 'DailyChallenge' AND Estado = 'Activa'
  `;
  db.get(query, [daily_challenge_id], (err, challenge) => {
    if (err) {
      console.error('Error al obtener el Daily Challenge:', err);
      return res.status(500).json({ message: 'Error al obtener el Daily Challenge.' });
    }

    if (!challenge) {
      return res.status(404).json({ message: 'Daily Challenge no encontrado o no está activo.' });
    }

    if (challenge.Cupones_Disponibles <= 0) {
      return res.status(400).json({ message: 'Lo sentimos, no hay cupones disponibles.' });
    }

    // Calcular el descuento
    const discount = Math.floor(Math.random() * (challenge.Max_Descuento_Percent - challenge.Min_Descuento_Percent + 1)) + challenge.Min_Descuento_Percent;

    // Actualizar el registro de participación con el descuento
    const updateQuery = `
      UPDATE ChallengeResponses
      SET discount = ?
      WHERE daily_challenge_id = ? AND user_id = ? AND discount IS NULL
    `;
    db.run(updateQuery, [discount, daily_challenge_id, user_id], function (err) {
      if (err) {
        console.error('Error al actualizar la participación:', err);
        return res.status(500).json({ message: 'Error al actualizar la participación.' });
      }

      if (this.changes === 0) {
        return res.status(400).json({ message: 'No se encontró una participación para actualizar o ya se ha asignado un descuento.' });
      }

      // Actualizar los cupones disponibles en la tabla de ofertas
      const updateCouponsQuery = `
        UPDATE ofertas 
        SET Cupones_Disponibles = Cupones_Disponibles - 1 
        WHERE Oferta_Id = ?
      `;
      db.run(updateCouponsQuery, [daily_challenge_id], (updateErr) => {
        if (updateErr) {
          console.error('Error al actualizar los cupones disponibles:', updateErr);
          return res.status(500).json({ message: 'Error al actualizar los cupones disponibles.' });
        }

        console.log(`Cupón asignado: ${discount}% de descuento. Quedan ${challenge.Cupones_Disponibles - 1} cupones.`);
        return res.json({
          success: true,
          coupon: { discount },
          remainingCoupons: challenge.Cupones_Disponibles - 1
        });
      });
    });
  });
});
app.patch('/api/info-empresa/:id', upload.single('logo_url'), (req, res) => {
  const { id } = req.params;
  const { 
    pais, 
    region, 
    codigo_postal, 
    direccion, 
    coordenadas_latitud, 
    coordenadas_longitud, 
    ciudad, 
    ciudad_latitud, 
    ciudad_longitud, 
    nombre_empresa, 
    correo_contacto, 
    telefono_contacto 
  } = req.body;
  const logo_url = req.file ? `/uploads/${req.file.filename}` : null;

  // Verificar si el id es válido antes de proceder
  if (!id) {
    console.error('Error: El ID no es válido');
    return res.status(400).json({ error: 'El ID no es válido' });
  }

  // Log de los datos recibidos para asegurarnos que llegan correctamente
  console.log('Datos recibidos para actualizar:', {
    id, pais, region, codigo_postal, direccion, coordenadas_latitud, coordenadas_longitud, ciudad, ciudad_latitud, ciudad_longitud, nombre_empresa, correo_contacto, telefono_contacto, logo_url
  });

  // Comprobar si se recibió un logo o no, y actualizar el logo solo si es necesario
  const query = `
    UPDATE InfoEmpresa
    SET pais = ?, region = ?, codigo_postal = ?, direccion = ?, 
        coordenadas_latitud = ?, coordenadas_longitud = ?, 
        ciudad = ?, ciudad_latitud = ?, ciudad_longitud = ?,
        nombre_empresa = ?, correo_contacto = ?, telefono_contacto = ?, 
        logo_url = COALESCE(?, logo_url)
    WHERE id = ?
  `;

  db.run(query, [
    pais, 
    region, 
    codigo_postal, 
    direccion, 
    coordenadas_latitud, 
    coordenadas_longitud, 
    ciudad, 
    ciudad_latitud, 
    ciudad_longitud, 
    nombre_empresa, 
    correo_contacto, 
    telefono_contacto, 
    logo_url, 
    id
  ], function(err) {
    if (err) {
      console.error('Error al actualizar la información de la empresa:', err);
      return res.status(500).json({ error: 'Error al actualizar la información de la empresa' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'No se encontró la empresa para actualizar' });
    }

    res.json({ success: true });
  });
});
app.patch('/ofertas/:Oferta_Id', upload.single('Imagen'), (req, res) => {
  console.log('Request received for PATCH /ofertas/:Oferta_Id');
  console.log('Request body:', req.body);
  console.log('File:', req.file);

  const {
    Cupones_Asignados, Descripcion, Segmentos_Aplicables,
    Min_Descuento_Percent, Max_Descuento_Percent, Condiciones_Extras, Ticket_Promedio, quantity_condition, Dias_Ucompra,
    Numero_Compras, Id_cliente_Asig, Max_Amount, Instrucciones_Link, Estado, Origen, Tipo_Cupon, Dias_Activos,
    Hora_Inicio, Hora_Fin, Additional_Instructions
  } = req.body;

  const Imagen = req.file ? `/uploads/${req.file.filename}` : req.body.Imagen;

  let parsedSegmentos;
  try {
    parsedSegmentos = JSON.parse(Segmentos_Aplicables || '[]');
    console.log('Parsed Segmentos_Aplicables:', parsedSegmentos);
  } catch (error) {
    console.error('Error parsing Segmentos_Aplicables:', error);
    parsedSegmentos = [];
  }

  let parsedDiasActivos;
  try {
    parsedDiasActivos = JSON.parse(Dias_Activos || '[]');
    console.log('Parsed Dias_Activos:', parsedDiasActivos);
  } catch (error) {
    console.error('Error parsing Dias_Activos:', error);
    parsedDiasActivos = [];
  }

  // Consultamos los cupones disponibles actuales antes de actualizar
  const selectSql = 'SELECT Cupones_Disponibles, Cupones_Asignados FROM ofertas WHERE Oferta_Id = ?';
  db.get(selectSql, [req.params.Oferta_Id], (err, row) => {
    if (err) {
      console.error('Error fetching current offer:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }

    const Cupones_Disponibles_Actuales = row.Cupones_Disponibles;
    const Cupones_Asignados_Actuales = row.Cupones_Asignados;

    // Lógica para actualizar los cupones disponibles
    let Cupones_Disponibles = Cupones_Disponibles_Actuales;

    if (parseInt(Cupones_Asignados) > Cupones_Asignados_Actuales) {
      // Si se aumentan los cupones asignados, aumentamos los cupones disponibles proporcionalmente
      const diferencia = parseInt(Cupones_Asignados) - Cupones_Asignados_Actuales;
      Cupones_Disponibles = Cupones_Disponibles_Actuales + diferencia;
    }

    const sql = `
      UPDATE ofertas
      SET
          Cupones_Asignados = ?, Cupones_Disponibles = ?, Descripcion = ?, Segmentos_Aplicables = ?, Imagen = ?,
          Min_Descuento_Percent = ?, Max_Descuento_Percent = ?, Condiciones_Extras = ?, Ticket_Promedio = ?, quantity_condition = ?,
          Dias_Ucompra = ?, Numero_Compras = ?, Id_cliente_Asig  = ?, Max_Amount = ?, Instrucciones_Link = ?, Estado = ?,
          Origen = ?, Tipo_Cupon = ?, Dias_Activos = ?, Hora_Inicio = ?, Hora_Fin = ?, Additional_Instructions = ?
      WHERE Oferta_Id = ?
    `;

    const params = [
      Cupones_Asignados, Cupones_Disponibles, Descripcion, JSON.stringify(parsedSegmentos), Imagen,
      Min_Descuento_Percent || null, Max_Descuento_Percent || null, Condiciones_Extras,
      Ticket_Promedio || null, quantity_condition || null, Dias_Ucompra || null, Numero_Compras || null, Id_cliente_Asig  || null, Max_Amount,
      Instrucciones_Link || null, Estado, Origen, Tipo_Cupon, JSON.stringify(parsedDiasActivos),
      Hora_Inicio, Hora_Fin, Additional_Instructions || null, req.params.Oferta_Id
    ];

    console.log('SQL:', sql);
    console.log('Params:', params);

    db.run(sql, params, function (err) {
      if (err) {
        console.error('Error updating offer:', err.message);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'success' });
    });
  });
});
app.patch('/inventario/:IDR', (req, res) => {
  console.log(`Body recibido para IDR ${req.params.IDR}:`, req.body);
  const { IDR } = req.params;
  const { disponible, limite, fechaCaducidad, ultimaModificacion, estadoForzado } = req.body;


  if (fechaCaducidad && !esFechaValida(fechaCaducidad)) {
    return res.status(400).json({ error: 'Fecha de caducidad no es válida.' });
  }

  if (ultimaModificacion && !esFechaValida(ultimaModificacion)) {
    return res.status(400).json({ error: 'Última modificación no es una fecha válida.' });
  }

  let sql = 'UPDATE inventario SET ';
  let changes = [];
  let parameters = [];

  // Agregar campos a la consulta SQL y los parámetros según se proporcionen
  if (disponible !== undefined) {
    changes.push('disponible = ?');
    parameters.push(disponible);
  }
  if (limite !== undefined) {
    changes.push('limite = ?');
    parameters.push(limite);
  }

  if (fechaCaducidad !== undefined) {
    if (isNaN(new Date(fechaCaducidad).getTime())) {
      return res.status(400).json({ error: 'Fecha de caducidad no es válida.' });
    }
    changes.push('fechaCaducidad = ?');
    parameters.push(fechaCaducidad);
  }
  if (ultimaModificacion !== undefined) {
    if (isNaN(new Date(ultimaModificacion).getTime())) {
      return res.status(400).json({ error: 'Última modificación no es una fecha válida.' });
    }
    changes.push('ultimaModificacion = ?');
    parameters.push(ultimaModificacion);
  }
  // Verificar si hay cambios para actualizar
  if (changes.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
  }

  if (estadoForzado !== undefined) {
    changes.push('estadoForzado = ?');
    parameters.push(estadoForzado ? 1 : 0); // Asumiendo que 'estadoForzado' es un campo booleano
  }

  // Finalizar la construcción de la consulta SQL
  sql += changes.join(', ');
  sql += ' WHERE IDR = ?';
  parameters.push(IDR);

  
  console.log('SQL to execute:', sql);
  console.log('With parameters:', parameters);

  // Ejecutar la consulta SQL
  db.run(sql, parameters, function(err) {
    if (err) {
      console.error('Error al actualizar la base de datos:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes > 0) {
      console.log(`Ingrediente con ID: ${IDR} ha sido actualizado. Número de filas afectadas: ${this.changes}`);
      res.json({ message: 'Actualización exitosa', IDR: IDR });
    } else {
      console.log('No se encontró el ingrediente o no se necesitaba actualizar.');
      res.status(404).json({ error: 'Ingrediente no encontrado' });
    }
  });
});
app.patch('/inventario/por-idi/:IDI', (req, res) => {
  const { IDI } = req.params;
  const { estadoForzado } = req.body;
  
  // Asumiendo que el campo 'estadoForzado' es un booleano en tu base de datos
  // y que usar 1 significa inactivo y 0 activo
  const estadoForzadoInt = estadoForzado ? 1 : 0;

  const sql = `UPDATE inventario SET estadoForzado = ? WHERE IDI = ?`;
  
  db.run(sql, [estadoForzadoInt, IDI], function(err) {
    if (err) {
      console.error('Error al actualizar la base de datos:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes > 0) {
      console.log(`Registros asociados al IDI: ${IDI} han sido actualizados. Número de filas afectadas: ${this.changes}`);
      res.json({ message: 'Actualización exitosa', IDI: IDI, cambios: this.changes });
    } else {
      console.log('No se encontraron registros asociados al IDI o no se necesitaba actualizar.');
      res.status(404).json({ error: 'Registros no encontrados' });
    }
  });
});
app.patch('/menu_pizzas/:id', upload.single('imagen'), (req, res) => {
  const { id } = req.params;
  let updates = req.body;

  // Convertir strings JSON de 'ingredientes' y 'selectSize' en objetos, si es necesario
  if (updates.ingredientes && typeof updates.ingredientes === 'string') {
    updates.ingredientes = JSON.parse(updates.ingredientes);
  }
  if (updates.selectSize && typeof updates.selectSize === 'string') {
    updates.selectSize = JSON.parse(updates.selectSize);
  }

  // Vuelve a convertir los objetos a strings JSON para la base de datos
  if (updates.ingredientes && Array.isArray(updates.ingredientes)) {
    updates.ingredientes = JSON.stringify(updates.ingredientes);
  }
  if (updates.selectSize && Array.isArray(updates.selectSize)) {
    updates.selectSize = JSON.stringify(updates.selectSize);
  }

  // Inicia la consulta SQL y los parámetros
  let sql = 'UPDATE menu_pizzas SET ';
  let params = [];

  // Agrega todos los campos del formulario excepto la imagen al SQL y los parámetros
  Object.keys(updates).forEach((key) => {
    if (key !== 'imagen' && updates[key] !== undefined) {
      sql += `${key} = ?, `;
      params.push(updates[key]);
    }
  });

  // Si se subió un archivo de imagen, inclúyelo en la consulta SQL y en los parámetros
  if (req.file) {
    sql += 'imagen = ?, ';
    params.push(req.file.path);
  }
  console.log(req.file);
  // Elimina la última coma y espacio si están presentes
  sql = sql.replace(/,\s*$/, "");

  // Completa la consulta SQL con la cláusula WHERE
  sql += ` WHERE id = ?`;
  params.push(id);
  console.log('SQL Query:', sql);
  console.log('Parameters:', params);
  // Ejecuta la consulta SQL
  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error updating pizza details:', err.message);
      return res.status(500).json({ "error": err.message });
    }
    res.json({
      message: 'Pizza updated successfully',
      data: {
        id: id,
        changes: this.changes,
        imagen: req.file ? req.file.path : 'No new image uploaded'
      }
    });
  });
});
app.patch('/PartnerData/:id', upload.single('imagen'), (req, res) => {
  const { id } = req.params;
  const { categoria, subcategoria, producto, precio } = req.body;
  const imagen = req.file ? req.file.path : null; // Obtiene la ruta del archivo si se subió uno nuevo

  const query = `UPDATE PartnerData SET categoria = ?, subcategoria = ?, producto = ?, precio = ?${imagen ? ', imagen = ?' : ''} WHERE id = ?`;
  const params = [categoria, subcategoria, producto, precio].concat(imagen ? [imagen, id] : [id]);
  console.log('Parameters:', params);
  db.run(query, params, function(err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({ "message": "success", data: req.body, changes: this.changes });
  });
});
app.patch('/limites/:IDI', (req, res) => {
  const { TLimite } = req.body;
  const { IDI } = req.params;

  // Verifica que TLimite es un número y no es nulo
  if (typeof TLimite !== 'number' || TLimite == null) {
    return res.status(400).json({ error: 'TLimite debe ser un número y no puede ser nulo.' });
  }

  const sql = 'UPDATE SetLimite SET TLimite = ? WHERE IDI = ?';

  db.run(sql, [TLimite, IDI], function(err) {
    if (err) {
      // Si hay un error en la base de datos, responde con un error 500
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      // Si no hay registros actualizados, el IDI no existe en la base de datos
      res.status(404).json({ error: 'Ingrediente con IDI especificado no encontrado.' });
    } else {
      // Si todo salió bien, devuelve una respuesta de éxito.
      res.status(200).json({ message: 'Límite actualizado con éxito', nuevoLimite: TLimite });
    }
  });
});

// the drop zone //
app.delete('/inventario/eliminar/:IDR', (req, res) => {
  const { IDR } = req.params;
  const query = 'DELETE FROM inventario WHERE IDR = ?';

  db.run(query, IDR, function (err) {
    if (err) {
      console.error(`❌ Error al eliminar ingrediente con IDR ${IDR}:`, err.message);
      res.status(500).json({ error: 'Error al eliminar el ingrediente' });
    } else {
      res.json({ message: 'Ingrediente eliminado correctamente', IDR });
    }
  });
});
app.delete("/rutas/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM rutas WHERE id_ruta = ?";
  db.run(query, [id], function (err) {
      if (err) {
          console.error(`Error al eliminar la ruta con ID ${id}:`, err);
          res.status(500).json({ success: false, message: "Error al eliminar la ruta" });
      } else if (this.changes > 0) {
          res.json({ success: true, message: "Ruta eliminada con éxito" });
      } else {
          res.status(404).json({ success: false, message: "Ruta no encontrada" });
      }
  });
});
app.delete('/repartidores/:id', (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM repartidores WHERE id_repartidor = ?`;

  db.run(sql, [id], function (err) {
      if (err) {
          console.error('Error al eliminar repartidor:', err.message);
          res.status(500).json({ error: 'Error al eliminar repartidor' });
      } else {
          res.json({ success: true, changes: this.changes });
      }
  });
})
app.delete('/api/horarios/:id', (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM Horarios WHERE Horario_id = ?`;

  db.run(query, [id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Error al eliminar el horario' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    res.status(200).json({ message: 'Horario eliminado correctamente' });
  });
});
app.delete('/api/incentivos/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM IncentivosTO WHERE id = ?';

  db.run(query, id, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Error al eliminar el incentivo' });
    } else {
      res.json({ message: 'Incentivo eliminado' });
    }
  });
});
app.delete('/api/info-empresa/:id', (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM InfoEmpresa WHERE id = ?`;

  db.run(query, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Error al eliminar la información de la empresa' });
    }
    res.json({ success: true });
  });
});
app.delete('/ofertas/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM ofertas WHERE Oferta_Id = ?';
  db.run(sql, id, function(err) {
      if (err) {
          res.status(500).json({ "error": err.message });
          return;
      }
      res.json({ "message": "success", "deletedId": id });
  });
});
app.delete('/menu_pizzas/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM menu_pizzas WHERE id = ?';
  const params = [id];

  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    if (this.changes > 0) {
      res.json({
        "message": "success",
        "changes": this.changes
      });
    } else {
      // Si no se encontró el registro para eliminar
      res.status(404).json({ "error": "Pizza not found" });
    }
  });
});
app.delete('/PartnerData/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM PartnerData WHERE id = ?`, id, function(err) {
      if (err) {
          res.status(400).json({ "error": res.message });
          return;
      }
      res.json({ "message": "deleted", rows: this.changes });
  });
});
app.delete('/clientes/:id_cliente', (req, res) => {
  const { id_cliente } = req.params;
  
  const deleteSql = `DELETE FROM clientes WHERE id_cliente = ?`;
  
  db.run(deleteSql, [id_cliente], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Cliente eliminado con éxito' });
  });
});

//put zone //
app.put('/IngredientExtraPrices/:id', async (req, res) => {
  const { id } = req.params;
  const { extra_price } = req.body;

  if (!extra_price || isNaN(extra_price)) {
    return res.status(400).send('Precio inválido.');
  }

  try {
    await db.run(
      'UPDATE IngredientExtraPrices SET extra_price = ? WHERE id = ?',
      [extra_price, id]
    );
    res.status(200).send({ message: 'Precio actualizado con éxito.' });
  } catch (error) {
    res.status(500).send('Error al actualizar el precio.');
  }
});
app.put('/clientes/:id_cliente', (req, res) => {
  const { name, phone, address_1, address_2 } = req.body; // Agregamos address_2
  const { id_cliente } = req.params;

  db.run(
    `UPDATE clientes 
     SET name = ?, phone = ?, address_1 = ?, address_2 = ? 
     WHERE id_cliente = ?`,
    [name, phone, address_1, address_2, id_cliente],  // Agregamos address_2 en los valores
    function (err) {
      if (err) {
        res.status(500).json({ error: "Error al actualizar el cliente" });
        console.error("Error al actualizar el cliente:", err);
        return;
      }
      res.json({ message: "Cliente actualizado correctamente" });
    }
  );
});
app.put('/DetallesLote/:InventarioID', (req, res) => {
  const { InventarioID } = req.params;
  const { IDing, Producto, Disponible, TiempoUso, PorcentajeXLote, referencia } = req.body;
  const sqlUpdate = 'UPDATE DetallesLote SET IDing = ?, Producto = ?, Disponible = ?, TiempoUso = ?, PorcentajeXLote = ?, referencia = ? WHERE InventarioID = ?';

  // Verificar primero si el lote existe
  db.get('SELECT * FROM DetallesLote WHERE InventarioID = ?', [InventarioID], (err, row) => {
    if (err) {
      res.status(500).send({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).send({ error: 'Lote no encontrado.' });
      return;
    }

    // Si existe, actualizamos el lote
    db.run(sqlUpdate, [IDing, Producto, Disponible, TiempoUso, PorcentajeXLote, referencia, InventarioID], function(err) {
      if (err) {
        res.status(500).send({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).send({ error: 'No se encontró el lote para actualizar.' });
      } else {
        res.json({ message: 'Lote actualizado con éxito.' });
      }
    });
  });
});
app.put('/clientes/suspender/:id_cliente', (req, res) => {
  const { id_cliente } = req.params;
  const { suspensionPeriod } = req.body;

  let suspensionEndDate;

  // Calcular la fecha de finalización de la suspensión en función del periodo
  if (suspensionPeriod === 'Permanente') {
    suspensionEndDate = null; // Si es permanente, no se establece una fecha de finalización
  } else {
    suspensionEndDate = new Date();
    suspensionEndDate.setDate(suspensionEndDate.getDate() + parseInt(suspensionPeriod));
    // Convertir a formato YYYY-MM-DD para almacenar en la base de datos
    suspensionEndDate = suspensionEndDate.toISOString().split('T')[0];
  }

  // Log para verificar los valores que estamos enviando
  console.log('ID Cliente:', id_cliente);
  console.log('Período de Suspensión:', suspensionPeriod);
  console.log('Fecha de Finalización de Suspensión:', suspensionEndDate);

  const updateSql = `
    UPDATE clientes 
    SET suspension_status = 1, suspension_end_date = ?
    WHERE id_cliente = ?
  `;

  db.run(updateSql, [suspensionEndDate, id_cliente], function(err) {
    if (err) {
      console.error('Error al suspender el cliente:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Cliente suspendido con éxito' });
  });
});
app.put('/clientes/reactivar/:id_cliente', (req, res) => {
  const { id_cliente } = req.params;

  // Log para depurar
  console.log('Intentando reactivar el cliente con id:', id_cliente);

  const updateSql = `
    UPDATE clientes 
    SET suspension_status = NULL, suspension_end_date = NULL
    WHERE id_cliente = ?
  `;
  
  db.run(updateSql, [id_cliente], function(err) {
    if (err) {
      console.error('Error al reactivar el cliente:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ message: 'Cliente no encontrado' });
    } else {
      res.json({ message: 'Cliente reactivado con éxito' });
    }
  });
});
//-------------------//
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Server started at ${new Date().toISOString()}`);
});
