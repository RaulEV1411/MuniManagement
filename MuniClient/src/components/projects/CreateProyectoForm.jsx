import React, { useState, useEffect } from 'react';
import { getDepartamentos, getEstados, getPrioridades, getUsuarios } from '../../services/api';
import { createProject } from '../../services/aws';
import { useNavigate } from 'react-router-dom';
import ButtonBack from '../common/ButtonBack';
import '../../styles/CreateProyectoForm.css';  

const CreateProjectoForm = () => {
    const [departamentos, setDepartamentos] = useState([]);
    const [estados, setEstados] = useState([]);
    const [prioridades, setPrioridades] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const [proyectoData, setProyectoData] = useState({
        departamento_ID: '',
        estado_ID: '',
        prioridad_ID: '',
        user_ID: '',
        name: '',
        descripcion: '',
        fecha_inicio: '',
        fecha_entrega: '',
        costo: '',
        project_photo: null  // Agregamos un campo para la imagen
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const departamentosData = await getDepartamentos();
                const estadosData = await getEstados();
                const prioridadesData = await getPrioridades();
                const usuariosData = await getUsuarios();

                setDepartamentos(departamentosData);
                setEstados(estadosData);
                setPrioridades(prioridadesData);
                setUsuarios(usuariosData);
            } catch (error) {
                console.error('Error al obtener los datos:', error);
            }
        };

        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProyectoData({
            ...proyectoData,
            [name]: value,
        });
    };

    const handleFileChange = (e) => {
        setProyectoData({
            ...proyectoData,
            project_photo: e.target.files[0],  // Guardamos el archivo seleccionado
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Crear una instancia de FormData
        const data = proyectoData;

        try {
            await createProject(data);  // Enviar el FormData
            setSuccess(true);
            setError(null);
            navigate('/home');
        } catch (error) {
            setError('Error al crear el proyecto');
            setSuccess(false);
        }
    };

    

    return (
        <div className='create_project_container'>
            <ButtonBack to={"/home"}></ButtonBack>
            <h2 className="Title_create_project">Crear Nuevo Proyecto</h2>
            {success && <p>Proyecto creado exitosamente</p>}
            {error && <p>{error}</p>}
            <form onSubmit={handleSubmit} className="container-inputs-project" encType="multipart/form-data">
                <div className="order-inputs-project">
                    <div className="project-input-container">
                        <label className="project-label" htmlFor="name">Nombre:</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            placeholder="Nombre del proyecto"
                            value={proyectoData.name}
                            onChange={handleChange}
                            className="project-input"
                            required
                        />
                    </div>
                    
                    <div className="project-input-container">
                        <label className="project-label" htmlFor="descripcion">Descripción:</label>
                        <input
                            type="text"
                            name="descripcion"
                            id="descripcion"
                            placeholder="Descripción"
                            value={proyectoData.descripcion}
                            onChange={handleChange}
                            className="project-input"
                            required
                        />
                    </div>
                </div>

                {/* Campo para subir la imagen */}
                <div className="project-input-container_file">
                    <label className="project-label_file">Foto del Proyecto:</label>
                    <label className="project-label_file2" htmlFor="project_photo">Seleccione Foto</label> <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#F3951B"><path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
                    <input
                        type="file"
                        name="project_photo"
                        id="project_photo"
                        onChange={handleFileChange}
                        className="project-input_file"
                    />
                </div>

                <div className="order-inputs-project">
                    <div className="project-input-container">
                        <label className="project-label" htmlFor="fecha_inicio">Fecha Inicio:</label>
                        <input
                            type="date"
                            name="fecha_inicio"
                            id="fecha_inicio"
                            value={proyectoData.fecha_inicio}
                            onChange={handleChange}
                            className="project-input"
                            required
                        />
                    </div>

                    <div className="project-input-container">
                        <label className="project-label" htmlFor="fecha_entrega">Fecha Entrega:</label>
                        <input
                            type="date"
                            name="fecha_entrega"
                            id="fecha_entrega"
                            value={proyectoData.fecha_entrega}
                            onChange={handleChange}
                            className="project-input"
                            required
                        />
                    </div>
                </div>

                <div className="order-inputs-project">
                    <div className="project-input-container">
                        <label className="project-label" htmlFor="costo">Costo:</label>
                        <input
                            type="number"
                            name="costo"
                            id="costo"
                            placeholder="Costo"
                            value={proyectoData.costo}
                            onChange={handleChange}
                            className="project-input"
                            required
                        />
                    </div>

                    <div className="project-input-container">
                        <label className="project-label" htmlFor="departamento_ID">Departamento:</label>
                        <select
                            name="departamento_ID"
                            id="departamento_ID"
                            value={proyectoData.departamento_ID}
                            onChange={handleChange}
                            className="project-dropdown"
                            required
                        >
                            <option value="">Seleccione un Departamento</option>
                            {departamentos.map(departamento => (
                                <option key={departamento.departamentos_ID} value={departamento.departamentos_ID}>
                                    {departamento.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="order-inputs-project">
                    <div className="project-input-container">
                        <label className="project-label" htmlFor="estado_ID">Estado:</label>
                        <select
                            name="estado_ID"
                            id="estado_ID"
                            value={proyectoData.estado_ID}
                            onChange={handleChange}
                            className="project-dropdown"
                            required
                        >
                            <option value="">Seleccione un Estado</option>
                            {estados.map(estado => (
                                <option key={estado.estado_ID} value={estado.estado_ID}>
                                    {estado.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="project-input-container">
                        <label className="project-label" htmlFor="prioridad_ID">Prioridad:</label>
                        <select
                            name="prioridad_ID"
                            id="prioridad_ID"
                            value={proyectoData.prioridad_ID}
                            onChange={handleChange}
                            className="project-dropdown"
                            required
                        >
                            <option value="">Seleccione una Prioridad</option>
                            {prioridades.map(prioridad => (
                                <option key={prioridad.prioridad_ID} value={prioridad.prioridad_ID}>
                                    {prioridad.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="order-inputs-project">
                    <div className="project-input-container">
                        <label className="project-label" htmlFor="user_ID">Responsable:</label>
                        <select
                            name="user_ID"
                            id="user_ID"
                            value={proyectoData.user_ID}
                            onChange={handleChange}
                            className="project-dropdown"
                            required
                        >
                            <option value="">Seleccione un Responsable</option>
                            {usuarios.map(usuario => (
                                <option key={usuario.user_ID} value={usuario.user_ID}>
                                    {usuario.cedula} {usuario.first_name} {usuario.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button type="submit" className="button_create_project">Crear Proyecto</button>
            </form>
        </div>
    );
};

export default CreateProjectoForm;
