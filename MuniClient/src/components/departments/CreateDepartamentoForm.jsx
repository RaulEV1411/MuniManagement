import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
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
                    ? { ...d, editingName: d.name, editingDireccionId: d.direccion }
                    : d
            )
        );
    };

    console.log(departamentos);
    

    const handleUpdate = async (id) => {
        const departamentoToUpdate = departamentos.find((d) => d.departamentos_ID === id);
        const updatedDepartamento = {
            name: departamentoToUpdate.editingName || departamentoToUpdate.name,
            direccion: departamentoToUpdate.editingDireccionId || departamentoToUpdate.direccion_ID,
        };

        // SweetAlert para confirmar la actualización
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "¿Deseas actualizar este departamento?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, actualizar',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            try {
                await updateDepartamento(id, updatedDepartamento);
                setMessage('Departamento actualizado exitosamente');
                setEditingDepartamentoId(null);
            } catch (error) {
                setMessage('Error al actualizar el departamento');
            }
        }
    };

    const handleDelete = async (id) => {
        // SweetAlert para confirmar la eliminación
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "¿Deseas eliminar este departamento?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            try {
                await deleteDepartamento(id);
                setMessage('Departamento eliminado exitosamente');
            } catch (error) {
                setMessage('Error al eliminar el departamento');
            }
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
                            placeholder='Nombre del departamento'
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

                <h3 className='standard_title'>Lista de Departamentos</h3>
                <ul className='standard_ul'>
                    {departamentos.map((departamento) => (
                        <li className='standard_li' key={departamento.departamentos_ID}>
                            {editingDepartamentoId === departamento.departamentos_ID ? (
                                <>
                                    <div className='standard_div_in_li'>
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            placeholder='Nombre del departamento'
                                            className='standard_editInput'
                                            value={departamento.editingName || departamento.name}
                                            onChange={(e) =>
                                                handleEditInputChange(departamento.departamentos_ID, 'editingName', e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className='standard_div_in_li'>
                                        <label>Direccion</label>
                                        <select
                                            className='standard_editInput'
                                            value={departamento.editingDireccionId || departamento.direccion_ID}
                                            onChange={(e) =>
                                                handleEditInputChange(departamento.departamentos_ID, 'editingDireccionId', e.target.value)
                                            }
                                        >
                                            <option value="">-- Selecciona una Dirección --</option>
                                            {direcciones.map((direccion) => (
                                                <option key={direccion.direccion_ID} value={direccion.direccion_ID}>
                                                    {direccion.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <button onClick={() => handleUpdate(departamento.departamentos_ID)}>Guardar</button>
                                        <button onClick={() => setEditingDepartamentoId(null)}>Cancelar</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className='standard_div_in_li'>
                                        <label>Nombre</label>
                                        <h4 className='standard_h4'>{departamento.name}</h4>
                                    </div>
                                    <div className='standard_div_in_li'>
                                        <label>Direccion</label>
                                        <h4 className='standard_h4'>
                                            {direcciones.find(d => d.direccion_ID === departamento.direccion)?.name || 'Desconocida'}
                                        </h4>
                                    </div>
                                    <div>
                                        <svg onClick={() => handleEditClick(departamento)} xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#0C3958"><path d="M186.67-186.67H235L680-631l-48.33-48.33-445 444.33v48.33ZM120-120v-142l559.33-558.33q9.34-9 21.5-14 12.17-5 25.5-5 12.67 0 25 5 12.34 5 22 14.33L821-772q10 9.67 14.5 22t4.5 24.67q0 12.66-4.83 25.16-4.84 12.5-14.17 21.84L262-120H120Zm652.67-606-46-46 46 46Zm-117 71-24-24.33L680-631l-24.33-24Z"/></svg>
                                        <svg onClick={() => handleDelete(departamento.departamentos_ID)} xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#9E1D18"><path d="M267.33-120q-27.5 0-47.08-19.58-19.58-19.59-19.58-47.09V-740H160v-66.67h192V-840h256v33.33h192V-740h-40.67v553.33q0 27-19.83 46.84Q719.67-120 692.67-120H267.33Zm425.34-620H267.33v553.33h425.34V-740Zm-328 469.33h66.66v-386h-66.66v386Zm164 0h66.66v-386h-66.66v386ZM267.33-740v553.33V-740Z"/></svg>
                                    </div>
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
