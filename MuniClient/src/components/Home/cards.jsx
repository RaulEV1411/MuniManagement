import React from 'react';
import "../../styles/cards.css";
import { useNavigate } from 'react-router-dom';

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/projects/${project.proyect_ID}`);
  };

  return (
    <div className="project-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="card-header">
        <div className="profile-icon">👤</div>
        <div className="menu-icon">⋮</div>
      </div>
      <div className="card-image">
        <img src={project.image} alt={project.title} />
      </div>
      <div className="card-body">
        <h3 className='h3_card_proyect'>{project.name}</h3>
        <h5 className='h5_card_proyect'>{project.estado_ID}</h5>
        <p>{project.descripcion}</p>
      </div>
    </div>
  );
};

export default ProjectCard;
