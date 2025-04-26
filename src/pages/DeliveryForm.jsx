import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { _PizzaContext } from './_PizzaContext';
import { useLocation } from 'react-router-dom';  
import { GoogleMap, Marker, Autocomplete, LoadScriptNext } from "@react-google-maps/api";
import { debounce } from 'lodash';
import axios from 'axios';
import moment from 'moment';
import '../styles/DeliveryForm.css';
import AddressFormModal from './AddressFormModal';

const DeliveryForm = ({ setCompra, compra }) => {
  const location = useLocation();
  const { sessionData } = useContext(_PizzaContext);
  const [selectedOption, setSelectedOption] = useState(''); 
  const [pickupInfo, setPickupInfo] = useState({
    nombre: '',
    telefono: '',
    observations: '' // No obligatorio
  });
  const [addressInfo, setAddressInfo] = useState({
    postalCode: '',
    address: '',
    lat: 42.7550800, 
    lng: -7.8662100,
    observations: '' 
  });
  const [mapZoom, setMapZoom] = useState(11);
  const [deliveryTimeOption, setDeliveryTimeOption] = useState('');
  const [customTime, setCustomTime] = useState({ fecha: '', hora: '' });
  const [error, setError] = useState('');
  const autocompleteRef = useRef(null);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [loadGoogleMaps, setLoadGoogleMaps] = useState(false);
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const googleMapsApiKey = 'AIzaSyAi1A8DDiBPGA_KQy2G47JVhFnt_QF0fN8'; 
  const [storeLocation, setStoreLocation] = useState();
  const [cityLocation, setCityLocation] = useState();
  const [pedidosEnCola, setPedidosEnCola] = useState(0);  
  const [storeLocations, setStoreLocations] = useState([]);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState(''); 
  const [showMarkers, setShowMarkers] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [isAddressRequired, setIsAddressRequired] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [triggerUpdate, setTriggerUpdate] = useState(false);
  const [incentivos, setIncentivos] = useState([]);
  const [formularioVisible, setFormularioVisible] = useState(true);
  const [rainProbability, setRainProbability] = useState(0);
  const [triggerUpdateRain, setTriggerUpdateRain] = useState(false);
  const [deliveryConfig, setDeliveryConfig] = useState({
    precio: 0,         // por km extra
    precioBase: 0,     // base fee
    over23hFee: 0,     // recargo nocturno
    weekendFee: 0,     // fin de semana
    weatherFee: 0,     // lluvia
    rainThreshold: 85  // fijo
  });

  useEffect(() => {
    const loadPreviousInfo = async () => {
      try {
        const idCliente = sessionData?.id_cliente;
        if (idCliente) {
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/clientes/${idCliente}`);
          const clienteData = response.data;

          setPickupInfo({
            nombre: clienteData.name || '',
            telefono: clienteData.phone || '',
            observations: clienteData.observations || '',
          });

          setAddressInfo((prevInfo) => ({
            ...prevInfo,
            address: clienteData.address_1 || '',
            lat: clienteData.lat || prevInfo.lat,
            lng: clienteData.lng || prevInfo.lng,
            observations: clienteData.observations || '',
          }));

          if (clienteData.lat && clienteData.lng) {
            setMapZoom(15);
            setMarkerPosition({ lat: clienteData.lat, lng: clienteData.lng });
          }
        }
      } catch (error) {
        console.error('Error al cargar la información previa del cliente:', error);
      }
    };
    loadPreviousInfo();
  }, [sessionData]);
  useEffect(() => {
    const fetchPedidosEnCola = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/registro_ventas`);
        console.log('Datos de pedidos en cola:', response.data); // Log para verificar la información que trae
        const pedidosNoProcesados = response.data.data.filter(pedido => pedido.venta_procesada === 0);
        setPedidosEnCola(pedidosNoProcesados.length);
      } catch (error) {
        console.error('Error al obtener los pedidos en cola:', error);
      }
    };
    fetchPedidosEnCola();
  }, []);
  useEffect(() => {
    const fetchStoreLocations = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/info-empresa`);
        console.log("📦 Respuesta completa del servidor:", response.data);
  
        if (!response.data || !Array.isArray(response.data)) {
          console.error("❌ La respuesta de la API no es un array:", response.data);
          return;
        }
  
        // 🔥 Filtramos solo las tiendas activas
        const activeStores = response.data.filter(store => store.estado === 'activo');
  
        console.log("🏪 Tiendas activas después del filtro:", activeStores);
  
        if (activeStores.length === 0) {
          console.warn("⚠️ No hay tiendas activas disponibles.");
        }
  
        // 📍 Guardamos todas las ubicaciones activas en el estado
        const locations = activeStores.map(store => ({
          id: store.id,
          lat: store.coordenadas_latitud,
          lng: store.coordenadas_longitud,
          ciudad: store.ciudad,
          direccion: store.direccion,
          nombre_empresa: store.nombre_empresa,
        }));
  
        console.log("✅ Ubicaciones activas obtenidas antes de setStoreLocations:", locations);
        setStoreLocations(locations);
  
      } catch (error) {
        console.error('❌ Error al obtener las ubicaciones de las tiendas:', error);
      }
    };
  
    fetchStoreLocations();
  }, []);  
  useEffect(() => {
    if (selectedOption === 'pickup') {
      setShowMarkers(false);
      // Esperar un poco antes de mostrar los marcadores, para asegurarse de que el mapa esté cargado
      setTimeout(() => {
        setShowMarkers(true);
      }, 500); // Ajusta el tiempo según sea necesario
    } else {
      setShowMarkers(false); // Ocultar marcadores si no es pickup
    }
  }, [selectedOption]);
  useEffect(() => {
    console.log('Información de la dirección actualizada:', addressInfo);
  }, [addressInfo]);
  useEffect(() => {
    if (selectedOption !== 'delivery') return; // Solo para Delivery
    if (!addressInfo.lat || !addressInfo.lng) return; // Evitar cálculos inválidos
    if (!storeLocations || storeLocations.length === 0) {
        console.warn('⚠️ Esperando que storeLocations tenga datos antes de calcular.');
        return;
    }

    console.log('🔵 Llamando a calcularTiendaMasCercana con coordenadas:', { lat: addressInfo.lat, lng: addressInfo.lng });

    const tiendaMasCercana = calcularTiendaMasCercana(addressInfo.lat, addressInfo.lng);
    
    if (tiendaMasCercana) {
        console.log('✅ Tienda más cercana encontrada:', tiendaMasCercana);
        setStoreLocation(tiendaMasCercana);
    } else {
        console.error('❌ No se pudo encontrar una tienda cercana.');
    }
  }, [selectedOption, addressInfo.lat, addressInfo.lng, storeLocations]);
  useEffect(() => {
    const fetchPedidosEnColaPorUbicacion = async (ubicacionId) => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/pedidos_en_cola/${ubicacionId}`);
        if (response.data.success) {
          setPedidosEnCola(response.data.pedidosEnCola);
        } else {
          setPedidosEnCola(0); // Predeterminado si no hay pedidos en cola
        }
      } catch (error) {
        console.error('Error al obtener los pedidos en cola para la ubicación:', error);
        setPedidosEnCola(0); // Predeterminado en caso de error
      }
    };
  
    if (selectedOption === 'pickup' && selectedPickupLocation) {
      fetchPedidosEnColaPorUbicacion(selectedPickupLocation);
    } else if (selectedOption === 'delivery' && storeLocation) {
      fetchPedidosEnColaPorUbicacion(storeLocation.id);
    }
  }, [selectedPickupLocation, storeLocation, selectedOption]);
  useEffect(() => {
    if (storeLocations.length > 0 && addressInfo.lat && addressInfo.lng) {
      console.log('🔵 Llamando a calcularTiendaMasCercana con storeLocations:', storeLocations);
      const tiendaMasCercana = calcularTiendaMasCercana(addressInfo.lat, addressInfo.lng);
      
      if (tiendaMasCercana) {
        console.log('✅ Tienda más cercana encontrada:', tiendaMasCercana);
        setStoreLocation(tiendaMasCercana);
      } else {
        console.error('❌ No se pudo encontrar una tienda cercana.');
      }
    } else {
      console.warn('⚠️ Esperando a que storeLocations tenga datos antes de llamar a calcularTiendaMasCercana');
    }
  }, [storeLocations, addressInfo.lat, addressInfo.lng]);
  useEffect(() => {
    const fetchIncentivos = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/incentivos`);
        const incentivosActivos = response.data.filter((inc) => inc.activo === 1);
        setIncentivos(incentivosActivos); 
      } catch (error) {
        console.error('Error al obtener incentivos:', error);
      }
    };
    fetchIncentivos();
  }, []);
  useEffect(() => {
    if (storeLocation?.lat && storeLocation?.lng) {
      setTriggerUpdateRain(true); // activamos manualmente
    }
  }, [storeLocation]);
  useEffect(() => {
    if (!triggerUpdateRain) return;
  
    const fetchClimaDesdeTienda = async () => {
      try {
        console.log("🌦️ [FETCH] Clima desde tienda:", storeLocation);
  
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${storeLocation.lat}&lon=${storeLocation.lng}&appid=7bce86c608f5e6da4ec8c8a3f60040e5&units=metric`
        );
  
        const forecastData = response.data;
        const nextSlot = forecastData?.list?.[0];
        const popValue = Math.round((nextSlot?.pop || 0) * 100);
  
        setRainProbability(popValue);
  
        const fechaPronostico = moment.unix(nextSlot.dt).format("YYYY-MM-DD HH:mm:ss");
        const clima = nextSlot.weather?.[0]?.description || 'N/A';
  
        console.log(`🌧️ Pronóstico: ${popValue}% | Clima: ${clima} | Hora: ${fechaPronostico}`);
      } catch (error) {
        console.error("❌ Error al obtener clima:", error);
      } finally {
        setTriggerUpdateRain(false); // evitamos múltiples disparos
      }
    };
  
    fetchClimaDesdeTienda();
  }, [triggerUpdateRain]);

  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     console.log('⚠️ Simulación manual: forzando rainProbability al 90%');
  //     setRainProbability(90);
  //   }
  // }, []);

  useEffect(() => {
    const fetchDeliveryConfig = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/delivery/price`);
        if (response.data.success) {
          setDeliveryConfig({
            precio: parseFloat(response.data.precio) || 0,         // precio por km
            precioBase: parseFloat(response.data.precioBase) || 0, // tarifa base
            over23hFee: parseFloat(response.data.over23hFee) || 0,
            weekendFee: parseFloat(response.data.weekendFee) || 0,
            weatherFee: parseFloat(response.data.weatherFee) || 0,
          });
        } else {
          console.warn('No success flag in /delivery/price response');
        }
      } catch (error) {
        console.error('Error fetching delivery config:', error);
      }
    };
  
    fetchDeliveryConfig();
  }, []);

  function applyFreePassIfAny(compra, incentivos = []) {
  // 📌 Asegurar que `incentivos` es un array válido
  if (!Array.isArray(incentivos)) {
      console.warn("⚠️ 'incentivos' no es un array válido en applyFreePassIfAny. Se usará un array vacío.");
      incentivos = [];
  }

  let newDeliveryCost = compra.Entrega?.Delivery?.costoReal ?? compra.Entrega?.Delivery?.costo ?? 0;
  let newFreePassApplied = compra.Entrega?.Delivery?.freePassApplied ?? false;

  console.log("🔍 Evaluando si se debe aplicar el Delivery Free Pass...");
  console.log("🛒 Estado actual de la compra antes de aplicar Free Pass:", compra);

  // 🔹 Calcular total sin delivery para evaluar Free Pass
  const totalBaseSinDelivery = compra.total_a_pagar_con_descuentos - (compra.totalDelivery || 0);

  // 🔹 Verificar si hay incentivos y buscar el de Delivery Free Pass
  const dfpIncentivo = incentivos.length > 0 ? incentivos.find((i) => i.incentivo === 'Delivery Free Pass') : null;
  const deliveryFreePass = dfpIncentivo ? totalBaseSinDelivery >= dfpIncentivo.TO_minimo : false;

  console.log("🎯 Evaluación DFP:", {
      totalBaseSinDelivery,
      "TO mínimo requerido": dfpIncentivo?.TO_minimo,
      "Aplica Free Pass": deliveryFreePass
  });

  if (compra.Entrega?.Delivery) {
      if (deliveryFreePass && !newFreePassApplied) {
          console.log("✅ Aplicando Delivery Free Pass...");
          newDeliveryCost = 0;
          newFreePassApplied = true;
      } else if (!deliveryFreePass && newFreePassApplied) {
          console.log("❌ Removiendo Delivery Free Pass...");
          newFreePassApplied = false;
      }
  }

  console.log("🔄 Estado actualizado después de evaluar Free Pass:", {
      newMonto: totalBaseSinDelivery,
      newDeliveryCost,
      newFreePassApplied
  });

  return { newMonto: totalBaseSinDelivery, newDeliveryCost, newFreePassApplied };
  }
  const handleOptionChange = (option) => {
    setSelectedOption(option);
    setLoadGoogleMaps(option === 'delivery' || option === 'pickup');
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPickupInfo((prevInfo) => ({
      ...prevInfo,
      [name]: value
    }));
  };
  const handleAddressChange = useCallback(
    debounce(() => {
      console.log('handleAddressChange triggered');
      console.trace();
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address;
  
        if (lat && lng) {
          setAddressInfo((prev) => ({
            ...prev,
            lat,
            lng,
            address,
          }));
  
          const tiendaMasCercana = calcularTiendaMasCercana(lat, lng);
          if (tiendaMasCercana) {
            console.log('Tienda más cercana:', tiendaMasCercana);
            setStoreLocation(tiendaMasCercana);
          }
  
          setMapZoom(15);
          setMarkerPosition({ lat, lng });
        } else {
          console.error('Las coordenadas obtenidas son inválidas.');
        }
      }
    }, 500),
    []
  );
  const geocodeAddress = async () => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressInfo.address)}&key=${googleMapsApiKey}`
      );

      if (response.data.results.length > 0) {
        const { lat, lng } = response.data.results[0].geometry.location;

        setAddressInfo((prevInfo) => ({
          ...prevInfo,
          lat,
          lng,
        }));
        setMapZoom(15);
        setMarkerPosition({ lat, lng });

        const idCliente = sessionData?.id_cliente;

        if (!idCliente) {
          setError('No se encontró un cliente en la sesión.');
          return;
        }

        const clienteData = {
          name: pickupInfo.nombre,
          phone: pickupInfo.telefono,
          address_1: addressInfo.address,
          lat: lat,
          lng: lng,
          observations: addressInfo.observations,
        };

        try {
          await axios.put(`${process.env.REACT_APP_API_URL}/clientes/${idCliente}`, clienteData);
          setError('');
          console.log('Cliente actualizado correctamente.', clienteData); // Log para verificar la actualización del cliente
          setIsAddressConfirmed(true);
        } catch (error) {
          console.error('Error al actualizar la dirección del cliente:', error);
          setError('Error al actualizar la dirección. Inténtalo de nuevo.');
        }
      } else {
        setError('No se encontraron coordenadas para la dirección proporcionada.');
      }
    } catch (error) {
      console.error("Error al obtener coordenadas de la dirección:", error);
      setError('Error al obtener las coordenadas. Inténtalo de nuevo.');
    }
  };
  const calcularPrecioDelivery = async () => {
    const precioBase = deliveryConfig.precioBase;
  
    try {
      if (!storeLocation || !addressInfo.lat || !addressInfo.lng) {
        console.error('❌ Faltan datos para calcular el delivery (storeLocation o coordenadas del cliente).');
        return { cost: 0, debugBreakdown: null };
      }
  
      const origen = `${storeLocation.lat},${storeLocation.lng}`;
      const destino = `${addressInfo.lat},${addressInfo.lng}`;
  
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/google/distancia-single`, {
        params: { origen, destino, tiendaNombre: storeLocation.nombre_empresa }
      });
  
      const distanciaKM = response.data.distancia_m / 1000;
      let precioDelivery = precioBase;
  
      const extraDistancia = distanciaKM > 1 ? (distanciaKM - 1) * deliveryConfig.precio : 0;
      precioDelivery += extraDistancia;
  
      const weekendApplied = esFinDeSemana() ? deliveryConfig.weekendFee : 0;
      precioDelivery += weekendApplied;
  
      const nightApplied = esDespuesDeLas23() ? deliveryConfig.over23hFee : 0;
      precioDelivery += nightApplied;
  
      const rainApplied = (rainProbability >= (deliveryConfig.rainThreshold || 85))
        ? deliveryConfig.weatherFee
        : 0;
      precioDelivery += rainApplied;
  
      const debugBreakdown = {
        baseFee: precioBase,
        distanciaKM: distanciaKM.toFixed(2),
        extraDistancia: extraDistancia.toFixed(2),
        nightFee: nightApplied,
        rainFee: rainApplied,
        weekendFee: weekendApplied,
        rainProbability,
        fallback: false
      };
  
      console.log("🧾 Breakdown del Delivery:", debugBreakdown);
 
      return {
        cost: parseFloat(precioDelivery.toFixed(2)),
        debugBreakdown
      };
  
    } catch (error) {
      console.warn("⚠️ Error con la API de distancia. Usando fallback Haversine.");
  
      const distancia = calcularDistancia(
        addressInfo.lat, addressInfo.lng,
        storeLocation.lat, storeLocation.lng
      );
  
      let precioDelivery = precioBase;
      const extraDistancia = distancia > 1 ? (distancia - 1) * deliveryConfig.precio : 0;
      precioDelivery += extraDistancia;
  
      const weekendApplied = esFinDeSemana() ? deliveryConfig.weekendFee : 0;
      precioDelivery += weekendApplied;
  
      const nightApplied = esDespuesDeLas23() ? deliveryConfig.over23hFee : 0;
      precioDelivery += nightApplied;
  
      const rainApplied = (rainProbability >= (deliveryConfig.rainThreshold || 85))
        ? deliveryConfig.weatherFee
        : 0;
      precioDelivery += rainApplied;
  
      const debugBreakdown = {
        baseFee: precioBase,
        distanciaKM: distancia.toFixed(2),
        extraDistancia: extraDistancia.toFixed(2),
        nightFee: nightApplied,
        rainFee: rainApplied,
        weekendFee: weekendApplied,
        rainProbability,
        fallback: true
      };
  
      console.log("🧾 Breakdown (fallback):", debugBreakdown);
  
      return {
        cost: parseFloat(precioDelivery.toFixed(2)),
        debugBreakdown
      };
    }
  };
  const calcularDistancia = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
  
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const R = 6371; // Radio de la Tierra en km
  
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const esFinDeSemana = () => {
    const diaActual = moment().day();
    return diaActual === 0 || diaActual === 6;
  };
  const esDespuesDeLas23 = () => {
    const horaActual = moment().hour();
    return horaActual >= 23;
  };
  const handleDeliveryTimeChange = async (e) => {
    const nuevaTemporalidad = e.target.value;
    setDeliveryTimeOption(nuevaTemporalidad);
  
    const esProgramado = nuevaTemporalidad === 'custom';
  
    let extraMinutes = 0;
    if (nuevaTemporalidad === '30min') extraMinutes = 30;
    else if (nuevaTemporalidad === '45min') extraMinutes = 45;
    else if (nuevaTemporalidad === 'Express') extraMinutes = 20;
  
    const horaPrometida = calcularHoraPrometida(extraMinutes);
    const costoTicketExpress = nuevaTemporalidad === 'Express' ? calcularCostoTicketExpress() : 0;
  
    const freePassActual = compra.Entrega?.Delivery?.freePassApplied ?? false;
    const { newDeliveryCost, newFreePassApplied } = applyFreePassIfAny(compra, incentivos);
  
    // ✅ Llamamos una sola vez a calcularPrecioDelivery
    const { cost: rawCost, debugBreakdown } = selectedOption === 'delivery'
      ? await calcularPrecioDelivery()
      : { cost: 0, debugBreakdown: null };
  
    // ✅ Aplicar Free Pass si corresponde
    const freePassFinal = freePassActual || newFreePassApplied;
    const costoDelivery = freePassFinal ? 0 : rawCost;
  
    console.log("🔄 Estado final del Free Pass:", freePassFinal, "| Costo de Delivery:", costoDelivery);
  
    setCompra((prevCompra) => {
      const updatedCompra = {
        ...prevCompra,
        is_scheduled_order: esProgramado,
        Entrega: selectedOption === 'pickup'
          ? {
              PickUp: {
                id_cliente: sessionData?.id_cliente,
                nombre: pickupInfo.nombre,
                telefono: pickupInfo.telefono,
                fechaYHoraPrometida: horaPrometida,
                TicketExpress: nuevaTemporalidad === 'Express',
                costoTicketExpress,
                puntoRecogida: storeLocations.find(loc => loc.id === parseInt(selectedPickupLocation)) || null,
              }
            }
          : {
              Delivery: {
                id_cliente: sessionData?.id_cliente,
                nombre: pickupInfo.nombre,
                telefono: pickupInfo.telefono,
                fechaYHoraPrometida: horaPrometida,
                address: addressInfo.address,
                postalCode: addressInfo.postalCode,
                latitud: addressInfo.lat,
                longitud: addressInfo.lng,
                costo: costoDelivery,
                costoReal: rawCost,
                TicketExpress: nuevaTemporalidad === 'Express',
                costoTicketExpress,
                tiendaSalida: storeLocation,
                freePassApplied: freePassFinal,
                debugBreakdown
              }
            },
        totalTicketExpress: costoTicketExpress,
        totalDelivery: costoDelivery,
        deliveryBreakdown: debugBreakdown,
        cliente: {
          name: pickupInfo.nombre,
          phone: pickupInfo.telefono,
        },
        observaciones: selectedOption === 'pickup'
          ? pickupInfo.observations
          : addressInfo.observations
      };
  
      console.log("🛒 Estado de compra actualizado en handleDeliveryTimeChange:", updatedCompra);
      return updatedCompra;
    });
  };
  const calcularHoraPrometida = (minutosExtra) => {
    return moment().add(minutosExtra, 'minutes').format('YYYY-MM-DD HH:mm');
  };
  const actualizarEstadoCompra = () => {
    // 1) Validar campos de formulario:
    if (!pickupInfo.nombre || !pickupInfo.telefono || !deliveryTimeOption) {
      setError('Por favor completa todos los campos obligatorios (nombre, teléfono y tiempo).');
      return;
    }
    if (selectedOption === 'delivery') {
      if (!addressInfo.address || !addressInfo.lat || !addressInfo.lng || !isAddressConfirmed) {
        setError('Por favor confirma la dirección antes de continuar.');
        return;
      }
    } else {
      // pickup
      if (!selectedPickupLocation) {
        setError('Selecciona un punto de recogida.');
        return;
      }
    }
    
    // 2) Calcular la hora prometida según el tiempo elegido:
    let extraMinutes = 0;
    if (deliveryTimeOption === '30min') extraMinutes = 30;
    else if (deliveryTimeOption === '45min') extraMinutes = 45;
    else if (deliveryTimeOption === 'Express') extraMinutes = 20;
    else if (deliveryTimeOption === 'custom' && customTime.fecha && customTime.hora) {
      // Podrías construir la hora a mano con moment
    }
    const horaPrometida = calcularHoraPrometida(extraMinutes);
    
    // 3) Calcular la tienda más cercana si es delivery
    let tiendaMasCercana = null;
    if (selectedOption === 'delivery') {
      tiendaMasCercana = calcularTiendaMasCercana(addressInfo.lat, addressInfo.lng);
      if (!tiendaMasCercana) {
        setError('No se pudo encontrar una tienda cercana para el delivery.');
        return;
      }
    }
    
    // 4) Calcular costos (delivery y ticketExpress) en un solo lugar:
    const costoDelivery = (selectedOption === 'delivery' && isAddressConfirmed)
      ? calcularPrecioDelivery()
      : 0;
    
    const costoTicketExpress = (deliveryTimeOption === 'Express')
      ? calcularCostoTicketExpress()
      : 0;
  
    // 5) Unificar en el objeto final
    setCompra((prevCompra) => {
      const updated = {
        ...prevCompra,
        debugFlagUnificado: true,
        // Resumen de la Entrega
        Entrega: selectedOption === 'pickup'
          ? {
              PickUp: {
                id_cliente: sessionData?.id_cliente,
                nombre: pickupInfo.nombre,
                telefono: pickupInfo.telefono,
                fechaYHoraPrometida: horaPrometida,
                TicketExpress: (deliveryTimeOption === 'Express'),
                costoTicketExpress: costoTicketExpress,
                puntoRecogida: storeLocations.find(
                  loc => loc.id === parseInt(selectedPickupLocation)
                ) || null,
              }
            }
          : {
              Delivery: {
                id_cliente: sessionData?.id_cliente,
                nombre: pickupInfo.nombre,
                telefono: pickupInfo.telefono,
                fechaYHoraPrometida: horaPrometida,
                address: addressInfo.address,
                postalCode: addressInfo.postalCode,
                costo: costoDelivery,
                costoReal: costoDelivery,
                TicketExpress: (deliveryTimeOption === 'Express'),
                costoTicketExpress: costoTicketExpress,
                tiendaSalida: tiendaMasCercana,
              }
            },
        // Info de cliente
        cliente: {
          name: pickupInfo.nombre,
          phone: pickupInfo.telefono,
        },
        // Observaciones según sea pickup o delivery
        observaciones: (selectedOption === 'pickup')
          ? pickupInfo.observations
          : addressInfo.observations
      };
  
      // Opcionalmente, podrías recalcular un total tentativo (si quieres):
      // const totalConDescuentos = Math.max(
      //   prevCompra.total_productos - prevCompra.total_descuentos + costoDelivery + costoTicketExpress,
      //   prevCompra.total_productos
      // );
      // updated.total_a_pagar_con_descuentos = totalConDescuentos;
  
      console.log('✅ handleMetodoEntrega -> updatedCompra:', updated);
      return updated;
    });
  
    setError('');
    setTriggerUpdate((prev) => !prev);
  };
  const calcularCostoTicketExpress = () => {
    const costoPorPedido = 0.10;
  
    if (!selectedPickupLocation && !storeLocation) {
      return 0;
    }
  
    return pedidosEnCola > 0 ? pedidosEnCola * costoPorPedido : 0;
  };
  const handleCustomTimeChange = (e) => {
    const { name, value } = e.target;
    setCustomTime((prevTime) => ({
      ...prevTime,
      [name]: value
    }));
  };
  const handleSaveDelivery = async () => {
    console.log('handleSaveDelivery called');
    setError('');
  
    /* ───────── Validaciones ───────── */
    const required = [];
    if (!pickupInfo.nombre)   required.push('nombre');
    if (!pickupInfo.telefono) required.push('telefono');
    if (!deliveryTimeOption)  required.push('deliveryTimeOption');
  
    if (selectedOption === 'delivery') {
      if (!addressInfo.address || !addressInfo.lat || !addressInfo.lng || !isAddressConfirmed) {
        required.push('address');
      }
    } else if (selectedOption === 'pickup') {
      if (!selectedPickupLocation) required.push('selectedPickupLocation');
    }
  
    setMissingFields(required);
    setIsAddressRequired(required.includes('address'));
    if (required.length > 0) {
      setError('Por favor completa o confirma los campos obligatorios.');
      return;
    }
  
    const idCliente = sessionData?.id_cliente;
    if (!idCliente) {
      setError('No se encontró un cliente en la sesión.');
      return;
    }
  
    /* ─── Si es delivery, actualizamos la dirección del cliente ─── */
    if (selectedOption === 'delivery') {
      const clienteData = {
        name         : pickupInfo.nombre,
        phone        : pickupInfo.telefono,
        address_1    : addressInfo.address,
        lat          : addressInfo.lat,
        lng          : addressInfo.lng,
        observations : addressInfo.observations,
      };
  
      try {
        await axios.put(`${process.env.REACT_APP_API_URL}/clientes/${idCliente}`, clienteData);
        console.log('✅ Cliente actualizado correctamente', clienteData);
      } catch (error) {
        console.error('❌ Error al actualizar la dirección:', error);
        setError('Error al actualizar la dirección. Inténtalo de nuevo.');
        return;
      }
    }
  
    const tiendaMasCercana = selectedOption === 'delivery'
      ? calcularTiendaMasCercana(addressInfo.lat, addressInfo.lng)
      : null;
  
    if (selectedOption === 'delivery' && !tiendaMasCercana) {
      setError('No se pudo encontrar una tienda cercana para el delivery.');
      return;
    }
  
    /* ─── Fecha/Hora prometida ─── */
    let fechaYHoraPrometida = '';
    if (deliveryTimeOption === 'custom') {
      if (!customTime.fecha || !customTime.hora) {
        setError('Debes seleccionar una fecha y hora válida.');
        return;
      }
      fechaYHoraPrometida = `${customTime.fecha} ${customTime.hora}`;
    } else {
      const extraMinutes =
        deliveryTimeOption === '30min'  ? 30 :
        deliveryTimeOption === '45min'  ? 45 :
        deliveryTimeOption === 'Express'? 20 : 0;
      fechaYHoraPrometida = calcularHoraPrometida(extraMinutes);
    }
  
    /* ─── Costes ─── */
    /** 👉 NUEVO: desestructuramos para obtener solo el número y el breakdown */
    const { cost: rawCost, debugBreakdown } =
      (selectedOption === 'delivery' && isAddressConfirmed)
        ? await calcularPrecioDelivery()
        : { cost: 0, debugBreakdown: null };
  
    const costoTicketExpress = deliveryTimeOption === 'Express'
      ? calcularCostoTicketExpress()
      : 0;
  
    const { newFreePassApplied } = applyFreePassIfAny(compra, incentivos);
    const freePassFinal = newFreePassApplied ||
                          (compra.Entrega?.Delivery?.freePassApplied ?? false);
  
    if (freePassFinal) console.log('✅ Aplicando Free Pass: Delivery gratis');
  
    /* ─── Set state ─── */
    setCompra(prevCompra => ({
      ...prevCompra,
      is_scheduled_order: deliveryTimeOption === 'custom',
      Entrega: selectedOption === 'pickup'
        ? {
            PickUp: {
              id_cliente: idCliente,
              nombre    : pickupInfo.nombre,
              telefono  : pickupInfo.telefono,
              fechaYHoraPrometida,
              TicketExpress     : deliveryTimeOption === 'Express',
              costoTicketExpress,
              puntoRecogida     : storeLocations.find(loc => loc.id === parseInt(selectedPickupLocation)) || null,
            }
          }
        : {
            Delivery: {
              id_cliente: idCliente,
              nombre    : pickupInfo.nombre,
              telefono  : pickupInfo.telefono,
              fechaYHoraPrometida,
              address   : addressInfo.address,
              latitud   : addressInfo.lat,
              longitud  : addressInfo.lng,
              postalCode: addressInfo.postalCode,
              costo     : freePassFinal ? 0 : rawCost,
              costoReal : rawCost,
              TicketExpress     : deliveryTimeOption === 'Express',
              costoTicketExpress,
              tiendaSalida      : tiendaMasCercana,
              freePassApplied   : freePassFinal,
              debugBreakdown
            }
          },
      totalTicketExpress : costoTicketExpress,
      totalDelivery      : freePassFinal ? 0 : rawCost,
      deliveryBreakdown  : debugBreakdown,
      cliente: {
        name : pickupInfo.nombre,
        phone: pickupInfo.telefono,
      },
      observaciones: selectedOption === 'pickup'
        ? pickupInfo.observations
        : addressInfo.observations
    }));
  
    console.log('✅ Estado de compra actualizado (SaveDelivery)');
    setTriggerUpdate(prev => !prev);
    setFormularioVisible(false);
  };  
  const handlePickupLocationChange = (e) => {
    setSelectedPickupLocation(e.target.value);
    const selectedLocation = storeLocations.find(location => location.id === parseInt(e.target.value));
    if (selectedLocation) {
      setMarkerPosition({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      setAddressInfo((prevInfo) => ({
        ...prevInfo,
        address: selectedLocation.direccion, // Actualizamos con la dirección de la tienda
        lat: selectedLocation.lat,
        lng: selectedLocation.lng
      }));
      setMapZoom(15);
    }
  };
  const calcularTiendaMasCercana = (lat, lng) => {
    // Verificar que el método de entrega es 'delivery'
    if (selectedOption !== 'delivery') {
        console.warn('⏳ calcularTiendaMasCercana no se ejecuta en modo Pickup.');
        return null;
    }

    console.log('Inicio de calcularTiendaMasCercana. Coordenadas recibidas:', { lat, lng });

    if (lat === undefined || lng === undefined) {
        console.error('❌ Las coordenadas proporcionadas son inválidas:', { lat, lng });
        return null;
    }

    if (storeLocations.length === 0) {
        console.error('❌ No se puede calcular la tienda más cercana, storeLocations está vacío.');
        return null;
    }

    console.log('📍 Contenido de storeLocations:', storeLocations);

    let tiendaMasCercana = null;
    let distanciaMinima = Infinity;

    storeLocations.forEach((store) => {
        const distancia = calcularDistancia(lat, lng, store.lat, store.lng);
        console.log(`📏 Distancia calculada a la tienda ${store.nombre_empresa}: ${distancia} km`);

        if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            tiendaMasCercana = store;
        }
    });

    if (tiendaMasCercana) {
        console.log(`✅ Tienda más cercana seleccionada: ${tiendaMasCercana.nombre_empresa}, Distancia: ${distanciaMinima} km`);
    } else {
        console.error('❌ No se pudo seleccionar una tienda más cercana.');
    }

    console.log('🏁 Fin de calcularTiendaMasCercana. Tienda más cercana:', tiendaMasCercana);

    return tiendaMasCercana;
  };
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  const handleSaveAddress = (direccion) => {
    console.log("Datos recibidos desde el modal:", direccion);
    setAddressInfo((prevInfo) => ({
      ...prevInfo,
      address: direccion.address,
      postalCode: direccion.postalCode,
      lat: direccion.lat,
      lng: direccion.lng,
      observations: direccion.observations, // Asegura que las observaciones también se guarden
    }));
    console.log("Estado de addressInfo después de actualizar:", addressInfo);
  };
  const validateAddressFields = () => {
    return (
      addressInfo.address &&
      addressInfo.postalCode &&
      addressInfo.lat &&
      addressInfo.lng
    );
  };

  return (
<>
  {formularioVisible ? (
    <>
      {/* Selector del método de entrega (fuera del contenedor blanco) */}
      {!selectedOption && (
        <div className="delivery-method-selector">
          <h3 className="delivery-form-title">Delivery & Pickup Info</h3>
          <div className="toggle-options">
            <div
              className={`toggle-button ${selectedOption === 'delivery' ? 'active' : ''}`}
              onClick={() => handleOptionChange('delivery')}
            >
              Delivery
            </div>
            <div
              className={`toggle-button ${selectedOption === 'pickup' ? 'active' : ''}`}
              onClick={() => handleOptionChange('pickup')}
            >
              Pickup
            </div>
          </div>
        </div>
      )}

      {/* Formulario principal con fondo blanco */}
      {selectedOption && (
        <div className="delivery-form-container">
          <div className="delivery-form-sticky-top">
            <h3 className="delivery-form-title">Delivery & Pickup Info</h3>
            <div className="selected-option-info" style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => setSelectedOption(null)}
                className="change-delivery-method"
              >
                SWITCH - METHOD
              </button>
            </div>
          </div>

          {selectedOption === 'pickup' && (
            <div className="pickup-fields">
              {/* Lista desplegable para seleccionar el punto de recogida */}
              <label>
                Pick-up Location :
                <select
                  value={selectedPickupLocation}
                  onChange={handlePickupLocationChange}
                  style={{ width: '100%' }}
                  className={missingFields.includes('selectedPickupLocation') ? 'input-error' : ''}
                >
                  <option value="" disabled>Selecciona un punto de recogida</option>
                  <option value="all">Todas las Ubicaciones</option>
                  {storeLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.ciudad} - {location.direccion}
                    </option>
                  ))}
                </select>
              </label>

              <div className="map-container" style={{ marginTop: '1rem' }}>
                <LoadScriptNext googleMapsApiKey={googleMapsApiKey} libraries={["places"]}>
                  <GoogleMap
                    center={markerPosition || { lat: 42.33757, lng: -7.87055 }}
                    zoom={selectedPickupLocation === 'all' ? 11 : mapZoom}
                    mapContainerStyle={{
                      height: '400px',
                      width: '100%',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}
                  >
                    {showMarkers && storeLocations.length > 0 && (
                      <>
                        {storeLocations.map((location) => (
                          <Marker
                            key={location.id}
                            position={{
                              lat: parseFloat(location.lat),
                              lng: parseFloat(location.lng),
                            }}
                            title={`${location.ciudad}, ${location.direccion}`}
                            icon={
                              selectedPickupLocation === String(location.id)
                                ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                                : "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                            }
                          />
                        ))}
                      </>
                    )}
                  </GoogleMap>
                </LoadScriptNext>
              </div>

              <div className="ticket-express-section-df" style={{ marginTop: '1rem' }}>
                {(!selectedPickupLocation && selectedOption === 'pickup') || (!storeLocation && selectedOption === 'delivery') ? (
                  <div className="ticket-express-info">
                    <p>Select your pickup spot or store to enable Express Ticket calculation.</p>
                  </div>
                ) : (
                  pedidosEnCola > 0 ? (
                    <div className="ticket-express-info">
                      <p>You currently have  {pedidosEnCola} orders ahead of you</p>
                      <p><b>Want it faster? Get an Express Ticket.</b> 🚀</p>
                      <p><b>Price Right Now: {calcularCostoTicketExpress().toFixed(2)}€</b></p>
                    </div>
                  ) : (
                    <div className="ticket-express-info">
                      <p><b>Ticket Express is free right now!</b> 🚀</p>
                    </div>
                  )
                )}
              </div>

              <label style={{ marginTop: '1rem', display: 'block' }}>
                Delivery Time:
                <select
                  value={deliveryTimeOption}
                  onChange={handleDeliveryTimeChange}
                  style={{ width: '100%' }}
                  className={missingFields.includes('deliveryTimeOption') ? 'input-error' : ''}
                >
                  <option value="" disabled>Choose your time</option>
                  <option value="30min">30 min</option>
                  <option value="45min">45 min</option>
                  <option value="Express">Ticket Express ({calcularCostoTicketExpress().toFixed(2)}€)</option>
                  <option value="custom">Choose date and time</option>
                </select>
              </label>

              {deliveryTimeOption === 'custom' && (
                <div className="custom-time-fields">
                  <label>
                    Delivery Date:
                    <input
                      type="date"
                      name="fecha"
                      value={customTime.fecha}
                      onChange={handleCustomTimeChange}
                      min={today}
                      style={{ width: '100%' }}
                    />
                  </label>
                  <label>
                    Delivery Time:
                    <input
                      type="time"
                      name="hora"
                      value={customTime.hora}
                      onChange={handleCustomTimeChange}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>
              )}

              <label style={{ marginTop: '1rem', display: 'block' }}>
                Name:
                <input
                  type="text"
                  name="nombre"
                  value={pickupInfo.nombre}
                  onChange={handleInputChange}
                  placeholder="Your name, please"
                  style={{ width: '100%' }}
                  className={missingFields.includes('nombre') ? 'input-error' : ''}
                />
              </label>

              <label style={{ marginTop: '1rem', display: 'block' }}>
                Phone Number:
                <input
                  type="text"
                  name="telefono"
                  value={pickupInfo.telefono}
                  onChange={handleInputChange}
                  placeholder="Type your phone number"
                  style={{ width: '100%' }}
                  className={missingFields.includes('telefono') ? 'input-error' : ''}
                />
              </label>

              <label style={{ marginTop: '1rem', display: 'block' }}>
                Notes (optional):
                <input
                  type="text"
                  name="observations"
                  value={pickupInfo.observations}
                  onChange={(e) => setPickupInfo({ ...pickupInfo, observations: e.target.value })}
                  placeholder="Notes (optional)"
                  style={{ width: '100%' }}
                />
              </label>

              <button
                className="save-button"
                onClick={handleSaveDelivery}
                style={{ marginTop: '1rem' }}
              >
                Save
              </button>
            </div>
          )}

          {selectedOption === 'delivery' && loadGoogleMaps && (
            <LoadScriptNext googleMapsApiKey={googleMapsApiKey} libraries={["places"]}>
              <div className="delivery-fields">
                {/* Dirección */}
                <label>
                  Address:
                  <input
                    type="text"
                    placeholder="Your Selected Address"
                    value={addressInfo.address}
                    readOnly
                    style={{ width: '100%', backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    className={missingFields.includes('address') ? 'input-error' : ''}
                  />
                </label>

                <div className="button-group">
                  {!isAddressConfirmed ? (
                    <>
                      <button
                        className={`manual-address-button ${isAddressRequired ? 'button-error' : ''}`}
                        onClick={geocodeAddress}
                      >
                        Confirm Your Address
                      </button>

                      <button onClick={handleOpenModal} className="add-address-button">
                        {addressInfo.address ? 'Update Address' : 'Add Address'}
                      </button>
                    </>
                  ) : (
                    <div className="confirmed-message">
                      <p>¡Success! You're all set.!🥳</p>
                    </div>
                  )}
                </div>

                {isModalOpen && (
                  <AddressFormModal
                    onClose={handleCloseModal}
                    onSave={(direccion) => {
                      handleSaveAddress(direccion);
                      setIsModalOpen(false);
                    }}
                  />
                )}

                <div className="map-container" style={{ marginTop: '1rem' }}>
                  <GoogleMap
                    center={addressInfo.lat && addressInfo.lng ? { lat: addressInfo.lat, lng: addressInfo.lng } : { lat: 42.75508, lng: -7.86621 }}
                    zoom={isAddressConfirmed ? 15 : 6}
                    mapContainerStyle={{
                      height: '400px',
                      width: '100%',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}
                  >
                    {markerPosition && <Marker position={markerPosition} />}
                  </GoogleMap>
                </div>

                <div className="ticket-express-section-df" style={{ marginTop: '1rem' }}>
                  {pedidosEnCola > 0 ? (
                    <div className="ticket-express-info">
                      <p>You currently have  {pedidosEnCola} orders ahead of you</p>
                      <p><b>Want it faster? Get an Express Ticket.</b> 🚀</p>
                      <p><b>Price Right Now: {calcularCostoTicketExpress().toFixed(2)}€</b></p>
                    </div>
                  ) : (
                    <div className="ticket-express-info">
                      <p><b>Ticket Express Free right now.</b> 🚀</p>
                    </div>
                  )}
                </div>

                <label style={{ marginTop: '1rem', display: 'block' }}>
                  Delivery Time:
                  <select
                    value={deliveryTimeOption}
                    onChange={handleDeliveryTimeChange}
                    style={{ width: '100%' }}
                    className={missingFields.includes('deliveryTimeOption') ? 'input-error' : ''}
                  >
                    <option value="" disabled>Choose your time</option>
                    <option value="30min">30 min</option>
                    <option value="45min">45 min</option>
                    <option value="Express">Ticket Express ({calcularCostoTicketExpress().toFixed(2)}€)</option>
                    <option value="custom">Choose data and time</option>
                  </select>
                </label>

                {deliveryTimeOption === 'custom' && (
                  <div className="custom-time-fields">
                    <label>
                      Fecha de Entrega:
                      <input
                        type="date"
                        name="fecha"
                        value={customTime.fecha}
                        onChange={handleCustomTimeChange}
                        min={today}
                        style={{ width: '100%' }}
                      />
                    </label>
                    <label>
                      Hora de Entrega:
                      <input
                        type="time"
                        name="hora"
                        value={customTime.hora}
                        onChange={handleCustomTimeChange}
                        style={{ width: '100%' }}
                      />
                    </label>
                  </div>
                )}

                <label style={{ marginTop: '1rem', display: 'block' }}>
                  Name:
                  <input
                    type="text"
                    name="nombre"
                    value={pickupInfo.nombre}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                    style={{ width: '100%' }}
                  />
                </label>

                <label style={{ marginTop: '1rem', display: 'block' }}>
                  Phone Number::
                  <input
                    type="text"
                    name="telefono"
                    value={pickupInfo.telefono}
                    onChange={handleInputChange}
                    placeholder="Type your phone number"
                    style={{ width: '100%' }}
                  />
                </label>

                <label style={{ marginTop: '1rem', display: 'block' }}>
                  Notes (optional): 
                  <input
                    type="text"
                    name="observations"
                    value={addressInfo.observations}
                    onChange={(e) => setAddressInfo({ ...addressInfo, observations: e.target.value })}
                    placeholder="Notes (optional)"
                    style={{ width: '100%' }}
                  />
                </label>

                <button
                  className="save-button"
                  onClick={handleSaveDelivery}
                  style={{ marginTop: '1rem' }}
                >
                  Save
                </button>

                {error && <p className="error-message">{error}</p>}
              </div>
            </LoadScriptNext>
          )}
          <div className="save-delivery-section"></div>
        </div>
      )}
    </>
  ) : (
    <div className="form-success-message">
      <h2>✅ Ready to go!</h2>
      <p className="message-content">
        Just <strong>confirm & pay</strong>.<br />
        <span className="emoji">🧾🍕</span>
      </p>
    </div>
  )}
</>
  );
  


};

export default DeliveryForm;
