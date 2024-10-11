import React, { useState } from 'react';
import { createRole } from '../../services/api'; 
import "../../styles/common.css"

const CreateRoleForm = () => {
    const [roleName, setRoleName] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!roleName.trim()) {
            setError('El nombre del rol no puede estar vacío.');
            return;
        }

        try {
            const roleData = { name: roleName };
            await createRole(roleData);
            setSuccessMessage('Rol creado exitosamente.');
            setRoleName('');
        } catch (err) {
            setError('Hubo un error al crear el rol.');
        }
    };

    return (
        <div className='standard_container'>
            <div className='standard_div_container'>
                <h2 className='standard_title' >Crear Rol de Usuario</h2>
                <form className='standard_form_container' onSubmit={handleSubmit}>
                    <div className='standard_input_container'>
                        <label className='standard_input_label' htmlFor="roleName">Nombre del Rol:</label>
                        <input
                        className='standard_input'
                            type="text"
                            id="roleName"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            placeholder="Ingresa el nombre del rol"
                        />
                    </div>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
                    <button className='standard_button' type="submit">Crear Rol</button>
                </form>
            </div>
        </div>
    );
};

export default CreateRoleForm;
