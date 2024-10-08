import React from 'react';
import '../../styles/About.css'; // Importar el archivo de estilos

const About = () => {
  return (
    <div className="about-container">
      <h1 className="about-title">About Us</h1>
      <p className="about-text">
        Welcome to our project management platform. Our goal is to provide a seamless experience 
        for managing municipal projects efficiently. We aim to help teams collaborate, track 
        progress, and meet deadlines with ease. Our platform includes features like real-time 
        monitoring, task assignment, and automated alerts, designed to enhance productivity.
      </p>
      <p className="about-text">
        Our team is committed to continuous improvement and innovation. We believe in the power 
        of technology to streamline processes and improve outcomes for municipalities and their 
        constituents.
      </p>
    </div>
  );
};

export default About;
