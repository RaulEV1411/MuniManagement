import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Para la redirección
import { createTarea, getProyectos, getEstados, getPrioridades } from '../../services/api';
import "../../styles/createTareasForm.css"

const CreateTareasForm = ({ID_proyecto}) => {
    const [tareaData, setTareaData] = useState({
        prioridad_ID: '',
        estado_ID: '',
        proyecto_ID: ID_proyecto,
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
            navigate('/');
        } catch (error) {
            setError('Error al crear la tarea');
            setSuccess(false);
        }
    };

    return (
        <div className="create-tarea-form-container">
            <h2 className="create-tarea-title">Crear Nueva Tarea</h2>
            {success && <p className="create-tarea-success">Tarea creada exitosamente</p>}
            {error && <p className="create-tarea-error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className='div_container_Name_Estado_Prioridad_create_tareas'>
                    <div>
                        <input
                            type="text"
                            name="name"
                            placeholder="Nombre de la tarea"
                            value={tareaData.name}
                            onChange={handleChange}
                            required
                            className="create-tarea-input"
                        />
                    </div>
                    <div className='div_selects_create_tareas'>
                        <select
                            name="estado_ID"
                            value={tareaData.estado_ID}
                            onChange={handleChange}
                            required
                            className="create-tarea-select"
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
                            className="create-tarea-select"
                        >
                            <option value="">Seleccione una Prioridad</option>
                            {prioridades.map((prioridad) => (
                                <option key={prioridad.prioridad_ID} value={prioridad.prioridad_ID}>
                                    {prioridad.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <input
                    type="text"
                    name="descripcion"
                    placeholder="Descripción"
                    value={tareaData.descripcion}
                    onChange={handleChange}
                    required
                    className="create-tarea-input-descripcion"
                />
                <input
                    type="date"
                    name="fecha_inicio"
                    value={tareaData.fecha_inicio}
                    onChange={handleChange}
                    required
                    className="create-tarea-date"
                />
                <input
                    type="date"
                    name="fecha_entrega"
                    value={tareaData.fecha_entrega}
                    onChange={handleChange}
                    required
                    className="create-tarea-date"
                />
                <button type="submit" className="create-tarea-button">Crear Tarea</button>
            </form>
        </div>
    );
    
};

export default CreateTareasForm;
