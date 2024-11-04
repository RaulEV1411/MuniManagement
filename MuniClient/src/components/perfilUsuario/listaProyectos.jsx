import React, { useState, useEffect } from 'react';
import {jwtDecode} from "jwt-decode";
import { getProyectosByUserID } from '../../services/api';
import { getCookie } from '../../services/read_cookie';
import "../../styles/assignedProjects.css";

const defaultProjectIcon = 'https://via.placeholder.com/50';

const AssignedProjects = () => {
  const [projects, setProjects] = useState([]);
  
  // Obtener el token desde la cookie
  const token = getCookie('accessToken');
  const decoded = token ? jwtDecode(token) : null;
  
  const user_ID = decoded?.user_ID;

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (user_ID) {
          const projectsData = await getProyectosByUserID(user_ID);
          setProjects(projectsData);
        }
      } catch (error) {
        console.error("Error al obtener los proyectos asignados:", error);
      }
    };

    fetchProjects();
  }, [user_ID]);

  const navigateToProject = (id) => {
    window.location.href = `/projects/${id}`;
  };

  return (
    <div className="assigned-projects-container">
      <h3>Assigned Projects</h3>
      <ul className="projects-list">
        {projects.map((project) => (
          <li className="project-item" key={project.id}>
            <div className="project-card">
              <img src={defaultProjectIcon} alt="Project Icon" className="project-icon" />
              <div className="project-info">
                <h4>{project.nombre}</h4>
                <p>{project.descripcion}</p>
                <p className="project-time">Today - {project.fecha}</p>
              </div>
              <button className="project-arrow" onClick={() => navigateToProject(project.id)}>
                →
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AssignedProjects;
