import React, { useState } from 'react';
import { createDireccion } from '../../services/api';

const CreateDireccionForm = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    const newDireccion = {
      name: name,
    };

    try {
      const data = await createDireccion(newDireccion);
      setMessage('Dirección creada exitosamente');
    } catch (error) {
      setMessage('Error al crear la dirección');
    }
  };

  return (
    <div>
      <h2>Crear Nueva Dirección</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Nombre de la Dirección:</label>
          <br />
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <br />
        <button type="submit">Crear</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default CreateDireccionForm;
