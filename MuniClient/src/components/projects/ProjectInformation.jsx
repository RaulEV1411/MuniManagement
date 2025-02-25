import React from 'react'
import "../../styles/ProjectInformation.css"

function ProjectInformation({project}) {
    return (
        <div className='project_information_container'>
            <div className='container_fechas_description_project_info'>
                <div className='description_div_project_info'>
                        <span>Descripcion</span>
                        <span>{project.descripcion}</span>
                </div>
                <div className='div_container_project_info_fechas'>
                    <div className='fechas_project_info'>
                        <h4>Fecha de inicio: </h4>
                        <p>{project.fecha_inicio}</p>
                    </div>
                    <div className='fechas_project_info'>
                        <h4>Fecha de entrega:</h4>
                        <p>{project.fecha_entrega}</p>
                    </div>
                </div>
            </div>
            <div className='div_container_project_info_responsables'>
                <div className='divs_responsables_project_info'>
                    <span>Encargado</span>
                    <span>{project.user_ID.first_name} {project.user_ID.last_name}</span>
                </div>
                <hr />
                <div className='divs_responsables_project_info'>
                    <span>Departamento</span>
                    <span>{project.departamento_ID.name}</span>
                </div>
                <hr />
                <div className='divs_responsables_project_info'>
                    <span>Costo</span>
                    <span>{project.costo}</span>
                </div>
            </div>
            <hr className="hr_project_info" />
        </div>
    )
}

export default ProjectInformation