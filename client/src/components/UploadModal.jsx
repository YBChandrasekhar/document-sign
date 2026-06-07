import { useRef, useState } from 'react';
import api from '../api/axios';

export default function UploadModal({ onClose, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f?.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }
    setError('');
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      const res = await api.post('/api/docs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Document</h2>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {file ? (
            <p className="text-indigo-600 font-medium">{file.name}</p>
          ) : (
            <>
              <p className="text-gray-500">Drag & drop a PDF here</p>
              <p className="text-gray-400 text-sm mt-1">or click to browse</p>
            </>
          )}
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
