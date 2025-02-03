import React, { useState, useEffect } from 'react';
import { getRoles, getDepartamentos } from '../../services/api'; 
import { createUserPost } from '../../services/aws'; 
import "../../styles/CreateUserForm.css";
import logo from "../../assets/Logo Circular Color  (Fondo Transparente) (1).png";
import ButtonBack from '../common/ButtonBack';

const CreateUserForm = () => {
    const [roles, setRoles] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        cedula: '',
        phone_number: '',
        email: '',
        birthday: '',
        puesto: '',
        role: '',
        departamento_ID: '',
        user_photo: null,
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
        const { name, value, type, files } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: type === 'file' ? files[0] : value,
        }));

        if (type === 'file') {
            console.log("Archivo seleccionado:", files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const data = formData

        // Imprimir el contenido de FormData para ver que los campos se asignan correctamente
        console.log("Contenido de FormData:",data);

        try {
            await createUserPost(data); // Envía el objeto FormData sin definir el encabezado Content-Type
            setSuccessMessage('Usuario creado exitosamente.');
            setFormData({
                first_name: '',
                last_name: '',
                cedula: '',
                phone_number: '',
                email: '',
                birthday: '',
                puesto: '',
                role: '',
                departamento_ID: '',
                user_photo: null,
            });
        } catch (err) {
            setError('Hubo un error al crear el usuario.');
        }
    };

    return (
        <div className='user-form-container'>
            <ButtonBack to={"/home"}></ButtonBack>
            <h1 className='Title_create_users'>Crear Usuario</h1>
            <div className='conteiner_order_divs_user'>
                <div className='conteiner_create_users-logo'>
                    <img src={logo} alt="Puntarenas Costa Rica" className="Create_users-logo" />
                </div>
                <div className='conteiner-inputs_conteiners'>
                    <form onSubmit={handleSubmit} className='conteiner-inputs_conteiners' encType="multipart/form-data">
                        <div className='order-inputs'>
                            {/* Nombre */}
                            <div className="date-input-container">
                                <label className="date-label" htmlFor="first_name">Nombre:</label>
                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className="date-input"
                                    placeholder='Nombre'
                                />
                            </div>

                            {/* Apellido */}
                            <div className="date-input-container">
                                <label className="date-label" htmlFor="last_name">Apellido:</label>
                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    className="date-input"
                                    placeholder='Apellido'
                                />
                            </div>

                            {/* Cédula */}
                            <div className="date-input-container">
                                <label className="date-label" htmlFor="cedula">Cédula:</label>
                                <input
                                    type="number"
                                    id="cedula"
                                    name="cedula"
                                    value={formData.cedula}
                                    onChange={handleChange}
                                    className="date-input"
                                    placeholder='Cedula'
                                />
                            </div>
                        </div>

                        <div className='order-inputs'>
                            {/* Teléfono */}
                            <div className="date-input-container">
                                <label className="date-label" htmlFor="phone_number">Teléfono:</label>
                                <input
                                    type="number"
                                    id="phone_number"
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    className="date-input"
                                    placeholder='Telefono'
                                />
                            </div>

                            {/* Email */}
                            <div className="date-input-container">
                                <label className="date-label" htmlFor="email">Email:</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="date-input"
                                    placeholder='Email'
                                />
                            </div>

                            {/* Puesto */}
                            <div className="date-input-container">
                                <label className="date-label" htmlFor="puesto">Puesto:</label>
                                <input
                                    type="text"
                                    id="puesto"
                                    name="puesto"
                                    value={formData.puesto}
                                    onChange={handleChange}
                                    className="date-input"
                                    placeholder='Puesto'
                                />
                            </div>
                        </div>

                        <div className='order-inputs'>
                            {/* Fecha de nacimiento */}
                            <div className="date-input-container">
                                <label className="date-label" htmlFor="birthday">Fecha de nacimiento:</label>
                                <input
                                    type="date"
                                    id="birthday"
                                    name="birthday"
                                    value={formData.birthday}
                                    onChange={handleChange}
                                    className="date-input"
                                />
                            </div>

                            {/* Dropdown de Roles */}
                            <div className="date-input-container">
                                <label className="date-label" htmlFor="role">Rol:</label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="date-input"
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
                            <div className="date-input-container">
                                <label className="date-label" htmlFor="departamento_ID">Departamento:</label>
                                <select
                                    id="departamento_ID"
                                    name="departamento_ID"
                                    value={formData.departamento_ID}
                                    onChange={handleChange}
                                    className="date-input"
                                >
                                    <option value="">Selecciona un departamento</option>
                                    {departamentos.map((dep) => (
                                        <option key={dep.departamentos_ID} value={dep.departamentos_ID}>
                                            {dep.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Campo de carga de imagen */}
                        <div className="date-input-container">
                            <label className="date-label" htmlFor="user_photo">Foto de Usuario:</label>
                            <input
                                type="file"
                                id="user_photo"
                                name="user_photo"
                                onChange={handleChange}
                                className="date-input"
                            />
                        </div>

                        <div className='order-inputs'>
                            <button className='button_create_users' type="submit">Crear Usuario</button>
                        </div>

                        {error && <p style={{ color: 'red' }}>{error}</p>}
                        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
                        
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateUserForm;
