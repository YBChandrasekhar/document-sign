import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PdfViewer from '../components/PdfViewer';

export default function PublicSign() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/share/token/${token}`
        );
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired link');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [token]);

  const handleSign = async () => {
    if (!signerName.trim())
      return setError('Please enter your full name to sign');

    setSigning(true);
    setError('');
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/share/token/${token}/sign`,
        { signer_name: signerName }
      );
      setSigned(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sign document');
    } finally {
      setSigning(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading document...
      </div>
    );

  if (error && !data)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl px-8 py-6 text-center">
          <p className="text-red-600 font-semibold text-lg">Link Invalid</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    );

  if (signed)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl px-8 py-6 text-center">
          <p className="text-green-600 font-semibold text-xl">Document Signed!</p>
          <p className="text-green-500 text-sm mt-2">
            Thank you, <strong>{signerName}</strong>. Your signature has been recorded.
          </p>
        </div>
      </div>
    );

  const fileUrl = `${import.meta.env.VITE_API_URL}/${data.document.file_path}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-indigo-600">DocSign</h1>
        <span className="text-sm text-gray-500">Signing Request</span>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 flex gap-6">
        {/* PDF Viewer */}
        <div className="flex-1 bg-white rounded-xl shadow p-6">
          <PdfViewer fileUrl={fileUrl} signatures={[]} />
        </div>

        {/* Sign Panel */}
        <div className="w-72 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-800 truncate">
              {data.document.original_name}
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Requested for: <strong>{data.signer_email}</strong>
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-3">
            <h3 className="font-semibold text-gray-700">Sign Document</h3>
            <p className="text-gray-400 text-xs">
              By signing, you agree that this constitutes your legal signature.
            </p>
            <input
              type="text"
              placeholder="Enter your full name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              onClick={handleSign}
              disabled={signing || !signerName.trim()}
              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {signing ? 'Signing...' : 'Sign Document'}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-600">
            This document was shared securely via DocSign. Your signature is legally binding.
          </div>
        </div>
      </main>
    </div>
  );
}
