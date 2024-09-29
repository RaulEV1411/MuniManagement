import React from 'react'
import { Routes, Route } from 'react-router-dom';
import CreateDireccionForm from '../components/departments/CreateDireccionForm';
import CreateDepartamentoForm from '../components/departments/CreateDepartamentoForm';


function Routing() {
  return (
    <div>
        <Routes>
            <Route path="/" element={<CreateDireccionForm />} />
            <Route path="/departamentos" element={<CreateDepartamentoForm />} />
        </Routes>
    </div>
  )
}

export default Routing