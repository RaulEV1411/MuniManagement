import React from 'react'
import Sidebar from '../components/Home/Sidebar'
import ViewAllUsers from '../components/users/ViewAllUsers'

function Users() {
    return (
        <div>
            <Sidebar>
                <ViewAllUsers></ViewAllUsers>
            </Sidebar>
        </div>
    )
}

export default Users