import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../../styles/projectDetails.module.css'; // Importación de CSS Module
import { getProyectoById, deleteProyecto, updateProyecto,getTareasByProjectID } from '../../services/api'; // Importa la nueva función de actualizar
import ProjectInformation from './ProjectInformation';
import CreateTareasForm from '../task/CreateTareasForm';
import TaskCardForProjectDetail from '../task/TaskCardForProjectDetail'

const ProjectDetails = () => {
  const { id } = useParams(); // Obtener el ID del proyecto desde los parámetros de la URL
  const [project, setProject] = useState(null);
  const [tareas, setTareas] = useState([]); // Estado para almacenar las tareas del proyecto
  const [activeTab, setActiveTab] = useState('task'); // Estado para controlar la pestaña activa
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado para controlar el modal
  
  const navigate = useNavigate();

  // Obtener los detalles del proyecto
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

  // Obtener las tareas del proyecto
  useEffect(() => {
    const fetchTareas = async () => {
      try {
        const data = await getTareasByProjectID(id); // Aquí llamamos a la API para obtener las tareas
        setTareas(data);
        console.log("tareas",data);
        
      } catch (error) {
        console.error('Error al obtener las tareas:', error);
      }
    };

    if (id) {
      fetchTareas();
    }
  }, [id]);

  // Función para manejar el clic en el botón de volver
  const handleBackClick = () => {
    navigate('/home'); // Redirigir a la lista de proyectos
  };

  // Función para cambiar de pestaña
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  // Función para abrir el modal
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (!project || !tareas) {
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
            <h2 className={styles['titles_h2_project_details']}>Tareas del proyecto</h2>
            <button onClick={handleOpenModal} className={styles['.add-task-btn-project']}>
              Agregar tarea
            </button>

            {/* Mostrar las tareas */}
            <div className={styles['tasks-list']}>
              {
                tareas.map((tarea) => (
                  <div key={tarea.tareas_ID} className={styles['task-item']}>
                      <TaskCardForProjectDetail task={tarea}/>
                  </div>
                ))
              }
            </div>

            {/* Modal */}
            {isModalOpen && (
              <div className={styles['modal-project-task']}>
                <div className={styles['modal-content-task']}>
                  <button onClick={handleCloseModal} className={styles['close-modal-task']}>X</button>
                  <CreateTareasForm ID_proyecto={project.proyect_ID} />
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'information' && (
          <div>
            <h2 className={styles['titles_h2_project_details']}>Información del proyecto</h2>
            <ProjectInformation project={project} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
