import AWS from 'aws-sdk';

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

// Función para guardar el producto
export const createUser = async (data) => {
    // Primero, sube la imagen a S3
    console.log("casita",data.user_photo);
    
    let imagenUrl = '';
    if (data.user_photo) {
        try {
            const result = await uploadImageToS3(data.user_photo);
            imagenUrl = result.Location; // Obtén la URL de la imagen subida
            console.log(imagenUrl);
            
        } catch (error) {
            console.error('Error al subir la imagen a S3:', error);
            throw new Error('No se pudo subir la imagen a S3');
        }
    }

    console.log(data);
    data.user_photo = imagenUrl
    try {
        const response = await fetch('http://127.0.0.1:8000/users/users/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',

            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Error al guardar el producto. Token inválido o expirado.');
        }

        const nuevoProducto = await response.json();
        console.log('Producto guardado:', nuevoProducto);
        return nuevoProducto;
    } catch (error) {
        console.error('Error en la solicitud:', error);
        throw error;
    }
};

export default { createUser };