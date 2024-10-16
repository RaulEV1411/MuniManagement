import React, { useState } from 'react';
import "../../styles/about.css"; 

const Card = ({ title, description, imageUrl, onClick }) => (
  <div className="card" onClick={onClick}>
    <img src={imageUrl} alt={title} className="card-image" />
    <div className="card-content">
      <h2 className="card-title">{title}</h2>
      <p className="card-description">{description}</p>
    </div>
  </div>
);

const MunicipalityCards = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const cardsData = [
    {
      title: "Alcalde Municipal",
      description: "Señor Randall Chavarría Matarrita. Funcionario ejecutivo según el artículo 169 de la Constitución Política.",
      imageUrl: "https://guananoticias.com/wp-content/uploads/2024/02/puerto.jpg"
    },
    {
      title: "Concejo Municipal",
      description: "Es compuesto por un cuerpo deliberativo e integrado por los regidores que determine la ley, el alcalde y su respectivos suplente.",
      imageUrl: "https://scontent.fsyq3-1.fna.fbcdn.net/v/t39.30808-6/323448363_1142178006443698_3038655558962419568_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=B5OTROLd2gUQ7kNvgEj9Ml8&_nc_ht=scontent.fsyq3-1.fna&_nc_gid=AAa-SLs14Q3d6LA2L7m9g9p&oh=00_AYCPlnC_PlfkbRfcey-g-KG5iQ6JPX4M92y4FfDjEUN1Hw&oe=670DCB67"
    },
    {
      title: "Organigrama",
      description: "Mapa de la Estructura Organizacional",
      imageUrl: "https://i0.wp.com/amprensa.com/wp-content/uploads/2024/03/Municipalidad-de-Puntarenas.jpg?fit=1200%2C628&ssl=1?v=1710612095",
      onClick: openModal // Solo esta card abre el modal
    }
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", padding: "20px", minHeight: "100vh" }}>
      <div className="municipality-cards">
        {cardsData.map((card, index) => (
          <Card key={index} {...card} />
        ))}
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-button" onClick={closeModal}>&times;</span>
            {/* Imagen diferente en el modal, cargada desde assets */}
            <img src="src/assets/Captura de pantalla 2024-10-11 084659.png" alt="Organigrama Detallado" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MunicipalityCards;
