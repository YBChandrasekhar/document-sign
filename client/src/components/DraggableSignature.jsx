import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export default function DraggableSignature({ sig, index, onDelete, userName }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: sig.id,
  });

  const style = {
    position: 'absolute',
    left: `${sig.x}%`,
    top: `${sig.y}%`,
    width: `${sig.width || 200}px`,
    height: `${sig.height || 60}px`,
    transform: CSS.Translate.toString(transform),
    transformOrigin: '0 0',
    zIndex: isDragging ? 50 : 10,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`select-none rounded-md overflow-hidden transition-shadow ${
        isDragging ? 'shadow-2xl' : 'shadow-md hover:shadow-lg'
      }`}
    >
      {/* Top label bar */}
      <div className={`flex items-center justify-between px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
        isDragging ? 'bg-indigo-700 text-white' : 'bg-indigo-600 text-white'
      }`}>
        <span>✍ Signature Field {index + 1}</span>
        <span className="opacity-70">Page {sig.page}</span>
      </div>

      {/* Signature body */}
      <div className="bg-white border border-indigo-300 border-t-0 rounded-b-md flex items-center gap-2 px-2 h-[calc(100%-18px)]">
        {/* Seal icon */}
        <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-300 flex items-center justify-center shrink-0">
          <span className="text-indigo-600 text-[10px]">✓</span>
        </div>

        {/* Signature text area */}
        <div className="flex-1 min-w-0 border-b border-indigo-200">
          <p
            className="text-indigo-700 truncate pointer-events-none"
            style={{ fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'italic' }}
          >
            {userName || 'Sign here'}
          </p>
        </div>
      </div>

      {/* Delete button */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(sig.id); }}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center hover:bg-red-600 shadow"
      >
        ✕
      </button>
    </div>
  );
}
