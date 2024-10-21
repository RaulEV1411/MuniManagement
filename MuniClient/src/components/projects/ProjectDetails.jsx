import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../../styles/projectDetails.module.css'; // Importación de CSS Module
import { getProyectoById, deleteProyecto, updateProyecto } from '../../services/api'; // Importa la nueva función de actualizar
import ProjectInformation from './ProjectInformation';
import CreateTareasForm from '../task/CreateTareasForm';
import Swal from 'sweetalert2'; // Importar SweetAlert2
import EditProjectForm from './EditProjectForm'; // Asegúrate de crear este componente

const ProjectDetails = () => {
  const { id } = useParams(); // Obtener el ID del proyecto desde los parámetros de la URL
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('task'); // Estado para controlar la pestaña activa
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado para controlar el modal de tarea
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Estado para controlar el modal de editar
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

  // Función para cambiar de pestaña
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  // Función para abrir el modal de tarea
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // Función para cerrar el modal de tarea
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Función para abrir el modal de editar
  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  // Función para cerrar el modal de editar
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  // Función para manejar la eliminación del proyecto
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
        navigate('/home'); // Redirigir a la lista de proyectos después de eliminar
      } catch (error) {
        console.error('Error al eliminar el proyecto:', error);
        Swal.fire('Error!', 'No se pudo eliminar el proyecto.', 'error');
      }
    }
  };

  // Función para manejar la actualización del proyecto
  const handleUpdateProject = async (updatedProject) => {
    try {
      await updateProyecto(id, updatedProject);
      Swal.fire('Actualizado!', 'El proyecto ha sido actualizado.', 'success');
      setProject(updatedProject); // Actualizar el estado del proyecto con los nuevos datos
      handleCloseEditModal(); // Cerrar el modal
    } catch (error) {
      console.error('Error al actualizar el proyecto:', error);
      Swal.fire('Error!', 'No se pudo actualizar el proyecto.', 'error');
    }
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
        {/* Renderizado condicional basado en la pestaña activa */}
        {activeTab === 'task' && (
          <div>
            <h2>Tareas del proyecto</h2>
            <p>Aquí se mostrarán las tareas relacionadas con el proyecto.</p>
            <button onClick={handleOpenModal} className={styles['add-task-btn-project']}>
              Agregar tarea
            </button>

            {/* Modal para agregar tareas */}
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
            <h2>Información del proyecto</h2>
            <ProjectInformation project={project} />
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
          </div>
        )}
      </div>

      {/* Botón de eliminar proyecto */}
      <div className={styles['delete-project-container']}>
        <button onClick={handleDeleteProject} className={styles['delete-project-btn']}>
          Eliminar Proyecto
        </button>
      </div>
    </div>
  );
};

export default ProjectDetails;
