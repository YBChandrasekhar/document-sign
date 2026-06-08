import { useState } from 'react';
import api from '../api/axios';

export default function ShareModal({ docId, docName, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleShare = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/share/generate', {
        document_id: docId,
        signer_email: email,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(result.signing_link);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Share for Signing</h2>
        <p className="text-gray-400 text-sm mb-4 truncate">{docName}</p>

        {!result ? (
          <>
            <input
              type="email"
              placeholder="Signer's email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={!email || loading}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Send Signing Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-700 text-sm font-medium">Link generated successfully!</p>
              <p className="text-green-600 text-xs mt-1">
                Email sent to <strong>{email}</strong>
              </p>
              <p className="text-green-500 text-xs mt-1">
                Expires: {new Date(result.expires_at).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 break-all mb-3">
              {result.signing_link}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyLink}
                className="flex-1 border border-indigo-300 text-indigo-600 py-2 rounded-lg text-sm hover:bg-indigo-50"
              >
                Copy Link
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
