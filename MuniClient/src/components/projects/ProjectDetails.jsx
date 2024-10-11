import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../../styles/projectDetails.module.css'; // Importación de CSS Module
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
            <p className={styles['subtitle-project-details']}>Subtítulo o descripción breve</p>
            <div className={styles['header-buttons']}>
              <button className={styles['btn-itinerary']}>Add to my Itinerary</button>
              <button className={styles['btn-location']}>12 mins from hotel</button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles['tabs-container']}>
        <button className={`${styles['tab-btn']} ${styles['active']}`}>Task</button>
        <button className={styles['tab-btn']}>Information</button>
      </div>

      <div className={styles['info-project-details']}>
        {/* Aquí iría la información del proyecto */}
      </div>
    </div>
  );
};

export default ProjectDetails;
