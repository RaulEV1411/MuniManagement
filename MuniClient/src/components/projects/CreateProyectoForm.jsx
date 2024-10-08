import React, { useState, useEffect } from 'react';
import { createProyecto, getDepartamentos, getEstados, getPrioridades, getUsuarios } from '../../services/api';
import { useNavigate } from 'react-router-dom';


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
            navigate('/');
        } catch (error) {
            setError('Error al crear el proyecto');
            setSuccess(false);
        }
    };

    return (
        <div>
            <h2>Crear Nuevo Proyecto</h2>
            {success && <p>Proyecto creado exitosamente</p>}
            {error && <p>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="name"
                    placeholder="Nombre del proyecto"
                    value={proyectoData.name}
                    onChange={handleChange}
                    required
                />
                <input
                    type="text"
                    name="descripcion"
                    placeholder="Descripción"
                    value={proyectoData.descripcion}
                    onChange={handleChange}
                    required
                />
                <input
                    type="date"
                    name="fecha_inicio"
                    value={proyectoData.fecha_inicio}
                    onChange={handleChange}
                    required
                />
                <input
                    type="date"
                    name="fecha_entrega"
                    value={proyectoData.fecha_entrega}
                    onChange={handleChange}
                    required
                />
                <input
                    type="number"
                    name="costo"
                    placeholder="Costo"
                    value={proyectoData.costo}
                    onChange={handleChange}
                    required
                />

                {/* Dropdown de Departamento */}
                <select
                    name="departamento_ID"
                    value={proyectoData.departamento_ID}
                    onChange={handleChange}
                    required
                >
                    <option value="">Seleccione un Departamento</option>
                    {departamentos.map((departamento) => (
                        <option key={departamento.id} value={departamento.departamentos_ID}>
                            {departamento.name}
                        </option>
                    ))}
                </select>

                {/* Dropdown de Estado */}
                <select
                    name="estado_ID"
                    value={proyectoData.estado_ID}
                    onChange={handleChange}
                    required
                >
                    <option value="">Seleccione un Estado</option>
                    {estados.map((estado) => (
                        <option key={estado.id} value={estado.estado_ID}>
                            {estado.name}
                        </option>
                    ))}
                </select>

                {/* Dropdown de Prioridad */}
                <select
                    name="prioridad_ID"
                    value={proyectoData.prioridad_ID}
                    onChange={handleChange}
                    required
                >
                    <option value="">Seleccione una Prioridad</option>
                    {prioridades.map((prioridad) => (
                        <option key={prioridad.id} value={prioridad.prioridad_ID}>
                            {prioridad.name}
                        </option>
                    ))}
                </select>

                {/* Dropdown de Usuario */}
                <select
                    name="user_ID"
                    value={proyectoData.user_ID}
                    onChange={handleChange}
                    required
                >
                    <option value="">Seleccione un Usuario</option>
                    {usuarios.map((usuario) => (
                        <option key={usuario.user_ID} value={usuario.user_ID}>
                            {usuario.user_ID}
                        </option>
                    ))}
                </select>

                <button type="submit">Crear Proyecto</button>
            </form>
        </div>
    );
};

export default CreateProjectoForm;
