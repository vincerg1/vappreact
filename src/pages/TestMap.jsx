import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, LoadScriptNext } from "@react-google-maps/api";

const TestMap = () => {
  const googleMapsApiKey = 'AIzaSyAi1A8DDiBPGA_KQy2G47JVhFnt_QF0fN8';
  const [showMarkers, setShowMarkers] = useState(false);

  useEffect(() => {
    // Esperar un tiempo antes de mostrar los marcadores
    setTimeout(() => {
      setShowMarkers(true);
    }, 500); // Ajusta este valor si es necesario
  }, []);

  return (
    <LoadScriptNext googleMapsApiKey={googleMapsApiKey} libraries={['places']}>
      <GoogleMap
        center={{ lat: 42.342, lng: -7.852 }}
        zoom={13}
        mapContainerStyle={{ height: "400px", width: "100%" }}
      >
        {showMarkers && (
          <>
            <Marker position={{ lat: 42.342, lng: -7.852 }} />
            <Marker position={{ lat: 42.340, lng: -7.854 }} />
            <Marker position={{ lat: 42.345, lng: -7.850 }} />
          </>
        )}
      </GoogleMap>
    </LoadScriptNext>
  );
};

export default TestMap;
