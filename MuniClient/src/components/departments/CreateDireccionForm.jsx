import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { createDireccion } from '../../services/api';
import '../../styles/common.css';

const CreateDireccionForm = () => {
  const [name, setName] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    const newDireccion = {
      name: name,
    };

    try {
      const data = await createDireccion(newDireccion);
      Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: 'Dirección creada exitosamente',
      });
      setName(''); // Limpiar el campo después de crear la dirección
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al crear la dirección',
      });
    }
  };

  return (
    <div className='standard_container'>
      <div className='standard_div_container'>
        <h2 className='standard_title'>Crear Nueva Dirección</h2>
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
      </div>
    </div>
  );
};

export default CreateDireccionForm;
