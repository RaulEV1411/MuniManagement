import React from 'react';
import UserProfile from '../components/perfilUsuario/informacionDeUsuario';
import AssignedProjects from '../components/perfilUsuario/listaProyectos';
import Sidebar from '../components/Home/Sidebar';
import "../styles/info.css"

function  UserPerfil () {
  return (
    <div>
      <Sidebar>
        <div className='conector-userPerfil'>
          <UserProfile/>
        </div>
      </Sidebar>
    </div>
  );
}

export default UserPerfil;