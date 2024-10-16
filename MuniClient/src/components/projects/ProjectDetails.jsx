import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../../styles/projectDetails.module.css'; // Importación de CSS Module
import { getProyectoById } from '../../services/api';
import ProjectInformation from './ProjectInformation';

const ProjectDetails = () => {
  const { id } = useParams(); // Obtener el ID del proyecto desde los parámetros de la URL
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('task'); // Estado para controlar la pestaña activa
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

  // Función para cambiar de pestaña
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className={styles['container-project-details']}>
      <div className={styles['header-project-details']}>
        <div className={styles['header-image-container']}>
          <img
            src={project.image || "https://via.placeholder.com/150"}
            alt={project.name}
            className={styles['header-background-image']}
          />
          <div className={styles['header-content']}>
            <h1 className={styles['title-project-details']}>{project.name}</h1>
            <div className={styles['header-buttons']}>
              <p className={styles['btn-location']}>Prioridad: {project.prioridad_ID.name}</p>
              <p className={styles['btn-itinerary']}>Estado: {project.estado_ID.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles['tabs-container']}>
        {/* Botones para cambiar de pestaña */}
        <button
          className={`${styles['tab-btn']} ${activeTab === 'task' ? styles['active'] : ''}`}
          onClick={() => handleTabClick('task')}
        >
          Task
        </button>
        <button
          className={`${styles['tab-btn']} ${activeTab === 'information' ? styles['active'] : ''}`}
          onClick={() => handleTabClick('information')}
        >
          Information
        </button>
      </div>

      <div className={styles['info-project-details']}>
        {/* Renderizado condicional basado en la pestaña activa */}
        {activeTab === 'task' && (
          <div>
            <h2>Tareas del proyecto</h2>
            <p>Aquí se mostrarán las tareas relacionadas con el proyecto.</p>
            {/* Contenido específico de Task */}
          </div>
        )}
        {activeTab === 'information' && (
          <div>
            <h2>Información del proyecto</h2>
            <ProjectInformation project={project} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
