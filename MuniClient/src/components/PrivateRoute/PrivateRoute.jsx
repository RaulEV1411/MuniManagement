import React from 'react'
import LoginForm from '../users/LoginForm';
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useEffect } from "react";
import { getUsuariosById } from '../../services/api';

function PrivateRoute({ allowRoles, children }) {
    const navigate = useNavigate();
    const token = localStorage.getItem('refreshToken');

    useEffect(() => {
        if (token) {
            const decoded = jwtDecode(token);
            const userId = decoded.user_ID;
            const roleUser = decoded.role
            console.log(roleUser);
            
            console.log(userId);
            getUserInfo(userId,roleUser);
        }
    }, []);

    async function getUserInfo(userId,roleUser) {
        const obtainData = await getUsuariosById(userId);
        console.log(obtainData);
        
        if (allowRoles) {
            const userRoles = roleUser;
            if (!allowRoles.some(role => userRoles.includes(role))) {
                navigate(-1);
            }
        }
    }

    if (!token) {
        return <LoginForm />;
    }
    else {
        return children;
    }
};

export default PrivateRoute