import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PdfViewer from '../components/PdfViewer';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function ViewDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/api/docs/${id}`);
        setDoc(res.data);
      } catch (_) {
        setError('Document not found');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading)
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="text-indigo-600 hover:underline">
          Back to Dashboard
        </button>
      </div>
    );

  const fileUrl = `${import.meta.env.VITE_API_URL}/${doc.file_path}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-indigo-600 hover:underline text-sm"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-lg font-bold text-indigo-600">DocSign</h1>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Document Info */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{doc.original_name}</h2>
              <p className="text-gray-400 text-sm mt-1">
                Uploaded on {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[doc.status] || statusColors.pending}`}>
              {doc.status}
            </span>
          </div>

          <div className="flex gap-6 mt-4 text-sm text-gray-500">
            <span>Size: {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : '-'}</span>
            <span>ID: {doc.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <h3 className="text-gray-700 font-medium mb-4 self-start">Document Preview</h3>
          <PdfViewer fileUrl={fileUrl} />
        </div>
      </main>
    </div>
  );
}
