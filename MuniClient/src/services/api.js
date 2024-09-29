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

export default api;
