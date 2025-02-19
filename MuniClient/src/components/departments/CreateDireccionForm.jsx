import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { createDireccion, getDirecciones } from '../../services/api';
import '../../styles/common.css';

const CreateDireccionForm = () => {
  const [name, setName] = useState('');
  const [direcciones, setDirecciones] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchDirecciones = async () => {
      try {
        const data = await getDirecciones();
        setDirecciones(data);
      } catch (error) {
        console.error('Error al obtener las direcciones:', error);
      }
    };
    fetchDirecciones();
  }, [message]); // Recargar cuando cambia el mensaje

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await createDireccion({ name });
      Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: 'Dirección creada exitosamente',
      });
      setName('');
      setMessage('Dirección creada exitosamente');
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
        <h2 className='standard_title direction_text'>Crear Nueva Dirección</h2>
        <form className='standard_form_container' onSubmit={handleSubmit}>
          <div className='standard_input_container'>
            <label className='standard_input_label direction_text' htmlFor="name">Nombre de la Dirección:</label>
            <input
              className='standard_input direction_border'
              type="text"
              placeholder='Nombre de la dirección'
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button className='standard_button direction_btn' type="submit">Crear</button>
        </form>
        {message && <p>{message}</p>}
        
        <h3 className='standard_title direction_text'>Lista de Direcciones</h3>
        <ul className='standard_ul'>
          {direcciones.map((direccion) => (
            <li className='standard_li direction_li' key={direccion.direccion_ID}>
              <div className='standard_div_in_li'>
                <label>Nombre</label>
                <h4 className='standard_h4'>{direccion.name}</h4>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CreateDireccionForm;
