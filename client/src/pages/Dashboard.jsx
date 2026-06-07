import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">DocSign</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">Hello, {user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold text-gray-800">Your Documents</h2>
        <p className="text-gray-500 mt-1">Upload and manage your documents here. (Coming Day 3)</p>
      </main>
    </div>
  );
}
