import React from 'react'
import { Routes, Route } from 'react-router-dom';
import CreateDireccionForm from '../components/departments/CreateDireccionForm';
import CreateDepartamentoForm from '../components/departments/CreateDepartamentoForm';
import CreateRoleForm from '../components/users/CreateRoleForm';
import CreateUserForm from '../components/users/CreateUserForm';
import LoginForm from '../components/users/LoginForm';

function Routing() {
  return (
    <div>
        <Routes>
            <Route path="/" element={<CreateDireccionForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/departamentos" element={<CreateDepartamentoForm />} />
            <Route path="/roles" element={<CreateRoleForm />} />
            <Route path="/users" element={<CreateUserForm />} />
        </Routes>
    </div>
  )
}

export default Routing