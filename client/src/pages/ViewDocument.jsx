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
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placingMode, setPlacingMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [docRes, sigRes] = await Promise.all([
          api.get(`/api/docs/${id}`),
          api.get(`/api/signatures/${id}`),
        ]);
        setDoc(docRes.data);
        setSignatures(sigRes.data);
      } catch (_) {
        setError('Document not found');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handlePageClick = async ({ x, y, page }) => {
    if (!placingMode) return;
    setSaving(true);
    try {
      const res = await api.post('/api/signatures', {
        document_id: id,
        x,
        y,
        page,
        width: 200,
        height: 60,
      });
      setSignatures((prev) => [...prev, res.data]);
      setPlacingMode(false);
    } catch (_) {} 
    finally { setSaving(false); }
  };

  const handleDeleteSignature = async (sigId) => {
    await api.delete(`/api/signatures/${sigId}`);
    setSignatures((prev) => prev.filter((s) => s.id !== sigId));
  };

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
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <button onClick={() => navigate('/dashboard')} className="text-indigo-600 hover:underline text-sm">
          ← Back to Dashboard
        </button>
        <h1 className="text-lg font-bold text-indigo-600">DocSign</h1>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 flex gap-6">
        {/* Left — PDF Viewer */}
        <div className="flex-1 bg-white rounded-xl shadow p-6">
          {placingMode && (
            <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm px-4 py-2 rounded-lg">
              📌 Click anywhere on the PDF to place a signature field
            </div>
          )}
          <PdfViewer
            fileUrl={fileUrl}
            signatures={signatures}
            onPageClick={placingMode ? handlePageClick : null}
          />
        </div>

        {/* Right — Info & Controls */}
        <div className="w-72 flex flex-col gap-4">
          {/* Doc Info */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-800 truncate">{doc.original_name}</h2>
            <p className="text-gray-400 text-xs mt-1">
              {new Date(doc.created_at).toLocaleDateString()}
            </p>
            <span className={`mt-3 inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[doc.status] || statusColors.pending}`}>
              {doc.status}
            </span>
          </div>

          {/* Signature Controls */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Signature Fields</h3>
            <button
              onClick={() => setPlacingMode((v) => !v)}
              disabled={saving}
              className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                placingMode
                  ? 'bg-yellow-400 text-white hover:bg-yellow-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              } disabled:opacity-50`}
            >
              {placingMode ? '✕ Cancel Placement' : '+ Add Signature Field'}
            </button>

            {signatures.length === 0 ? (
              <p className="text-gray-400 text-xs mt-4 text-center">No signature fields yet</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {signatures.map((sig, i) => (
                  <li key={sig.id} className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="text-gray-600">Field {i + 1} — Page {sig.page}</span>
                    <button
                      onClick={() => handleDeleteSignature(sig.id)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
