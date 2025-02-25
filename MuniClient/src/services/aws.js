import AWS from 'aws-sdk';
import { createProyecto, createTarea, createUser } from './api';

// Configura AWS S3
const S3_BUCKET = 'munimanagement';
const REGION = 'us-east-1';

const s3 = new AWS.S3({
    accessKeyId: 'AKIAV45KSDA7LB7FTLT4',
    secretAccessKey: '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',
    region: REGION,
});

// Función para subir una imagen a S3
export const uploadImageToS3 = async (file) => {
    const params = {
        Bucket: S3_BUCKET,
        Key: file.name, // Puedes generar un identificador único si es necesario
        Body: file,
        ContentType: file.type,
    };

    return s3.upload(params).promise();
};

const postAWS = async (imgFile) => {
    // Si es un objeto File, se sube; si no, se asume que ya es una URL.
    if (imgFile && imgFile instanceof File) {
        try {
            const result = await uploadImageToS3(imgFile);
            return result.Location;
        } catch (error) {
            console.error('Error al subir la imagen a S3:', error);
            throw new Error('No se pudo subir la imagen a S3');
        }
    }
    return imgFile;
};

// Función para crear un usuario
export const createUserPost = async (data) => {
    let imagenUrl = await postAWS(data.user_photo);
    data.user_photo = imagenUrl;
    try {
        await createUser(data);
    } catch (error) {
        console.error('Error en la solicitud:', error);
        throw error;
    }
};

// Función para crear un proyecto
export const createProject = async (data) => {
    // Si project_photo es un objeto File, se sube a S3; si ya es una URL, se utiliza directamente.
    if (data.project_photo && data.project_photo instanceof File) {
        let imagenUrl = await postAWS(data.project_photo);
        data.project_photo = imagenUrl;
    }
    try {
        await createProyecto(data);
    } catch (error) {
        console.error('Error al crear el proyecto:', error);
        throw error;
    }
};

// Función para crear una tarea
export const createTask = async (data) => {
    if (data.task_photo && data.task_photo instanceof File) {
        let imagenUrl = await postAWS(data.task_photo);
        data.task_photo = imagenUrl;
    }
    try {
        await createTarea(data);
    } catch (error) {
        console.error('Error al crear la tarea:', error);
        throw error;
    }
};

export default { createUser };
