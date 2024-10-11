import React from 'react';
import GoogleMapComponent from './GoogleMapComponent';
import "../../styles/map.css";

const Map = () => {
  return (
    <div className="about-page">
      <h1 className="about-title">About Us</h1>
      <p className="about-description">
        Aquí puedes encontrar la ubicación de nuestras oficinas:
      </p>
      <GoogleMapComponent />
    </div>
  );
};

export default Map;
