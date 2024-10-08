import React, { useState, useEffect } from 'react';
import { createDepartamento, getDirecciones } from '../../services/api'; // Importar las llamadas a la API

const CreateDepartamentoForm = () => {
    const [name, setName] = useState('');
    const [direccionId, setDireccionId] = useState('');
    const [direcciones, setDirecciones] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchDirecciones = async () => {
            try {
                const data = await getDirecciones();
                setDirecciones(data); 
            } catch (error) {
                console.error('Error al obtener direcciones:', error);
            }
        };

        fetchDirecciones();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();

        const newDepartamento = {
            name: name,
            direccion: direccionId, // Asignar la dirección seleccionada
        };

        try {
            await createDepartamento(newDepartamento); // Enviar el nuevo departamento al API
            setMessage('Departamento creado exitosamente');
        } catch (error) {
            setMessage('Error al crear el departamento');
        }
    };

    return (
        <div className='standard_div_container'>
            <h2 className='standard_title'>Crear Nuevo Departamento</h2>
            <form className='standard_form_container' onSubmit={handleSubmit}>
                <div className='standard_input_container'>
                    <label className='standard_input_label' htmlFor="name">Nombre del Departamento:</label>
                    <input
                        className='standard_input'
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className='standard_input_container'>
                    <label className='standard_input_label' htmlFor="direccion">Selecciona una Dirección:</label>
                    <select
                        className='standard_input'
                        id="direccion"
                        value={direccionId}
                        onChange={(e) => setDireccionId(e.target.value)}
                        required
                    >
                        <option value="">-- Selecciona una Dirección --</option>
                        {direcciones.map((direccion) => (
                            <option key={direccion.direccion_ID} value={direccion.direccion_ID}>
                                {direccion.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button className='standard_button' type="submit">Crear</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default CreateDepartamentoForm;
