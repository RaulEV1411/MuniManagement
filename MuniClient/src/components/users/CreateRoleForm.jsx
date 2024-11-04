import React, { useState, useEffect } from 'react'; 
import Swal from 'sweetalert2';
import { createRole, getRoles, deleteRole, updateRole } from '../../services/api'; 
import '../../styles/rol.css';

const CreateRoleForm = () => { 
    const [roleName, setRoleName] = useState(''); 
    const [roles, setRoles] = useState([]); 
    const [editRoleId, setEditRoleId] = useState(null); 
    const [editRoleName, setEditRoleName] = useState('');

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const rolesData = await getRoles();
            setRoles(rolesData);
        } catch (err) {
            console.error('Error al obtener roles:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!roleName.trim()) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'El nombre del rol no puede estar vacío.'
            });
            return;
        }

        try {
            const roleData = { name: roleName };
            await createRole(roleData);
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Rol creado exitosamente.'
            });
            setRoleName('');
            await fetchRoles();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un error al crear el rol.'
            });
        }
    };

    const handleDelete = async (roleId) => {
        console.log(roleId);
        
        try {
            await deleteRole(roleId);
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Rol eliminado exitosamente.'
            });
            await fetchRoles();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un error al eliminar el rol.'
            });
        }
    };

    const handleEdit = async (role) => {
        console.log(role);
        
        if (editRoleId === role.role_ID) {
            // Actualiza el rol si el ID coincide
            if (!editRoleName.trim()) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'El nombre del rol no puede estar vacío.'
                });
                return;
            }

            try {
                await updateRole(role.role_ID, { name: editRoleName });
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Rol actualizado exitosamente.'
                });
                setEditRoleId(null);
                setEditRoleName('');
                await fetchRoles(); // Actualiza la lista de roles
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Hubo un error al actualizar el rol.'
                });
            }
        } else {
            // Establece el rol a editar
            setEditRoleId(role.role_ID);
            setEditRoleName(role.name);
        }
    };

    return (
        <div className='standard_container'>
            <div className='standard_div_container'>
                <h2 className='standard_title'>Crear Rol de Usuario</h2>
                <div className='roles_list_container'>
                    {roles.map((role) => (
                        <div key={role.id} className='role_card'>
                            {editRoleId === role.role_ID ? (
                                <input
                                    className='standard_input'
                                    type="text"
                                    value={editRoleName}
                                    onChange={(e) => setEditRoleName(e.target.value)}
                                    placeholder="Edita el nombre del rol"
                                />
                            ) : (
                                <span onClick={() => handleEdit(role)}>{role.name}</span>
                            )}
                            <button onClick={() => handleDelete(role.role_ID)} className='delete_button'>Eliminar</button>
                            <button onClick={() => handleEdit(role)} className='edit_button'>
                                {editRoleId === role.role_ID ? 'Guardar' : 'Editar'}
                            </button>
                        </div>
                    ))}
                </div>
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
                    <button className='standard_button' type="submit">Crear Rol</button>
                </form>
            </div>
        </div>
    );
};

export default CreateRoleForm;


