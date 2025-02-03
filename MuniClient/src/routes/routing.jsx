import React from 'react'
import { Routes, Route } from 'react-router-dom';
import CreateDireccionForm from '../components/departments/CreateDireccionForm';
import CreateDepartamentoForm from '../components/departments/CreateDepartamentoForm';
import CreateRoleForm from '../components/users/CreateRoleForm';
import CreateUserForm from '../components/users/CreateUserForm';
import LoginForm from '../components/users/LoginForm';
import CreateTareasForm from '../components/task/CreateTareasForm';
import CreateProjectoForm from '../components/projects/CreateProyectoForm';
import Homepages from "../pages/home";
import AboutPages from '../pages/about';
import ProjectDetails from '../components/projects/ProjectDetails';
import UserPerfil from '../pages/perfil';
import PrivateRoute from '../components/PrivateRoute/PrivateRoute';
import Users from '../pages/Users';
function Routing() {
  return (
    <div>
        <Routes>
            <Route path='/roles' element={
              <PrivateRoute allowRoles={["Alcalde"]}>
                <CreateRoleForm />
              </PrivateRoute>
            } />
            <Route path="/" element={<CreateDireccionForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/departamentos" element={<CreateDepartamentoForm />} />
            <Route path="/home" element={<Homepages/>} />
            <Route path="/users" element={<Users />} />
            <Route path="/CreateUsers" element={<CreateUserForm />} />
            <Route path="/proyectos" element={<CreateProjectoForm />} />
            <Route path="/tareas" element={<CreateTareasForm />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path='/about' element={<AboutPages />} /> 
            <Route path='/perfil/:id' element={< UserPerfil  />} /> 
        </Routes>
    </div>
  )
}

export default Routing