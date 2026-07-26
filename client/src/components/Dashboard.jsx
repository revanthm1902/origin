import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function Dashboard() {
  const { user, setUser } = useContext(AuthContext); // Bring in setUser
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // 1. Tell the backend to destroy the cookie
      await api.post('/auth/logout');
      
      // 2. Clear the user from our global React state
      setUser(null);
      
      // 3. Redirect back to the login page
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome to the protected zone, {user.email}!</p>
      <p>Your database ID is: {user._id}</p>
      
      <button 
        onClick={handleLogout} 
        style={{ marginTop: '1rem', background: '#ff4d4f', color: 'white', padding: '0.5rem 1rem', border: 'none', cursor: 'pointer' }}
      >
        Log Out
      </button>
    </div>
  );
}