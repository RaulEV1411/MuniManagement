import React from 'react'
import CreateDireccionForm from '../components/departments/CreateDireccionForm'
import Sidebar from '../components/Home/Sidebar'

function Directions() {
  return (
    <div>
        <Sidebar>
            <CreateDireccionForm></CreateDireccionForm>
        </Sidebar>
    </div>
  )
}

export default Directions