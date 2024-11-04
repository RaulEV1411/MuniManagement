import React, { useState } from 'react';
import { createDireccion } from '../../services/api';
import '../../styles/common.css';

const CreateDireccionForm = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [direcciones, setDirecciones] = useState([]); // Estado para almacenar direcciones

  const handleSubmit = async (event) => {
    event.preventDefault();

    const newDireccion = {
      name: name,
    };

    try {
      const data = await createDireccion(newDireccion);
      setDirecciones([...direcciones, data]); // Agregar nueva dirección al estado
      setMessage('Dirección creada exitosamente');
      setName(''); // Limpiar el input después de crear
    } catch (error) {
      setMessage('Error al crear la dirección');
    }
  };

  // Función para eliminar una dirección
  const handleDelete = (id) => {
    const updatedDirecciones = direcciones.filter((direccion) => direccion.id !== id);
    setDirecciones(updatedDirecciones);
    setMessage('Dirección eliminada exitosamente');
  };

  return (
    <div className='standard_container'>
      <div className='standard_div_container'>
        <h2 className='standard_title'>Crear Nueva Dirección</h2>
        {/* Sección para mostrar direcciones */}
        <div className='card_container'>
          {direcciones.map((direccion) => (
            <div key={direccion.id} className='card'>
              <span>{direccion.name}</span>
              <button className='standard_button' onClick={() => handleDelete(direccion.id)}>
                <img src="/src/assets/borrar.png" alt="Delete" className="icon_delete" /> {/* Imagen de eliminar */}
              </button>
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
