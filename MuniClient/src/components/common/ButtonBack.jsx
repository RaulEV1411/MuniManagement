import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/common.css';

function ButtonBack({ to }) {
    const navigate = useNavigate();

    return (
        <button className="button-back" onClick={() => navigate(to)}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#0C3857"><path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/></svg>
        </button>
    );
}

export default ButtonBack;
