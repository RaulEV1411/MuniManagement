import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import "../../styles/assignedProjects.css";


const defaultProjectIcon = 'https://via.placeholder.com/50';

const AssignedProjects = () => {
  const [projects, setProjects] = useState([]);

  return (
    <div className="assigned-projects-container">
      <h3>Assigned Projects</h3>
      <ul className="projects-list">
          <li className="project-item">
            <div className="project-card">
              <img src={defaultProjectIcon} alt="Project Icon" className="project-icon" />
              <div className="project-info">
                <h4>{"Prueba"}</h4>
                <p>{"descripcion de prueba"}</p>
                <p className="project-time">Today - {"12/07/2005"}</p>
              </div>
              <button className="project-arrow" onClick={() => navigateToProject(project.id)}>
                →
              </button>
            </div>
          </li>
      </ul>
    </div>
  );
};

export default AssignedProjects;

const navigateToProject = (id) => {
  window.location.href = `/projects/${id}`; 
};
