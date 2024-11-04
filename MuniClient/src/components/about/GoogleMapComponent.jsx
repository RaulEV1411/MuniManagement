import React, { useState } from 'react';
import { GoogleMap, LoadScript, MarkerF } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

// Coordenadas exactas de la Municipalidad de Puntarenas
const puntarenasLocation = {
  lat: 9.976049,  // Latitud
  lng: -84.835748  // Longitud
};

const GoogleMapComponent = () => {
  // Estado para manejar la ubicación central del mapa
  const [center, setCenter] = useState(puntarenasLocation); // Inicializa con la ubicación de Puntarenas

  // Función para recentrar el mapa en Puntarenas
  const recenterMap = () => {
    setCenter(puntarenasLocation);
  };

  return (
    <div style={{ backgroundColor: "#ffffff", padding: "20px", minHeight: "400px" }}>
      <LoadScript googleMapsApiKey="AIzaSyB_hI98nI70LFDaonZ56y-aKMXlH8ZRyeE">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={15} // Zoom adecuado para ver la municipalidad
        >
          <MarkerF position={puntarenasLocation} />
        </GoogleMap>
      </LoadScript>
      <button onClick={recenterMap}>Recentrar en la Municipalidad de Puntarenas</button>
    </div>
  );
};

export default GoogleMapComponent;
