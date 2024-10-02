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


export const createUser = async (data) => {
    try {
        const response = await api.post('/users/users/', data);
        return response.data;
    } catch (error) {
        console.error('Error al crear el usuario:', error);
        throw error;
    }
};

export const login = async (email, password) => {
    try {
    const response = await api.post(`/users/login/`, { email, password });
    const token = response.data.token;
    localStorage.setItem('authToken', token);
    return token;
    } catch (error) {
    console.error('Error en la autenticación:', error);
    throw error;
    }
};


export default api;
