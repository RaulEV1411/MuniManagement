import React, { useState } from 'react';
import "../../styles/EditProjectForm.css";

const EditProjectForm = ({ project, onUpdate }) => {
  const [updatedProject, setUpdatedProject] = useState({ ...project });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedProject({ ...updatedProject, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(updatedProject); // Llama a la función de actualización
  };

  return (
    <div className="EditProjectForm_modal">
      <form onSubmit={handleSubmit} className="EditProjectForm">
        <label className="EditProjectForm_label">
          Nombre:
          <input 
            type="text" 
            name="name" 
            value={updatedProject.name} 
            onChange={handleChange} 
            className="EditProjectForm_input" 
          />
        </label>
        <label className="EditProjectForm_label">
          Descripción:
          <input 
            type="text" 
            name="descripcion" 
            value={updatedProject.descripcion} 
            onChange={handleChange} 
            className="EditProjectForm_input" 
          />
        </label>
        <label className="EditProjectForm_label">
          Prioridad:
          <input 
            type="text" 
            name="prioridad_ID" 
            value={updatedProject.prioridad_ID.name} 
            onChange={handleChange} 
            className="EditProjectForm_input" 
          />
        </label>
        <label className="EditProjectForm_label">
          Estado:
          <input 
            type="text" 
            name="estado_ID" 
            value={updatedProject.estado_ID.name} 
            onChange={handleChange} 
            className="EditProjectForm_input" 
          />
        </label>
        {/* Agrega otros campos según sea necesario */}
        <button type="submit" className="EditProjectForm_button">Actualizar Proyecto</button>
      </form>
    </div>
  );
};

export default EditProjectForm;
