import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PdfViewer from '../components/PdfViewer';
import ShareModal from '../components/ShareModal';

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
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState('');
  const [showShare, setShowShare] = useState(false);

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
        x, y, page,
        width: 200,
        height: 60,
      });
      setSignatures((prev) => [...prev, res.data]);
      setPlacingMode(false);
    } catch (_) {}
    finally { setSaving(false); }
  };

  const handleDragEnd = async (sigId, { x, y }) => {
    setSignatures((prev) =>
      prev.map((s) => (s.id === sigId ? { ...s, x, y } : s))
    );
    try {
      await api.put(`/api/signatures/${sigId}`, { x, y });
    } catch (_) {}
  };

  const handleDeleteSignature = async (sigId) => {
    await api.delete(`/api/signatures/${sigId}`);
    setSignatures((prev) => prev.filter((s) => s.id !== sigId));
  };

  const handleFinalize = async () => {
    if (!confirm('Finalize and sign this document? This cannot be undone.')) return;
    setFinalizing(true);
    setFinalizeMsg('');
    try {
      await api.post(`/api/docs/${id}/finalize`);
      setDoc((prev) => ({ ...prev, status: 'signed' }));
      setFinalizeMsg('Document signed successfully! You can now download it.');
    } catch (err) {
      setFinalizeMsg(err.response?.data?.message || 'Failed to finalize');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await api.get(`/api/docs/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed-${doc.original_name}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (_) {
      alert('Download failed. Please try again.');
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );

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
  const isSigned = doc.status === 'signed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-indigo-600 hover:underline text-sm"
        >
          Back to Dashboard
        </button>
        <h1 className="text-lg font-bold text-indigo-600">DocSign</h1>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 flex gap-6">
        {/* Left — PDF Viewer */}
        <div className="flex-1 bg-white rounded-xl shadow p-6">
          {placingMode && (
            <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm px-4 py-2 rounded-lg">
              Click anywhere on the PDF to place a signature field
            </div>
          )}
          {isSigned && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
              This document has been signed
            </div>
          )}
          <PdfViewer
            fileUrl={fileUrl}
            signatures={signatures}
            onPageClick={!isSigned && placingMode ? handlePageClick : null}
            onDragEnd={!isSigned ? handleDragEnd : null}
            onDeleteSignature={!isSigned ? handleDeleteSignature : null}
          />
        </div>

        {/* Right — Info and Controls */}
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
          {!isSigned && (
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
                {placingMode ? 'Cancel Placement' : '+ Add Signature Field'}
              </button>

              {signatures.length > 0 && (
                <p className="text-gray-400 text-xs mt-3 text-center">
                  Drag fields to reposition them
                </p>
              )}

              {signatures.length === 0 ? (
                <p className="text-gray-400 text-xs mt-4 text-center">
                  No signature fields yet
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {signatures.map((sig, i) => (
                    <li
                      key={sig.id}
                      className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded-lg"
                    >
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
          )}

          {/* Finalize and Download */}
          <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-3">
            <h3 className="font-semibold text-gray-700">Actions</h3>

            {!isSigned ? (
              <button
                onClick={handleFinalize}
                disabled={finalizing || signatures.length === 0}
                className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {finalizing ? 'Generating PDF...' : 'Finalize and Sign'}
              </button>
            ) : (
              <button
                onClick={handleDownload}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Download Signed PDF
              </button>
            )}

            <button
              onClick={() => setShowShare(true)}
              className="w-full py-2 border border-indigo-300 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50"
            >
              Share for Signing
            </button>

            {finalizeMsg && (
              <p className={`text-xs text-center ${
                finalizeMsg.includes('success') ? 'text-green-600' : 'text-red-500'
              }`}>
                {finalizeMsg}
              </p>
            )}

            {signatures.length === 0 && !isSigned && (
              <p className="text-xs text-gray-400 text-center">
                Add at least 1 signature field to finalize
              </p>
            )}
          </div>

          {/* Hint */}
          {!isSigned && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-600">
              Place signature fields, drag to position, then click Finalize and Sign
            </div>
          )}
        </div>
      </main>

      {showShare && (
        <ShareModal
          docId={id}
          docName={doc.original_name}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
