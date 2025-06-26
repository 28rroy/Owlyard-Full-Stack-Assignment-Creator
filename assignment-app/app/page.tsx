'use client';

import { useState, useEffect } from 'react';
import { AssignmentCreator } from '@/components/AssignmentCreator';
import { X } from 'lucide-react';

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  // Listen for global modal-close event
  useEffect(() => {
    const handler = () => setShowModal(false);
    window.addEventListener("close-assignment-modal", handler);
    return () => window.removeEventListener("close-assignment-modal", handler);
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        onClick={() => setShowModal(true)}
      >
        Create Assignment
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50"
          style={{ isolation: 'isolate' }}
          onClick={() => setShowModal(false)}
        >
          {/* Modal container */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal content */}
            <div
              className="relative flex items-center justify-center bg-blue-50 rounded-md shadow-lg p-6 w-full h-full z-20"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                isolation: 'isolate',
                touchAction: 'none',
                pointerEvents: 'auto',
                userSelect: 'none',
              }}
            >
              {/* Close button */}
              <button
                title="Close assignment creator"
                className="absolute top-2 right-2 sm:top-5 sm:right-5 z-10 p-2.5
                rounded-full bg-red-400 hover:bg-red-500
                text-white shadow-lg
                transform transition-all duration-200
                hover:scale-110 hover:shadow-red-400/50
                focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2
                active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModal(false);
                }}
              >
                <X className="h-4 w-4" />
              </button>

              <AssignmentCreator />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
