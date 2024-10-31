import axios from 'axios';

// Configuración de Axios
const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Función para crear una nueva dirección
export const createDireccion = async (data) => {
    try {
        const response = await api.post('/departments/direcciones/', data);
        return response.data;
    } catch (error) {
        console.error('Error al crear la dirección:', error);
        throw error;
    }
};

export const getDirecciones = async () => {
    try {
        const response = await api.get('/departments/direcciones/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener las direcciones:', error);
        throw error;
    }
};

export const createDepartamento = async (data) => {
    try {
        const response = await api.post('/departments/departamentos/', data);
        return response.data;
    } catch (error) {
        console.error('Error al crear el departamento:', error);
        throw error;
    }
};

export const createRole = async (data) => {
    try {
        const response = await api.post('/users/roles/', data);
        return response.data;
    } catch (error) {
        console.error('Error al crear el rol:', error);
        throw error;
    }
};


export const getRoles = async () => {
    try {
        const response = await api.get('/users/roles/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener los roles:', error);
        throw error;
    }
};


export const getDepartamentos = async () => {
    try {
        const response = await api.get('/departments/departamentos/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener los departamentos:', error);
        throw error;
    }
};


// export const createUser = async (data) => {
//     try {
//         const response = await api.post('/users/users/', data);
//         return response.data;
//     } catch (error) {
//         console.error('Error al crear el usuario:', error);
//         throw error;
//     }
// };


export const login = async (email, password) => {
    try {
      const response = await api.post(`/users/login/`, { email, password });
      
      // Aquí aseguramos que estamos tomando el campo 'access' de la respuesta
      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;
  
      // Guardar ambos tokens si lo necesitas
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
  
    } catch (error) {
      console.error('Error en la autenticación:', error);
      throw error;
    }
  };
  

export const createProyecto = async (data) => {
    console.log(data);
    try {
        const response = await api.post('/projects/proyectosWrite/', data);
        return response.data;
    } catch (error) {
        console.error('Error al crear el proyecto:', error);
        throw error;
    }
};

export const getProyectoById = async (id) => {
    try {
      const response = await api.get(`/projects/proyectosRead/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener el proyecto:', error);
      throw error;
    }
  };

// Obtener los estados
export const getEstados = async () => {
    try {
        const response = await api.get('/projects/estados/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener los estados:', error);
        throw error;
    }
};

// Obtener las prioridades
export const getPrioridades = async () => {
    try {
        const response = await api.get('/projects/prioridades/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener las prioridades:', error);
        throw error;
    }
};

// Obtener los usuarios
export const getUsuarios = async () => {
    try {
        const response = await api.get('/users/users/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
        throw error;
    }
};

export const createTarea = async (data) => {
    try {
        const response = await api.post('/task/tareas/', data);
        return response.data;
    } catch (error) {
        console.error('Error al crear la tarea:', error);
        throw error;
    }
};

export const getProyectos = async () => {
    try {
        const response = await api.get('/projects/proyectosRead/');
        return response.data;
    } catch (error) {
        console.error('Error al obtener los proyectos:', error);
        throw error;
    }
};


// Obtener un usuario por ID
export const getUsuariosById = async (userID) => {
    try {
        const response = await api.get(`/users/users/${userID}/`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener el usuario:', error);
        throw error;
    }
};

export const getTareasByProjectID = async (projectID) => {
    try {
        const response = await api.get(`/task/tareas/`, {
        params: {
            proyecto_ID: projectID
        }
    });
        return response.data; // Aquí tienes las tareas filtradas por el project_ID
    } catch (error) {
        console.error('Error al obtener las tareas:', error);
    }
};

// Función para eliminar un proyecto por ID
export const deleteProyecto = async (id) => {
    try {
        const response = await api.delete(`/projects/proyectosRead/${id}/`);
        return response.data;
    } catch (error) {
        console.error('Error al eliminar el proyecto:', error);
        throw error;
    }
};

export const updateProyecto = async (id, data) => {
    try {
        const response = await api.put(`/projects/proyectosRead/${id}/`, data);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar el proyecto:', error);
        throw error;
    }
};
  export const deleteTask = async (taskId) => {
    try {
        const response = await api.delete(`/task/tareas/${taskId}/`); // Ajusta la URL según tu API
        return response.data;
    } catch (error) {
        console.error("Error deleting task", error);
        throw error;
    }
};

export const updateTask = async (taskId, updatedTask) => {
    try {
        const response = await api.put(`/task/tareas/${taskId}/`, updatedTask);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar la tarea:', error);
        throw error;
    }
};


export default api;
