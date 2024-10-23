import React from 'react';
import "../../styles/assignedProjects.css";

const defaultTaskIcon = 'https://via.placeholder.com/50';

function TaskCardForProjectDetail({ task }) {
  const navigateToTask = (id) => {
    window.location.href = `/tasks/${id}`;
  };

  return (
    <div className="assigned-projects-container">
      <ul className="projects-list">
        <li className="project-item">
          <div className="project-card">
            <img src={defaultTaskIcon} alt="Task Icon" className="project-icon" />
            <div className="project-info">
              <h4>{task.name || "Título de Tarea"}</h4>
              <p>{task.descripcion || "Descripción de la tarea"}</p>
              <p className="project-time">Hoy - {task.fecha_entrega || "Fecha límite no especificada"}</p>
            </div>
            <button className="project-arrow" onClick={() => navigateToTask(task.id)}>
              →
            </button>
          </div>
        </li>
      </ul>
    </div>
  );
}

export default TaskCardForProjectDetail;
