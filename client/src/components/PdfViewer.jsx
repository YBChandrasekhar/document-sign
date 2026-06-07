import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PDF_WIDTH = 600;

export default function PdfViewer({ fileUrl, signatures = [], onPageClick, currentPage }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(currentPage || 1);

  const handlePageClick = (e) => {
    if (!onPageClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onPageClick({ x, y, page: pageNumber });
  };

  const pageSignatures = signatures.filter((s) => s.page === pageNumber);

  return (
    <div className="flex flex-col items-center gap-4">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<p className="text-gray-400 py-10">Loading PDF...</p>}
        error={<p className="text-red-500 py-10">Failed to load PDF.</p>}
      >
        <div className="relative" onClick={handlePageClick}
          style={{ cursor: onPageClick ? 'crosshair' : 'default' }}
        >
          <Page
            pageNumber={pageNumber}
            width={PDF_WIDTH}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
          {/* Signature placeholders overlay */}
          {pageSignatures.map((sig) => (
            <div
              key={sig.id}
              className="absolute border-2 border-indigo-500 bg-indigo-50/60 rounded flex items-center justify-center pointer-events-none"
              style={{
                left: `${sig.x}%`,
                top: `${sig.y}%`,
                width: `${sig.width}px`,
                height: `${sig.height}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="text-indigo-600 text-xs font-medium">✍ Signature</span>
            </div>
          ))}
        </div>
      </Document>

      {numPages && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
            disabled={pageNumber <= 1}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(p + 1, numPages))}
            disabled={pageNumber >= numPages}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
