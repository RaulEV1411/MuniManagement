import React, { useState } from 'react';
import { createRole } from '../../services/api'; 

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
        <div>
            <h2>Crear Rol de Usuario</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="roleName">Nombre del Rol:</label>
                    <input
                        type="text"
                        id="roleName"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        placeholder="Ingresa el nombre del rol"
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
                <button type="submit">Crear Rol</button>
            </form>
        </div>
    );
};

export default CreateRoleForm;
