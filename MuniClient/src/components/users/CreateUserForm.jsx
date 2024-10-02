import React, { useState, useEffect } from 'react';
import { getRoles, getDepartamentos, createUser } from '../../services/api'; 

const CreateUserForm = () => {
    const [roles, setRoles] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        cedula: '',
        phone_number: '',
        email: '',
        password: '',
        birthday: '',
        puesto: '',
        role: '',
        departamento_ID: ''
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const rolesData = await getRoles();
                const departamentosData = await getDepartamentos();
                setRoles(rolesData);
                setDepartamentos(departamentosData);
            } catch (error) {
                setError('Hubo un problema al cargar roles o departamentos.');
            }
        };
        fetchData();
    }, []);

  
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        try {
            await createUser(formData);
            setSuccessMessage('Usuario creado exitosamente.');
            setFormData({
                first_name: '',
                last_name: '',
                cedula: '',
                phone_number: '',
                email: '',
                password: '',
                birthday: '',
                puesto: '',
                role: '',
                departamento_ID: ''
            });
        } catch (err) {
            setError('Hubo un error al crear el usuario.');
        }
    };

    return (
        <div>
            <h2>Crear Usuario</h2>
            <form onSubmit={handleSubmit}>
                {/* Nombre */}
                <div>
                    <label htmlFor="first_name">Nombre:</label>
                    <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                    />
                </div>

                {/* Apellido */}
                <div>
                    <label htmlFor="last_name">Apellido:</label>
                    <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                    />
                </div>

                {/* Cédula */}
                <div>
                    <label htmlFor="cedula">Cédula:</label>
                    <input
                        type="number"
                        id="cedula"
                        name="cedula"
                        value={formData.cedula}
                        onChange={handleChange}
                    />
                </div>

                {/* Teléfono */}
                <div>
                    <label htmlFor="phone_number">Teléfono:</label>
                    <input
                        type="number"
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                    />
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                    />
                </div>

                {/* Contraseña */}
                <div>
                    <label htmlFor="password">Contraseña:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                    />
                </div>

                {/* Fecha de nacimiento */}
                <div>
                    <label htmlFor="birthday">Fecha de nacimiento:</label>
                    <input
                        type="date"
                        id="birthday"
                        name="birthday"
                        value={formData.birthday}
                        onChange={handleChange}
                    />
                </div>

                {/* Puesto */}
                <div>
                    <label htmlFor="puesto">Puesto:</label>
                    <input
                        type="text"
                        id="puesto"
                        name="puesto"
                        value={formData.puesto}
                        onChange={handleChange}
                    />
                </div>

                {/* Dropdown de Roles */}
                <div>
                    <label htmlFor="role">Rol:</label>
                    <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                    >
                        <option value="">Selecciona un rol</option>
                        {roles.map((role) => (
                            <option key={role.role_ID} value={role.role_ID}>
                                {role.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Dropdown de Departamentos */}
                <div>
                    <label htmlFor="departamento_ID">Departamento:</label>
                    <select
                        id="departamento_ID"
                        name="departamento_ID"
                        value={formData.departamento_ID}
                        onChange={handleChange}
                    >
                        <option value="">Selecciona un departamento</option>
                        {departamentos.map((dep) => (
                            <option key={dep.departamentos_ID} value={dep.departamentos_ID}>
                                {dep.name}
                            </option>
                        ))}
                    </select>
                </div>

                {error && <p style={{ color: 'red' }}>{error}</p>}
                {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
                
                <button type="submit">Crear Usuario</button>
            </form>
        </div>
    );
};

export default CreateUserForm;
