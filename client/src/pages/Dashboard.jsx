import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import UploadModal from '../components/UploadModal';

const statusColors = {
  pending:  'bg-yellow-100 text-yellow-700',
  signed:   'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const FILTERS = ['all', 'pending', 'signed', 'rejected'];

const statCards = [
  { key: 'all',      label: 'Total',    color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { key: 'pending',  label: 'Pending',  color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  { key: 'signed',   label: 'Signed',   color: 'bg-green-50 text-green-600 border-green-100'   },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-100'         },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState('all');
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

  const counts = {
    all:      docs.length,
    pending:  docs.filter((d) => d.status === 'pending').length,
    signed:   docs.filter((d) => d.status === 'signed').length,
    rejected: docs.filter((d) => d.status === 'rejected').length,
  };

  const filtered = filter === 'all' ? docs : docs.filter((d) => d.status === filter);

  const emptyMessages = {
    all:      { title: 'No documents yet', sub: 'Click "Upload PDF" to get started' },
    pending:  { title: 'No pending documents', sub: 'All documents have been actioned' },
    signed:   { title: 'No signed documents', sub: 'Finalize a document to see it here' },
    rejected: { title: 'No rejected documents', sub: 'No documents have been rejected' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow px-4 sm:px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">DocSign</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 text-sm hidden sm:block">Hello, {user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Your Documents</h2>
            <p className="text-gray-500 text-sm mt-1">
              {counts.all} document{counts.all !== 1 ? 's' : ''} uploaded
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 w-full sm:w-auto text-center"
          >
            + Upload PDF
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {statCards.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`border rounded-xl p-4 text-left transition hover:shadow-md ${color} ${
                filter === key ? 'ring-2 ring-offset-1 ring-current shadow-md' : ''
              }`}
            >
              <p className="text-2xl font-bold">{counts[key]}</p>
              <p className="text-xs font-medium mt-1">{label}</p>
            </button>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-white rounded-lg shadow p-1 mb-5 w-fit">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Document Table */}
        {loading ? (
          <p className="text-gray-400 text-center py-20">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-xl shadow">
            <p className="text-lg font-medium">{emptyMessages[filter].title}</p>
            <p className="text-sm mt-1">{emptyMessages[filter].sub}</p>
            {filter === 'all' && (
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 text-sm"
              >
                + Upload PDF
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
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
                  {filtered.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-800 max-w-xs">
                        <span className="truncate block">{doc.original_name}</span>
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
                        <div className="flex gap-3">
                          <button
                            onClick={() => navigate(`/docs/${doc.id}`)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {filtered.map((doc) => (
                <div key={doc.id} className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-gray-800 text-sm truncate flex-1">
                      {doc.original_name}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColors[doc.status] || statusColors.pending}`}>
                      {doc.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{formatSize(doc.size)}</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={() => navigate(`/docs/${doc.id}`)}
                      className="text-indigo-600 text-xs font-medium hover:underline"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-500 text-xs font-medium hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
