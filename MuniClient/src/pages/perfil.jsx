import React from 'react';

import UserProfile from '../components/perfilUsuario/informacionDeUsuario';
import AssignedProjects from '../components/perfilUsuario/listaProyectos';

function  UserPerfil () {
  return (
    <div>
     <UserProfile/>
     <AssignedProjects/>
    </div>
  );
}

export default UserPerfil;