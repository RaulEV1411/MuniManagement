import React, { useState, useEffect } from 'react';
import "../../styles/cards.css";
import { useNavigate } from 'react-router-dom';
import { getDirecciones } from '../../services/api'; // Importar la función

// Definir las imágenes basadas en el nombre de la dirección
const departmentImages = {
  "Alcaldia": "https://www.gstatic.com/classroom/themes/img_code.jpg",
  "Marketing": "https://example.com/marketing.jpg",
  "Finanzas": "https://example.com/finanzas.jpg",
  // Añadir más nombres de direcciones y sus respectivas imágenes
};

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();
  const [direcciones, setDirecciones] = useState({});

  useEffect(() => {
    const fetchDirecciones = async () => {
      try {
        const data = await getDirecciones(); // Llama a la función exportada
        const direccionesMap = data.reduce((acc, direccion) => {
          acc[direccion.direccion_ID] = direccion.name;
          return acc;
        }, {});
        setDirecciones(direccionesMap);
      } catch (error) {
        console.error("Error al obtener las direcciones:", error);
      }
    };

    fetchDirecciones();
  }, []);

  const handleCardClick = () => {
    navigate(`/projects/${project.proyect_ID}`);
  };

  const departmentName = direcciones[project.departamento_ID?.direccion];
  const projectImage = project.project_photo || departmentImages[departmentName] || "https://gstatic.com/classroom/themes/Psychology.jpg";

  return (
    <div className="project-card-item-wrapper" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="project-card-header-section">
        <div className="project-card-profile-icon">👤 {project.user_ID.first_name} {project.user_ID.last_name}</div>
        <div className="project-card-menu-icon">⋮</div>
      </div>
      <div className="project-card-image-container">
        <img src={projectImage} alt={project.title} />
      </div>
      <div className="project-card-body-content">
        <h3 className="project-card-body-title h3_card_proyect">{project.name}</h3>
        <h5 className="project-card-body-status h5_card_proyect">{project.estado_ID.name}</h5>
        <p className="project-card-body-description">{project.descripcion}</p>
      </div>
    </div>
  );
};

export default ProjectCard;
