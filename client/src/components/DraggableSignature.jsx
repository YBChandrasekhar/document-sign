import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export default function DraggableSignature({ sig, index, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: sig.id,
  });

  const style = {
    position: 'absolute',
    left: `${sig.x}%`,
    top: `${sig.y}%`,
    width: `${sig.width}px`,
    height: `${sig.height}px`,
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
      className={`border-2 rounded flex flex-col items-center justify-center select-none transition-shadow ${
        isDragging
          ? 'border-indigo-600 bg-indigo-100/80 shadow-xl'
          : 'border-indigo-500 bg-indigo-50/70 hover:shadow-md'
      }`}
    >
      <span className="text-indigo-600 text-xs font-semibold pointer-events-none">
        ✍ Signature {index + 1}
      </span>
      <span className="text-indigo-400 text-[10px] pointer-events-none">Page {sig.page}</span>

      {/* Delete button — stops drag propagation */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(sig.id); }}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center hover:bg-red-600"
      >
        ✕
      </button>
    </div>
  );
}
