import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import "../../styles/projectDetails.css";
import { getProyectoById } from '../../services/api';

const ProjectDetails = () => {
  const { id } = useParams(); // Obtener el ID del proyecto desde los parámetros de la URL
  const [project, setProject] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await getProyectoById(id);
        setProject(data);
      } catch (error) {
        console.error('Error al obtener el proyecto:', error);
      }
    };

    fetchProject();
  }, [id]);

  // Función para manejar el clic en el botón de volver
  const handleBackClick = () => {
    navigate('/home'); // Redirigir a la lista de proyectos
  };

  if (!project) {
    return <p>Cargando detalles del proyecto...</p>;
  }

  return (
    <div className="container-project-details">
      <div className="header-project-details">
        <h1 className="title-project-details">{project.name}</h1>
        <h3 className="status-project-details">Estado: {project.estado_ID}</h3>
      </div>

      <div className="image-container-project-details">
        <img
          src={project.image || "https://via.placeholder.com/150"} // Añadir imagen si está disponible
          alt={project.name}
          className="image-project-details"
        />
      </div>

      <div className="info-project-details">
        <p className="description-project-details"><strong>Descripción:</strong> {project.descripcion}</p>
        <p className="priority-project-details"><strong>Prioridad:</strong> {project.prioridad_ID}</p>
        <p className="department-project-details"><strong>Departamento:</strong> {project.departamento_ID}</p>
        <p className="type-project-details"><strong>Tipo:</strong> {project.tipos_ID ? project.tipos_ID : 'N/A'}</p>
        <p className="date-start-project-details"><strong>Fecha de Inicio:</strong> {project.fecha_inicio}</p>
        <p className="date-end-project-details"><strong>Fecha de Entrega:</strong> {project.fecha_entrega}</p>
        <p className="cost-project-details"><strong>Costo:</strong> ${project.costo}</p>
      </div>

      <button className="button-back-project-details" onClick={handleBackClick}>
        Volver a Proyectos
      </button>
    </div>
  );
};

export default ProjectDetails;
