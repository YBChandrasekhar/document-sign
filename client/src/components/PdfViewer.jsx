import { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DraggableSignature from './DraggableSignature';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PDF_WIDTH = 600;

export default function PdfViewer({
  fileUrl,
  signatures = [],
  onPageClick,
  onDragEnd,
  onDeleteSignature,
  userName,
}) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const pageRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handlePageClick = (e) => {
    if (!onPageClick) return;
    // Ignore clicks on draggable elements
    if (e.target.closest('[data-draggable]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onPageClick({ x, y, page: pageNumber });
  };

  const handleDragEnd = (event) => {
    const { active, delta } = event;
    if (!onDragEnd || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const sig = signatures.find((s) => s.id === active.id);
    if (!sig) return;

    const newX = sig.x + (delta.x / rect.width) * 100;
    const newY = sig.y + (delta.y / rect.height) * 100;

    // Clamp within bounds
    onDragEnd(active.id, {
      x: Math.min(Math.max(newX, 0), 95),
      y: Math.min(Math.max(newY, 0), 95),
    });
  };

  const pageSignatures = signatures.filter((s) => s.page === pageNumber);

  return (
    <div className="flex flex-col items-center gap-4">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<p className="text-gray-400 py-10">Loading PDF...</p>}
          error={<p className="text-red-500 py-10">Failed to load PDF.</p>}
        >
          <div
            ref={pageRef}
            className="relative"
            style={{ cursor: onPageClick ? 'crosshair' : 'default' }}
            onClick={handlePageClick}
          >
            <Page
              pageNumber={pageNumber}
              width={PDF_WIDTH}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
            {pageSignatures.map((sig, i) => (
              <DraggableSignature
                key={sig.id}
                sig={sig}
                index={i}
                onDelete={onDeleteSignature}
                userName={userName}
              />
            ))}
          </div>
        </Document>
      </DndContext>

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
