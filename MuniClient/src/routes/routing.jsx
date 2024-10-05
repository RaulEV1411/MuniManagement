import React from 'react'
import { Routes, Route } from 'react-router-dom';
import CreateDireccionForm from '../components/departments/CreateDireccionForm';
import CreateDepartamentoForm from '../components/departments/CreateDepartamentoForm';
import CreateRoleForm from '../components/users/CreateRoleForm';
import CreateUserForm from '../components/users/CreateUserForm';
import LoginForm from '../components/users/LoginForm';
import CreateTareasForm from '../components/task/CreateTareasForm';
import CreateProjectoForm from '../components/projects/CreateProyectoForm';
import Home from "../pages/home"


function Routing() {
  return (
    <div>
        <Routes>
            <Route path="/" element={<CreateDireccionForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/departamentos" element={<CreateDepartamentoForm />} />
            <Route path="/roles" element={<CreateRoleForm />} />
            <Route path="/users" element={<CreateUserForm />} />
            <Route path="/proyectos" element={<CreateProjectoForm />} />
            <Route path="/tareas" element={<CreateTareasForm />} />
            <Route path='/home' element={<Home />} />
        </Routes>
    </div>
  )
}

export default Routing