import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>; // Show a spinner while checking the cookie
  
  if (!user) return <Navigate to="/login" replace />; // Kick out unauthenticated users

  return children; // Allow access if logged in
}