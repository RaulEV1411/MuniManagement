import React from 'react';
import "../../styles/cards.css";
import { useNavigate } from 'react-router-dom';

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/projects/${project.proyect_ID}`);
  };

  return (
    <div className="project-card-item-wrapper" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="project-card-header-section">
        <div className="project-card-profile-icon">👤</div>
        <div className="project-card-menu-icon">⋮</div>
      </div>
      <div className="project-card-image-container">
        <img src={project.image} alt={project.title} />
      </div>
      <div className="project-card-body-content">
        <h3 className="project-card-body-title">{project.name}</h3>
        <h5 className="project-card-body-status">{project.estado_ID.name}</h5>
        <p className="project-card-body-description">{project.descripcion}</p>
      </div>
    </div>
  );
};

export default ProjectCard;
