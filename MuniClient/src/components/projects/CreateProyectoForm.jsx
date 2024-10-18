import React, { useState, useEffect } from 'react';
import { createProyecto, getDepartamentos, getEstados, getPrioridades, getUsuarios } from '../../services/api';
import { useNavigate } from 'react-router-dom';
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
        costo: ''
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
        setProyectoData({
            ...proyectoData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createProyecto(proyectoData);
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
            <h2 className="Title_create_project">Crear Nuevo Proyecto</h2>
            {success && <p>Proyecto creado exitosamente</p>}
            {error && <p>{error}</p>}
            <form onSubmit={handleSubmit} className="container-inputs-project">
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
                                <option key={departamento.id} value={departamento.departamentos_ID}>
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
                                <option key={estado.id} value={estado.estado_ID}>
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
                                <option key={prioridad.id} value={prioridad.prioridad_ID}>
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
                                    {usuario.user_ID}
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
