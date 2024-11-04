import React, { useState, useEffect } from 'react';
import { createDepartamento, getDirecciones, getDepartamentos, updateDepartamento, deleteDepartamento } from '../../services/api';

const CreateDepartamentoForm = () => {
    const [name, setName] = useState('');
    const [direccionId, setDireccionId] = useState('');
    const [direcciones, setDirecciones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [editingDepartamentoId, setEditingDepartamentoId] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Función para cargar direcciones y departamentos al cargar el componente o tras cambios
        const fetchData = async () => {
            try {
                const [direccionesData, departamentosData] = await Promise.all([getDirecciones(), getDepartamentos()]);
                setDirecciones(direccionesData);
                setDepartamentos(departamentosData);
            } catch (error) {
                console.error('Error al obtener datos:', error);
            }
        };
        fetchData();
    }, [message]); // Recargar datos si el mensaje cambia

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            await createDepartamento({ name, direccion: direccionId });
            setMessage('Departamento creado exitosamente');
            setName('');
            setDireccionId('');
        } catch (error) {
            setMessage('Error al crear el departamento');
        }
    };

    const handleEditClick = (departamento) => {
        setEditingDepartamentoId(departamento.departamentos_ID);
        setDepartamentos((prev) =>
            prev.map((d) =>
                d.departamentos_ID === departamento.departamentos_ID
                    ? { ...d, editingName: d.name, editingDireccionId: d.direccion}
                    : d
            )
        );
    };

    const handleUpdate = async (id) => {
        const departamentoToUpdate = departamentos.find((d) => d.departamentos_ID === id);
        const updatedDepartamento = {
            name: departamentoToUpdate.editingName || departamentoToUpdate.name,
            direccion: departamentoToUpdate.editingDireccionId || departamentoToUpdate.direccion_ID,
        };

        try {
            await updateDepartamento(id, updatedDepartamento);
            setMessage('Departamento actualizado exitosamente');
            setEditingDepartamentoId(null);
        } catch (error) {
            setMessage('Error al actualizar el departamento');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDepartamento(id);
            setMessage('Departamento eliminado exitosamente');
        } catch (error) {
            setMessage('Error al eliminar el departamento');
        }
    };

    const handleEditInputChange = (id, field, value) => {
        setDepartamentos((prev) =>
            prev.map((d) =>
                d.departamentos_ID === id ? { ...d, [field]: value } : d
            )
        );
    };

    return (
        <div className='standard_container'>
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
                                <option key={direccion.direccion} value={direccion.direccion}>
                                    {direccion.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button className='standard_button' type="submit">Crear</button>
                </form>
                {message && <p>{message}</p>}

                <h3 className='standard_title'>Lista de Departamentos</h3>
                <ul>
                    {departamentos.map((departamento) => (
                        <li key={departamento.departamentos_ID}>
                            {editingDepartamentoId === departamento.departamentos_ID ? (
                                <>
                                    <input
                                        type="text"
                                        value={departamento.editingName || departamento.name}
                                        onChange={(e) =>
                                            handleEditInputChange(departamento.departamentos_ID, 'editingName', e.target.value)
                                        }
                                    />
                                    <select
                                        value={departamento.editingDireccionId || departamento.direccion_ID}
                                        onChange={(e) =>
                                            handleEditInputChange(departamento.departamentos_ID, 'editingDireccionId', e.target.value)
                                        }
                                    >
                                        <option value="">-- Selecciona una Dirección --</option>
                                        {direcciones.map((direccion) => (
                                            <option key={direccion.direccion} value={direccion.direccion}>
                                                {direccion.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button onClick={() => handleUpdate(departamento.departamentos_ID)}>Guardar</button>
                                    <button onClick={() => setEditingDepartamentoId(null)}>Cancelar</button>
                                </>
                            ) : (
                                <>
                                    {departamento.name} - {departamento.direccion_name}
                                    <button onClick={() => handleEditClick(departamento)}>Editar</button>
                                    <button onClick={() => handleDelete(departamento.departamentos_ID)}>Eliminar</button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default CreateDepartamentoForm;
