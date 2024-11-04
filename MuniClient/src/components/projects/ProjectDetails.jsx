import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../../styles/projectDetails.module.css';
import { getProyectoById, deleteProyecto, updateProyecto, getTareasByProjectID,getDirecciones } from '../../services/api';
import ProjectInformation from './ProjectInformation';
import CreateTareasForm from '../task/CreateTareasForm';
import TaskCardForProjectDetail from '../task/TaskCardForProjectDetail';
import Swal from 'sweetalert2';
import EditProjectForm from './EditProjectForm';

const departmentImages = {
  "Alcaldia": "https://www.gstatic.com/classroom/themes/img_code.jpg",
  "Marketing": "https://example.com/marketing.jpg",
  "Finanzas": "https://example.com/finanzas.jpg",
  // Añadir más nombres de direcciones y sus respectivas imágenes
};

const ProjectDetails = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [activeTab, setActiveTab] = useState('task');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [direcciones, setDirecciones] = useState({});

  useEffect(() => {
    const fetchDirecciones = async () => {
      try {
        const data = await getDirecciones(); // Llama a la función exportada
        const direccionesMap = data.reduce((acc, direccion) => {
          acc[direccion.direccion_ID] = direccion.name;
          return acc;
        }, {});
        setDirecciones(direccionesMap);
      } catch (error) {
        console.error("Error al obtener las direcciones:", error);
      }
    };

    fetchDirecciones();
  }, []);
  
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

  const fetchTareas = async () => {
    try {
      const data = await getTareasByProjectID(id);
      setTareas(data);
    } catch (error) {
      console.error('Error al obtener las tareas:', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTareas();
    }
  }, [id]);

  const handleBackClick = () => {
    navigate('/home');
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleDeleteProject = async () => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Estás seguro?',
      text: "¡Este proyecto se eliminará permanentemente!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (isConfirmed) {
      try {
        await deleteProyecto(id);
        Swal.fire('Eliminado!', 'El proyecto ha sido eliminado.', 'success');
        navigate('/home');
      } catch (error) {
        console.error('Error al eliminar el proyecto:', error);
        Swal.fire('Error!', 'No se pudo eliminar el proyecto.', 'error');
      }
    }
  };

  const handleUpdateProject = async (updatedProject) => {
    try {
      await updateProyecto(id, updatedProject);
      Swal.fire('Actualizado!', 'El proyecto ha sido actualizado.', 'success');
      setProject(updatedProject);
      handleCloseEditModal();
    } catch (error) {
      console.error('Error al actualizar el proyecto:', error);
      Swal.fire('Error!', 'No se pudo actualizar el proyecto.', 'error');
    }
  };

  const handleTaskCreated = async () => {
    setIsModalOpen(false);
    await fetchTareas();
  };
  




  if (!project || !tareas) {
    return <p>Cargando detalles del proyecto...</p>;
  }
  const departmentName = direcciones[project.departamento_ID?.direccion];
  const projectImage = project.project_photo || departmentImages[departmentName] || "https://gstatic.com/classroom/themes/Psychology.jpg";
  return (
    <div className={styles['container-project-details']}>
      <div className={styles['header-project-details']}>
        <div className={styles['header-image-container']}>
          <img
            src={projectImage}
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
        {activeTab === 'task' && (
          <div>
            <div className={styles['container_h2_addBTN_project_details']}>
              <h2 className={styles['titles_h2_project_details']}>Tareas del proyecto</h2>
              <button onClick={handleOpenModal} className={styles['add-task-btn-project']}>
                Agregar tarea
              </button>
            </div>

            <div className={styles['tasks-list']}>
              {tareas.length > 0 ? (
                tareas.map((tarea) => (
                  <div key={tarea.tareas_ID} className={styles['task-item']}>
                    <TaskCardForProjectDetail task={tarea} />
                  </div>
                ))
              ) : (
                <div className={styles['not-task-div']}>
                  <img src="/src/assets/library_add_16dp_333_FILL0_wght400_GRAD0_opsz20.png" alt="img_add_task" className={styles['not-task-img']} onClick={handleOpenModal} />
                  <h3>No hay tareas existentes</h3>
                </div>
              )}
            </div>

            {isModalOpen && (
              <div className={styles['modal-project-task']}>
                <div className={styles['modal-content-task']}>
                  <button onClick={handleCloseModal} className={styles['close-modal-task']}>X</button>
                  <CreateTareasForm ID_proyecto={project.proyect_ID} onTaskCreated={handleTaskCreated} />
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'information' && (
          <div>
            <h2 className={styles['titles_h2_project_details']}>Información del proyecto</h2>
            <ProjectInformation project={project} />
            <div className={styles['containere_edit_delete_project_details']}>
              <button onClick={handleOpenEditModal} className={styles['edit-project-btn']}>
                      Editar Proyecto
                    </button>

                    {/* Modal para editar el proyecto */}
                    {isEditModalOpen && (
                      <div className={styles['modal-edit-project']}>
                        <div className={styles['modal-content-edit']}>
                          <button onClick={handleCloseEditModal} className={styles['close-modal-edit']}>X</button>
                          <EditProjectForm project={project} onUpdate={handleUpdateProject} />
                        </div>
                      </div>
                    )}
                    {/* Botón de eliminar proyecto */}
              <div className={styles['delete-project-container']}>
                <button onClick={handleDeleteProject} className={styles['delete-project-btn']}>
                  Eliminar Proyecto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
