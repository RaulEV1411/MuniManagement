import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Para la redirección
import { createTarea, getProyectos, getEstados, getPrioridades } from '../../services/api';

const CreateTareasForm = () => {
    const [tareaData, setTareaData] = useState({
        prioridad_ID: '',
        estado_ID: '',
        proyecto_ID: '',
        name: '',
        descripcion: '',
        fecha_inicio: '',
        fecha_entrega: ''
    });

    const [proyectos, setProyectos] = useState([]);
    const [estados, setEstados] = useState([]);
    const [prioridades, setPrioridades] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const navigate = useNavigate(); // Para redireccionar al home

    // Cargar las listas de proyectos, estados y prioridades
    useEffect(() => {
        const fetchData = async () => {
            try {
                const proyectosData = await getProyectos();
                const estadosData = await getEstados();
                const prioridadesData = await getPrioridades();

                setProyectos(proyectosData);
                setEstados(estadosData);
                setPrioridades(prioridadesData);
            } catch (error) {
                console.error('Error al obtener los datos:', error);
            }
        };

        fetchData();
    }, []);

    const handleChange = (e) => {
        setTareaData({
            ...tareaData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createTarea(tareaData);
            setSuccess(true);
            setError(null);
            navigate('/'); // Redirigir al home después de crear la tarea
        } catch (error) {
            setError('Error al crear la tarea');
            setSuccess(false);
        }
    };

    return (
        <div>
            <h2>Crear Nueva Tarea</h2>
            {success && <p>Tarea creada exitosamente</p>}
            {error && <p>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="name"
                    placeholder="Nombre de la tarea"
                    value={tareaData.name}
                    onChange={handleChange}
                    required
                />
                <input
                    type="text"
                    name="descripcion"
                    placeholder="Descripción"
                    value={tareaData.descripcion}
                    onChange={handleChange}
                    required
                />
                <input
                    type="date"
                    name="fecha_inicio"
                    value={tareaData.fecha_inicio}
                    onChange={handleChange}
                    required
                />
                <input
                    type="date"
                    name="fecha_entrega"
                    value={tareaData.fecha_entrega}
                    onChange={handleChange}
                    required
                />

                <select
                    name="proyecto_ID"
                    value={tareaData.proyecto_ID}
                    onChange={handleChange}
                    required
                >
                    <option value="">Seleccione un Proyecto</option>
                    {proyectos.map((proyecto) => (
                        <option key={proyecto.proyect_ID} value={proyecto.proyect_ID}>
                            {proyecto.name}
                        </option>
                    ))}
                </select>

                <select
                    name="estado_ID"
                    value={tareaData.estado_ID}
                    onChange={handleChange}
                    required
                >
                    <option value="">Seleccione un Estado</option>
                    {estados.map((estado) => (
                        <option key={estado.estado_ID} value={estado.estado_ID}>
                            {estado.name}
                        </option>
                    ))}
                </select>

                <select
                    name="prioridad_ID"
                    value={tareaData.prioridad_ID}
                    onChange={handleChange}
                    required
                >
                    <option value="">Seleccione una Prioridad</option>
                    {prioridades.map((prioridad) => (
                        <option key={prioridad.prioridad_ID} value={prioridad.prioridad_ID}>
                            {prioridad.name}
                        </option>
                    ))}
                </select>

                <button type="submit">Crear Tarea</button>
            </form>
        </div>
    );
};

export default CreateTareasForm;
