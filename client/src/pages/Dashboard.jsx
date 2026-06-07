import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import UploadModal from '../components/UploadModal';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/api/docs');
      setDocs(res.data);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    await api.delete(`/api/docs/${id}`);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Your Documents</h2>
            <p className="text-gray-500 text-sm mt-1">{docs.length} document{docs.length !== 1 ? 's' : ''} uploaded</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700"
          >
            + Upload PDF
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-20">Loading...</p>
        ) : docs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No documents yet</p>
            <p className="text-sm mt-1">Click "Upload PDF" to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Size</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Uploaded</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800 truncate max-w-xs">
                      {doc.original_name}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatSize(doc.size)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[doc.status] || statusColors.pending}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={(doc) => setDocs((prev) => [doc, ...prev])}
        />
      )}
    </div>
  );
}
