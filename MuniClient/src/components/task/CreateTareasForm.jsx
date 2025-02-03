import React, { useState, useEffect } from 'react';
import { getProyectos, getEstados, getPrioridades } from '../../services/api';
import { createTask } from '../../services/aws';
import "../../styles/createTareasForm.css";


const CreateTareasForm = ({ ID_proyecto, onTaskCreated }) => {
    const [tareaData, setTareaData] = useState({
        prioridad_ID: '',
        estado_ID: '',
        proyecto_ID: ID_proyecto,
        name: '',
        descripcion: '',
        fecha_inicio: '',
        fecha_entrega: '',
        task_photo: null,
    });

    const [proyectos, setProyectos] = useState([]);
    const [estados, setEstados] = useState([]);
    const [prioridades, setPrioridades] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

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
        const { name, value } = e.target;
        setTareaData({
            ...tareaData,
            [name]: value,
        });
    };

    const handleFileChange = (e) => {
        setTareaData({
            ...tareaData,
            task_photo: e.target.files[0],
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await createTask(tareaData);
            setSuccess(true);
            setError(null);

            if (onTaskCreated) {
                onTaskCreated();
            }
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
            <form onSubmit={handleSubmit} encType="multipart/form-data">
                <div className='div_container_Name_Estado_Prioridad_create_tareas'>
                    <div className='div_Name_create_tareas'>
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
                            <option value="">Estado</option>
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
                            <option value="">Prioridad</option>
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
                <div className='div_date_inputs_create_tareas'>
                    <div className='div_input_date_create_tareas'>
                        <p className='p_fechas_create_tareas'>Fecha de inicio:</p>
                        <input
                            type="date"
                            name="fecha_inicio"
                            value={tareaData.fecha_inicio}
                            onChange={handleChange}
                            required
                            className="create-tarea-date"
                        />
                    </div>
                    <div className='div_input_date_create_tareas'>
                        <p className='p_fechas_create_tareas'>Fecha de entrega:</p>
                        <input
                            type="date"
                            name="fecha_entrega"
                            value={tareaData.fecha_entrega}
                            onChange={handleChange}
                            required
                            className="create-tarea-date"
                        />
                    </div>
                </div>
                
                {/* Input para la imagen */}
                <div className="file-input-container_task">
                    <label htmlFor="task_photo" className="file-input-label_task">Seleccionar imagen <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#0c3958"><path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg> </label>
                    <input
                        type="file"
                        id="task_photo"
                        name="task_photo"
                        onChange={handleFileChange}
                        className="create-tarea-file-input_task"
                        accept="image/*"
                    />
                </div>

                <button type="submit" className="create-tarea-button">Crear Tarea</button>
            </form>
        </div>
    );
};

export default CreateTareasForm;
