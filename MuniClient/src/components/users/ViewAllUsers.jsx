import React, { useEffect, useState } from 'react';
import { getUsuarios } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import '../../styles/ViewAllUsers.css';

function ViewAllUsers() {
    const [usuarios, setUsuarios] = useState([]);
    const [filteredUsuarios, setFilteredUsuarios] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalUsuarios, setTotalUsuarios] = useState(0);
    const usersPerPage = 10;
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const data = await getUsuarios();
                setUsuarios(data);
                setFilteredUsuarios(data);
                setTotalUsuarios(data.length);
            } catch (error) {
                console.error('Error al obtener los usuarios:', error);
            }
        };
        fetchUsuarios();
    }, []);

    // Filtrar usuarios en base al término de búsqueda
    useEffect(() => {
        const filtered = usuarios.filter(user => 
            `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredUsuarios(filtered);
        setTotalUsuarios(filtered.length);
        setCurrentPage(1); // Resetear a la primera página después de filtrar
    }, [searchTerm, usuarios]);

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsuarios.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(totalUsuarios / usersPerPage);

    return (
        <div className="table-container-viewallusers">
            <h2 className='h2-viewallusers'>Lista de Usuarios</h2>
            <div className="top-bar-viewallusers">
                <input
                    type="text"
                    placeholder="Buscar usuario..."
                    className="search-input-viewallusers"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="add-user-button-viewallusers" onClick={() => navigate('/CreateUsers')}>
                    Agregar Usuario
                </button>
            </div>
            <p className="total-usuarios-viewallusers">Total de usuarios: {totalUsuarios}</p>
            
            <ul className="user-list-viewallusers">
                {currentUsers.map(user => (
                    <li onClick={() => navigate(`/perfil/${user.user_ID}`)} key={user.user_ID} className="user-item-viewallusers">
                        <img src={user.user_photo || '/default-user.png'} alt="Usuario" className="user-photo-viewallusers" />
                        <div className='order-divs-user-info-viewallusers'>
                            <div className="user-info-viewallusers">
                                <span className="user-subtitle-viewallusers">Nombre:</span>
                                <span className="user-name-viewallusers">{user.first_name} {user.last_name}</span>
                            </div>
                            <div className="user-info-viewallusers">
                                <span className="user-subtitle-viewallusers">Cédula:</span>
                                <span className="user-name-viewallusers">{user.cedula}</span>
                            </div>
                            <div className="user-info-viewallusers">
                                <span className="user-subtitle-viewallusers">Puesto:</span>
                                <span className="user-name-viewallusers">{user.puesto}</span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            {totalPages > 1 && (
                <div className="pagination-viewallusers">
                    {currentPage > 1 && (
                        <button onClick={() => setCurrentPage(currentPage - 1)} className="prev-button-viewallusers">
                            Anterior
                        </button>
                    )}
                    <span className="page-info-viewallusers">Página {currentPage} de {totalPages}</span>
                    {currentPage < totalPages && (
                        <button onClick={() => setCurrentPage(currentPage + 1)} className="next-button-viewallusers">
                            Siguiente
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default ViewAllUsers;
