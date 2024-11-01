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
        <div className="project-card-profile-icon">👤 {project.user_ID.first_name} {project.user_ID.last_name}</div>
        <div className="project-card-menu-icon">⋮</div>
      </div>
      <div className="project-card-image-container">
        <img src={project?.image || "https://gstatic.com/classroom/themes/Psychology.jpg"} alt={project.title} />
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
