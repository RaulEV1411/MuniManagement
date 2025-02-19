import React, { useState, useEffect } from 'react';
import { getProyectosByUserID } from '../../services/api';
import { useParams,useNavigate } from 'react-router-dom';
import "../../styles/assignedProjects.css";

const defaultProjectIcon = 'https://via.placeholder.com/50';

const AssignedProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true); // Estado de carga
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (id) {
          const projectsData = await getProyectosByUserID(id);
          setProjects(projectsData);
        }
      } catch (error) {
        console.error("Error al obtener los proyectos asignados:", error);
      } finally {
        setLoading(false); // Finaliza la carga, ya sea éxito o error
      }
    };

    fetchProjects();
  }, [id]);


  return (
    <div className="assigned-projects-container">

      {/* Mostrar loader mientras carga */}
      {loading ? (
        <div className="loader">Cargando proyectos...</div>
      ) : (
        <ul className="projects-list">
          {projects.length > 0 ? (
            projects.map((project) => (
              <li className="project-item" key={project.proyect_ID}>
                <div className="project-card">
                  <img src={project?.project_photo} alt="Project Icon" className="project-icon" />
                  <div className="project-info">
                    <h4>{project.nombre}</h4>
                    <p>{project.descripcion}</p>
                    <p className="project-time">Today - {project.fecha}</p>
                  </div>
                  <button className="project-arrow" onClick={() => navigate(`/projects/${project.proyect_ID}`)}>
                    →
                  </button>
                </div>
              </li>
            ))
          ) : (
            <div className="no-projects"><h2 className='h2-no-projects-project-list'>No tienes proyectos asignados.</h2></div>
          )}
        </ul>
      )}
    </div>
  );
};

export default AssignedProjects;
