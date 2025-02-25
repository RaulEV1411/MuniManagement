import React from 'react';
import '../../styles/CoverImageModal.css';

const CoverImageModal = ({ images, onSelectImage, onClose }) => {
    // Maneja el cambio del input para subir imagen propia.
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            onSelectImage(e.target.files[0]); // Se envía el objeto File.
        }
    };

    return (
        <div className="modalOverlay">
            <div className="modalContent">
                <button onClick={onClose} className="closeButton">
                    X
                </button>
                <h2>Selecciona una imagen de portada</h2>
                <div className="imageGrid">
                    {Object.keys(images).map(key => (
                        <img
                            key={key}
                            src={images[key]}
                            alt={`Portada ${key}`}
                            className="imageItem"
                            onClick={() => onSelectImage(images[key])}
                        />
                    ))}
                </div>
                {/* Área para subir imagen propia */}
                <div className="uploadOwnContainer">
                    <label className="uploadOwnLabel">
                        Subir imagen propia
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="uploadOwnInput"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default CoverImageModal;
