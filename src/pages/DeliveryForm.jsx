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
        setIncentivos(incentivosActivos); // 🛠️ Guardamos los incentivos en el estado local
      } catch (error) {
        console.error('Error al obtener incentivos:', error);
      }
    };
    fetchIncentivos();
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
  const calcularPrecioDelivery = () => {

  
    let precioDelivery = 2;
  
    // Obtén la tienda más cercana en función de las coordenadas del cliente
    const tiendaMasCercana = calcularTiendaMasCercana(addressInfo.lat, addressInfo.lng);
    if (!tiendaMasCercana) {
      console.error('No se pudo calcular la tienda más cercana, cálculo de precio de delivery fallido.');
      return 0;
    }
  
    // Calcula la distancia entre la tienda más cercana y la dirección del cliente
    const distancia = calcularDistancia(addressInfo.lat, addressInfo.lng, tiendaMasCercana.lat, tiendaMasCercana.lng);
    console.log(`Distancia entre cliente y tienda más cercana: ${distancia} km`);
  
    // Cálculo del precio del delivery basado en la distancia
    if (distancia > 1) {
      precioDelivery += (distancia - 1) * 0.75;
    }
  
    // Incrementos por fin de semana y horario nocturno
    if (esFinDeSemana()) {
      precioDelivery += 0.5;
    }
  
    if (esDespuesDeLas23()) {
      precioDelivery += 0.5;
    }
  
    return parseFloat(precioDelivery.toFixed(2));
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

    const esProgramado = (nuevaTemporalidad === 'custom');
    let extraMinutes = 0;
    if (nuevaTemporalidad === '30min') extraMinutes = 30;
    else if (nuevaTemporalidad === '45min') extraMinutes = 45;
    else if (nuevaTemporalidad === 'Express') extraMinutes = 20;

    const horaPrometida = calcularHoraPrometida(extraMinutes);
    let costoDelivery = selectedOption === 'delivery' ? calcularPrecioDelivery() : 0;
    const costoTicketExpress = nuevaTemporalidad === 'Express' ? calcularCostoTicketExpress() : 0;

    // 🔥 Leer el estado actual del Free Pass para no perderlo
    const freePassActual = compra.Entrega?.Delivery?.freePassApplied ?? false;

    // 🔹 Evaluar si se debe aplicar el Free Pass
    const { newDeliveryCost, newFreePassApplied } = applyFreePassIfAny(
        compra,
        compra.total_a_pagar_con_descuentos || 0,
        incentivos
    );

    // 📌 Mantener el estado actual del Free Pass si ya estaba aplicado
    const freePassFinal = freePassActual || newFreePassApplied;

    // ✅ Si el Free Pass sigue activo, el Delivery debe ser 0
    if (freePassFinal) {
        costoDelivery = 0;
    }

    console.log("🔄 Estado final del Free Pass:", freePassFinal, "| Costo de Delivery:", costoDelivery);

    // 🚀 **Actualizar el estado de compra SIN perder `freePassApplied`**
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
                        fechaYHoraPrometida: esProgramado ,
                        costoTicketExpress: costoTicketExpress,
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
                        latitud: addressInfo.lat, // 🔹 Agregar coordenadas
                        longitud: addressInfo.lng, // 🔹 Agregar coordenadas
                        costo: costoDelivery,  // ✅ Aquí aplicamos el valor corregido
                        costoReal: calcularPrecioDelivery(),
                        TicketExpress: nuevaTemporalidad === 'Express',
                        fechaYHoraPrometida: esProgramado,
                        costoTicketExpress: costoTicketExpress,
                        tiendaSalida: storeLocation,
                        freePassApplied: freePassFinal,  
                    }
                },
            totalTicketExpress: costoTicketExpress,
            totalDelivery: costoDelivery,  
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

    setError(''); // Limpiar errores previos

    // Validación de datos básicos
    if (!pickupInfo.nombre || !pickupInfo.telefono || !deliveryTimeOption) {
        setError('Por favor completa todos los campos obligatorios.');
        return;
    }

    // Validación de dirección en caso de delivery
    if (selectedOption === 'delivery' && (!addressInfo.address || !addressInfo.lat || !addressInfo.lng || !isAddressConfirmed)) {
        setError('Confirma la dirección antes de continuar.');
        return;
    }

    // Obtener ID del cliente
    const idCliente = sessionData?.id_cliente;
    if (!idCliente) {
        setError('No se encontró un cliente en la sesión.');
        return;
    }

    // 🛠️ **Actualizar la información del cliente en la tabla `clientes` (solo si es `delivery`)**
    if (selectedOption === 'delivery') {
        const clienteData = {
            name: pickupInfo.nombre,
            phone: pickupInfo.telefono,
            address_1: addressInfo.address,
            lat: addressInfo.lat,
            lng: addressInfo.lng, // 🚀 **Asegurando que guardamos las coordenadas**
            observations: addressInfo.observations,
        };

        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/clientes/${idCliente}`, clienteData);
            console.log('✅ Cliente actualizado correctamente con coordenadas:', clienteData);
        } catch (error) {
            console.error('❌ Error al actualizar la dirección del cliente:', error);
            setError('Error al actualizar la dirección. Inténtalo de nuevo.');
            return;
        }
    }

    // Calcular tienda más cercana si es delivery
    let tiendaMasCercana = selectedOption === 'delivery' ? calcularTiendaMasCercana(addressInfo.lat, addressInfo.lng) : null;
    if (selectedOption === 'delivery' && !tiendaMasCercana) {
        setError('No se pudo encontrar una tienda cercana para el delivery.');
        return;
    }

    // Determinar la fecha y hora prometida
    let fechaYHoraPrometida = '';
    if (deliveryTimeOption === 'custom') {
        if (!customTime.fecha || !customTime.hora) {
            setError('Debes seleccionar una fecha y hora válida.');
            return;
        }
        fechaYHoraPrometida = `${customTime.fecha} ${customTime.hora}`;
    } else {
        const extraMinutes = deliveryTimeOption === '30min' ? 30 :
                             deliveryTimeOption === '45min' ? 45 :
                             deliveryTimeOption === 'Express' ? 20 : 0;
        fechaYHoraPrometida = calcularHoraPrometida(extraMinutes);
    }

    // Calcular costos adicionales
    const costoDelivery = (selectedOption === 'delivery' && isAddressConfirmed) ? calcularPrecioDelivery() : 0;
    const costoTicketExpress = (deliveryTimeOption === 'Express') ? calcularCostoTicketExpress() : 0;

    // Aplicar Free Pass si corresponde
    const { newDeliveryCost, newFreePassApplied } = applyFreePassIfAny(
        compra,
        incentivos
    );

    // Si ya tenía Free Pass activo, mantenerlo
    const freePassFinal = newFreePassApplied || (compra.Entrega?.Delivery?.freePassApplied ?? false);

    if (freePassFinal) {
        console.log("✅ Aplicando Free Pass: Delivery gratis");
    }

    // Actualizar el estado de compra
    setCompra((prevCompra) => ({
        ...prevCompra,
        is_scheduled_order: deliveryTimeOption === 'custom',
        Entrega: selectedOption === 'pickup'
            ? {
                PickUp: {
                    id_cliente: idCliente,
                    nombre: pickupInfo.nombre,
                    telefono: pickupInfo.telefono,
                    fechaYHoraPrometida,
                    TicketExpress: deliveryTimeOption === 'Express',
                    costoTicketExpress,
                    puntoRecogida: storeLocations.find(loc => loc.id === parseInt(selectedPickupLocation)) || null,
                }
            }
            : {
                Delivery: {
                    id_cliente: idCliente,
                    nombre: pickupInfo.nombre,
                    telefono: pickupInfo.telefono,
                    fechaYHoraPrometida,
                    address: addressInfo.address,
                    latitud: addressInfo.lat,  
                    longitud: addressInfo.lng,  
                    postalCode: addressInfo.postalCode,
                    costo: freePassFinal ? 0 : costoDelivery,  
                    costoReal: calcularPrecioDelivery(),
                    TicketExpress: deliveryTimeOption === 'Express',
                    costoTicketExpress,
                    tiendaSalida: tiendaMasCercana,
                    freePassApplied: freePassFinal
                }
            },
        totalTicketExpress: costoTicketExpress,
        totalDelivery: freePassFinal ? 0 : costoDelivery, // Aplicar Free Pass si corresponde
        cliente: {
            name: pickupInfo.nombre,
            phone: pickupInfo.telefono,
        },
        observaciones: selectedOption === 'pickup' ? pickupInfo.observations : addressInfo.observations
    }));

    console.log('✅ Estado de compra actualizado:', compra);

    // Disparar actualización visual
    setTriggerUpdate(prev => !prev);
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
    <div className="delivery-form-container">
      <h3 className="delivery-form-title">Condiciones de Entrega</h3>

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

      {selectedOption === 'pickup' && (
        <div className="pickup-fields">
          {/* Lista desplegable para seleccionar el punto de recogida */}
          <label>
            Punto de Recogida:
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

          {/* Mapa que muestra las ubicaciones */}
          <div className="map-container">
            <LoadScriptNext googleMapsApiKey={googleMapsApiKey} libraries={['places']}>
              <GoogleMap
                center={markerPosition || { lat: 42.33757, lng: -7.87055 }}
                zoom={selectedPickupLocation === 'all' ? 11 : mapZoom}
                mapContainerStyle={{ height: "400px", width: "100%" }}
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

          <div className="ticket-express-section">
            {(!selectedPickupLocation && selectedOption === 'pickup') || (!storeLocation && selectedOption === 'delivery') ? (
              <div className="ticket-express-info">
                <p>Selecciona tu punto de recogida o tienda para habilitar el cálculo del Ticket Express.</p>
              </div>
            ) : (
              pedidosEnCola > 0 ? (
                <div className="ticket-express-info">
                  <p>Actualmente tienes {pedidosEnCola} pedidos por delante.</p>
                  <p><b>Acelera tu pedido con un Ticket Express.</b> 🚀</p>
                  <p><b>Precio Actual: {calcularCostoTicketExpress().toFixed(2)}€</b></p>
                </div>
              ) : (
                <div className="ticket-express-info">
                  <p><b>Ticket Express Gratis en este momento.</b> 🚀</p>
                </div>
              )
            )}
          </div>


          <label>
            Tiempo de Entrega:
            <select
              value={deliveryTimeOption}
              onChange={handleDeliveryTimeChange}
              style={{ width: '100%' }}
              className={missingFields.includes('deliveryTimeOption') ? 'input-error' : ''}
            >
              <option value="" disabled>Selecciona un tiempo</option>
              <option value="30min">30 min</option>
              <option value="45min">45 min</option>
              <option value="Express">Ticket Express ({calcularCostoTicketExpress().toFixed(2)}€)</option>
              <option value="custom">Escoger fecha y hora</option>
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

          <label>
            Nombre:
            <input
              type="text"
              name="nombre"
              value={pickupInfo.nombre}
              onChange={handleInputChange}
              placeholder="Ingresa tu nombre"
              style={{ width: '100%' }}
              className={missingFields.includes('nombre') ? 'input-error' : ''}
            />
          </label>

          <label>
            Teléfono:
            <input
              type="text"
              name="telefono"
              value={pickupInfo.telefono}
              onChange={handleInputChange}
              placeholder="Ingresa tu teléfono"
              style={{ width: '100%' }}
              className={missingFields.includes('telefono') ? 'input-error' : ''}
            />
          </label>

          <label>
            Observaciones (opcional):
            <input
              type="text"
              name="observations"
              value={pickupInfo.observations}
              onChange={(e) => setPickupInfo({ ...pickupInfo, observations: e.target.value })}
              placeholder="Observaciones (opcional)"
              style={{ width: '100%' }}
            />
          </label>

          <button className="save-button" onClick={handleSaveDelivery}>
            Guardar
          </button>
        </div>
      )}

      {selectedOption === 'delivery' && loadGoogleMaps && (
        <LoadScriptNext googleMapsApiKey={googleMapsApiKey} libraries={['places']}>
          <div className="delivery-fields">
            <label>
              Dirección:
              {/* <Autocomplete
                onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                onPlaceChanged={handleAddressChange}
              > */}
                 <input
                type="text"
                placeholder="Dirección seleccionada"
                value={addressInfo.address}
                readOnly // Evita que el usuario escriba manualmente
                style={{ width: '100%', backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                className={missingFields.includes('address') ? 'input-error' : ''}
              />
              {/* </Autocomplete> */}
            </label>

            <div className="button-group">
              <button onClick={handleOpenModal} className="add-address-button">
                {addressInfo.address ? 'Cambiar Dirección' : 'Agregar Dirección'}
              </button>

              {!isAddressConfirmed ? (
                <button
                  className={`manual-address-button ${isAddressRequired ? 'button-error' : ''}`}
                  onClick={geocodeAddress}
                  style={{
                    backgroundColor: isAddressRequired ? 'red' : 'initial',
                    color: 'black',
                    border: '2px solid #ccc',
                    padding: '10px 15px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Confirmar Dirección
                </button>
              ) : (
                <div className="confirmed-message">
                  <p>¡Confirmación Exitosa!</p>
                </div>
              )}
            </div>

            {isModalOpen && (
              <AddressFormModal
              onClose={handleCloseModal}
              onSave={(direccion) => {
                handleSaveAddress(direccion); // Llamar a la función handleSaveAddress directamente
                setIsModalOpen(false); // Cerrar el modal después de guardar
              }}
            />
            )}

            <div className="map-container">
              <GoogleMap
                center={addressInfo.lat && addressInfo.lng ? { lat: addressInfo.lat, lng: addressInfo.lng } : { lat: 42.7550800, lng: -7.8662100 }}
                zoom={isAddressConfirmed ? 15 : 6}
                mapContainerStyle={{ height: '400px', width: '100%' }}
              >
                {console.log('Center Coordinates for Delivery:', addressInfo.lat && addressInfo.lng ? { lat: addressInfo.lat, lng: addressInfo.lng } : { lat: 42.7550800, lng: -7.8662100 })}
                {markerPosition && <Marker position={markerPosition} />}
              </GoogleMap>
            </div>

            <div className="ticket-express-section">
              {pedidosEnCola > 0 ? (
                <div className="ticket-express-info">
                  <p>Actualmente tienes {pedidosEnCola} pedidos por delante.</p>
                  <p><b>Acelera tu pedido con un Ticket Express.</b> 🚀</p>
                  <p><b>Precio Actual: {calcularCostoTicketExpress().toFixed(2)}€</b></p>
                </div>
              ) : (
                <div className="ticket-express-info">
                  <p><b>Ticket Express Gratis en este momento.</b> 🚀</p>
                </div>
              )}
            </div>

            <label>
              Tiempo de Entrega:
              <select
                value={deliveryTimeOption}
                onChange={handleDeliveryTimeChange}
                style={{ width: '100%' }}
                className={missingFields.includes('deliveryTimeOption') ? 'input-error' : ''}
              >
                <option value="" disabled>Selecciona un tiempo</option>
                <option value="30min">30 min</option>
                <option value="45min">45 min</option>
                <option value="Express">Ticket Express ({calcularCostoTicketExpress().toFixed(2)}€)</option>
                <option value="custom">Escoger fecha y hora</option>
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

            <label>
              Nombre:
              <input
                type="text"
                name="nombre"
                value={pickupInfo.nombre}
                onChange={handleInputChange}
                placeholder="Ingresa tu nombre"
                style={{ width: '100%' }}
              />
            </label>

            <label>
              Teléfono:
              <input
                type="text"
                name="telefono"
                value={pickupInfo.telefono}
                onChange={handleInputChange}
                placeholder="Ingresa tu teléfono"
                style={{ width: '100%' }}
              />
            </label>

            <label>
              Observaciones (opcional):
              <input
                type="text"
                name="observations"
                value={addressInfo.observations}
                onChange={(e) => setAddressInfo({ ...addressInfo, observations: e.target.value })}
                placeholder="Observaciones (opcional)"
                style={{ width: '100%' }}
              />
            </label>

            <button className="save-button" onClick={handleSaveDelivery}>
              Guardar
            </button>

            {error && <p className="error-message">{error}</p>}
          </div>
        </LoadScriptNext>
      )}
      <div className="save-delivery-section"></div>
    </div>
  );
};

export default DeliveryForm;
