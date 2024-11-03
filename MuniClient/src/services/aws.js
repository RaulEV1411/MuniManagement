import AWS from 'aws-sdk';
import { createProyecto,createTarea,createUser } from './api';

// Configura AWS S3
const S3_BUCKET = 'munimanagement'; // Cambia esto por el nombre de tu bucket
const REGION = 'us-east-1'; // Cambia esto por la región de tu bucket

const s3 = new AWS.S3({
    accessKeyId: 'AKIAV45KSDA7LB7FTLT4',
    secretAccessKey: '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',
    region: REGION,
});

// Función para subir una imagen a S3
export const uploadImageToS3 = async (file) => {
    const params = {
        Bucket: S3_BUCKET,
        Key: file.name, // Puedes usar un identificador único para evitar sobrescribir archivos
        Body: file,
        ContentType: file.type,
        // ACL: 'public-read', // Se eliminó esta línea para evitar el error de ACL
    };

    return s3.upload(params).promise();
};


const postAWS = async (imgFile) => {
    let imagenUrl = '';
    if (imgFile) {
        try {
            const result = await uploadImageToS3(imgFile);
            imagenUrl = result.Location; // Obtén la URL de la imagen subida
            console.log(imagenUrl);
            return imagenUrl
            
        } catch (error) {
            console.error('Error al subir la imagen a S3:', error);
            throw new Error('No se pudo subir la imagen a S3');
        }
    }
}

// Función para guardar el producto
export const createUserPost = async (data) => {
    let imagenUrl = await postAWS(data.user_photo)
    data.user_photo = imagenUrl
    try {
        await createUser(data)
    } catch (error) {
        console.error('Error en la solicitud:', error);
        throw error;
    }
};

export const createProject = async (data) => {
    let imagenUrl = await postAWS(data.project_photo)
    data.project_photo = imagenUrl
    try{
        await createProyecto(data)
    } catch (error) {
        console.error('Error al crear el proyecto:', error);
        throw error;
    }
}

export const createTask = async (data) => {
    let imagenUrl = await postAWS(data.task_photo)
    data.task_photo = imagenUrl
    try{
        await createTarea(data)
    } catch (error) {
        console.error('Error al crear el proyecto:', error);
        throw error;
    }
}

export default { createUser };