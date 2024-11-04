import React, { useState, useEffect } from 'react';
import { createDireccion, deleteDireccion, updateDireccion, getDirecciones } from '../../services/api';
import '../../styles/common.css';

const CreateDireccionForm = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [direcciones, setDirecciones] = useState([]);
  const [editingDireccionId, setEditingDireccionId] = useState(null); // ID de la dirección en edición
  const [editingName, setEditingName] = useState(''); // Valor del nombre en edición

  useEffect(() => {
    const fetchDirecciones = async () => {
      try {
        const data = await getDirecciones();
        setDirecciones(data);
      } catch (error) {
        setMessage('Error al cargar las direcciones');
      }
    };

    fetchDirecciones();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const newDireccion = { name };

    try {
      const data = await createDireccion(newDireccion);
      setDirecciones([...direcciones, data]);
      setMessage('Dirección creada exitosamente');
      setName('');
    } catch (error) {
      setMessage('Error al crear la dirección');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDireccion(id);
      const updatedDirecciones = direcciones.filter((direccion) => direccion.direccion_ID !== id);
      setDirecciones(updatedDirecciones);
      setMessage('Dirección eliminada exitosamente');
    } catch (error) {
      setMessage('Error al eliminar la dirección');
    }
  };

  const handleEditChange = (event) => {
    setEditingName(event.target.value);
  };

  const handleEditClick = (direccion) => {
    setEditingDireccionId(direccion.direccion_ID);
    setEditingName(direccion.name);
  };

  const handleUpdate = async (id) => {
    try {
      const updatedDireccion = { name: editingName };
      const data = await updateDireccion(id, updatedDireccion);
      const updatedDirecciones = direcciones.map((direccion) =>
        direccion.direccion_ID === id ? data : direccion
      );
      setDirecciones(updatedDirecciones);
      setMessage('Dirección actualizada exitosamente');
      setEditingDireccionId(null); // Limpiar el estado de edición
    } catch (error) {
      setMessage('Error al actualizar la dirección');
    }
  };

  return (
    <div className='standard_container'>
      <div className='standard_div_container'>
        <h2 className='standard_title'>Crear Nueva Dirección</h2>
        <div className='card_container'>
          {direcciones.map((direccion) => (
            <div key={direccion.direccion_ID} className='standar_card'>
              {editingDireccionId === direccion.direccion_ID ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={handleEditChange}
                  className='edit_input'
                />
              ) : (
                <span>{direccion.name}</span>
              )}
              <button className='icon_edit_dire' onClick={() => handleEditClick(direccion)}>
                <img src="/src/assets/editar-texto.png" alt="Edit" className="icon_edit_dire" />
              </button>
              <button className='icon_delete_diteccion' onClick={() => handleDelete(direccion.direccion_ID)}>
                <img src="/src/assets/borrar.png" alt="Delete" className="icon_delete" />
              </button>
              {editingDireccionId === direccion.direccion_ID && (
                <button onClick={() => handleUpdate(direccion.direccion_ID)} className='update_button'>
                  Guardar
                </button>
              )}
            </div>
          ))}
        </div>
        <form className='standard_form_container' onSubmit={handleSubmit}>
          <div className='standard_input_container'>
            <label className='standard_input_label' htmlFor="name">Nombre de la Dirección:</label>
            <br />
            <input
              className='standard_input'
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <br />
          <button className='standard_button' type="submit">Crear</button>
        </form>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
};

export default CreateDireccionForm;
