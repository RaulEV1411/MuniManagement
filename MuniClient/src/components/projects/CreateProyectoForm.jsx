import React, { useState, useEffect } from 'react';
import { getDepartamentos, getEstados, getPrioridades, getUsuarios } from '../../services/api';
import { createProject } from '../../services/aws';
import { useNavigate } from 'react-router-dom';
import ButtonBack from '../common/ButtonBack';
import ProjectInformation from './ProjectInformation';
import CoverImageModal from './CoverImageModal';
import styles from '../../styles/projectDetails.module.css';
import '../../styles/CreateProyectoForm.css';

const CreateProjectoForm = () => {
    const [departamentos, setDepartamentos] = useState([]);
    const [estados, setEstados] = useState([]);
    const [prioridades, setPrioridades] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    // Imágenes predefinidas para portadas.
    const departmentImages = {
        "1": "https://www.gstatic.com/classroom/themes/img_code.jpg",
        "2": "https://www.gstatic.com/classroom/themes/img_repair_thumb.jpg",
        "3": "https://www.gstatic.com/classroom/themes/img_sailing_thumb.jpg",
        "4": "https://www.gstatic.com/classroom/themes/Economics_thumb.jpg",
        "5": "https://www.gstatic.com/classroom/themes/Physics_thumb.jpg"
    };

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
        project_photo: null
    });

    // Estado para controlar la visibilidad del modal.
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createProject(proyectoData);
            setSuccess(true);
            setError(null);
            navigate('/home');
        } catch (error) {
            setError('Error al crear el proyecto');
            setSuccess(false);
        }
    };

    // Esta función se ejecuta cuando el usuario selecciona una imagen predefinida
    // o sube su propia imagen desde el modal.
    const handleSelectImage = (image) => {
        setProyectoData({
            ...proyectoData,
            project_photo: image, // Puede ser una URL o un objeto File.
        });
        setIsModalOpen(false);
    };

    return (
        <div className='create_project_container'>
            <div className='create_project_order_top'>
                <ButtonBack to={"/home"} text={"Volver"} />
            </div>
            <div className='create_project_order_divs'>
                <div className='create_project_order_div_card_example'>
                    <div className={styles['header-project-details']}>
                        <div className={styles['header-image-container']}>
                            {/* La imagen de portada actúa como disparador para abrir el modal */}
                            <img
                                src={
                                  typeof proyectoData.project_photo === 'string'
                                    ? proyectoData.project_photo
                                    : departmentImages["1"]
                                }
                                alt="Imagen de portada"
                                className={styles['header-background-image']}
                                onClick={() => setIsModalOpen(true)}
                                style={{ cursor: 'pointer' }}
                            />
                            <div className={styles['header-content']}>
                                <h1 className={styles['title-project-details']}>{proyectoData.name}</h1>
                                <div className={styles['header-buttons']}>
                                    <p className={styles['btn-location']}>Prioridad: {proyectoData.prioridad_ID}</p>
                                    <p className={styles['btn-itinerary']}>Estado: {proyectoData.estado_ID}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <ProjectInformation project={proyectoData} />
                </div>
                <div>
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
                        {/* Se eliminó el input file del formulario, ya que el modal se encarga de la selección */}
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
            </div>
            {isModalOpen && (
                <CoverImageModal
                    images={departmentImages}
                    onSelectImage={handleSelectImage}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

export default CreateProjectoForm;
