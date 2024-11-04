import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import "../../styles/assignedProjects.css";
import { deleteTask, updateTask } from '../../services/api';

const defaultTaskIcon = 'https://via.placeholder.com/50';

function TaskCardForProjectDetail({ task, onTaskDeleted, onTaskUpdated }) {
    const [isDeleted, setIsDeleted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editedTask, setEditedTask] = useState(task);

    const navigateToTask = (id) => {
        window.location.href = `/tasks/${id}`;
    };

    const handleDelete = async () => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Estás seguro?',
            text: "¡Esta tarea se eliminará permanentemente!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (isConfirmed) {
            try {
                await deleteTask(task.tareas_ID);
                setIsDeleted(true);
                onTaskDeleted(task.tareas_ID);
            } catch (error) {
                console.error('Error al eliminar la tarea:', error);
            }
        }
    };

    const openModal = () => {
        setEditedTask(task);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditedTask(task);
    };

    const handleSaveEdit = async () => {
        try {
            await updateTask(editedTask.tareas_ID, editedTask);
            setIsModalOpen(false);
            onTaskUpdated(editedTask);
        } catch (error) {
            console.error('Error al actualizar la tarea:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedTask((prevTask) => ({
            ...prevTask,
            [name]: value,
        }));
    };

    useEffect(() => {
        if (isDeleted) {
            const timer = setTimeout(() => {}, 500);
            return () => clearTimeout(timer);
        }
    }, [isDeleted]);

    if (isDeleted) return null;

    return (
        <div className="assigned-projects-container">
            <ul className="projects-list">
                <li className="project-item">
                    <div className="project-card">
                        <img src={task.task_photo || defaultTaskIcon} alt="Task Icon" className="project-icon" />
                        <div className="project-info">
                            <h4>{task.name || "Título de Tarea"}</h4>
                            <p>{task.descripcion || "Descripción de la tarea"}</p>
                            <p className="project-time">
                                Hoy - {task.fecha_entrega || "Fecha límite no especificada"}
                            </p>
                        </div>
                        <button className="delete-button_" onClick={openModal}>
                            <img src="/src/assets/editar-texto.png" alt="Edit" className="icon_delete" />
                        </button>
                        <button className="delete-button_" onClick={handleDelete}>
                            <img src="/src/assets/borrar.png" alt="Delete" className="icon_delete" />
                        </button>
                        <button className="project-arrow" onClick={() => navigateToTask(task.tareas_ID)}>
                            →
                        </button>
                    </div>
                </li>
            </ul>
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={closeModal}>X</button>
                        <h2>Actualizar Tarea</h2>
                        <input
                            type="text"
                            name="name"
                            value={editedTask.name}
                            onChange={handleInputChange}
                            placeholder="Título de Tarea"
                            className="modal-input"
                        />
                        <textarea
                            name="descripcion"
                            value={editedTask.descripcion}
                            onChange={handleInputChange}
                            placeholder="Descripción de la tarea"
                            className="modal-input"
                        />
                        <input
                            type="date"
                            name="fecha_entrega"
                            value={editedTask.fecha_entrega}
                            onChange={handleInputChange}
                            className="modal-date"
                        />
                        <button className="save-button" onClick={handleSaveEdit}>Guardar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskCardForProjectDetail;
