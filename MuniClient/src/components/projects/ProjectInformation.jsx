import React from 'react'
import "../../styles/ProjectInformation.css"
import { jwtDecode } from "jwt-decode";

function ProjectInformation({project}) {
    const token = localStorage.getItem('refreshToken');
    const token2 = localStorage.getItem('accessToken');
    const decoded = jwtDecode(token);
    const decoded2 = jwtDecode(token2);
    //const userId = decoded.sub;
    const userId = decoded;

console.log("casita",userId)
console.log("perrito",decoded2)

    return (
        <div className='project_information_container'>
            <div className='container_fechas_description_project_info'>
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
            <div className='description_div_project_info'>
                    <h2>Descripcion</h2>
                    <hr className='hr_project_info' />
                    <p>{project.descripcion}</p>
            </div>
            <div className='div_container_project_info_responsables'>
                <div className='divs_responsables_project_info'>
                    <h2>Encargado</h2>
                    <hr className='hr_project_info' />
                    <h3>{project.user_ID.first_name} {project.user_ID.last_name}</h3>
                </div>
                <div className='divs_responsables_project_info'>
                    <h2>Departamento</h2>
                    <hr className='hr_project_info' />
                    <h3>{project.departamento_ID.name}</h3>
                </div>
                <div className='divs_responsables_project_info'>
                    <h2>Costo</h2>
                    <hr className='hr_project_info' />
                    <p>{project.costo}</p>
                </div>
            </div>
        </div>
    )
}

export default ProjectInformation