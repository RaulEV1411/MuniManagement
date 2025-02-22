import React from 'react'
import Sidebar from '../components/Home/Sidebar'
import CreateDepartamentoForm from '../components/departments/CreateDepartamentoForm'

function Departament() {
  return (
    <div>
        <Sidebar>
            <CreateDepartamentoForm></CreateDepartamentoForm>
        </Sidebar>
    </div>
  )
}

export default Departament