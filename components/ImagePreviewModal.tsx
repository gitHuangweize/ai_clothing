import React from 'react';
import ImageWithFade from './ImageWithFade';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, imageUrl, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full w-full h-full flex items-center justify-center">
        <ImageWithFade
          src={imageUrl}
          alt="Preview"
          wrapperClassName="max-w-full max-h-full w-full h-full flex items-center justify-center"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          loading="eager"
        />
        <button 
          className="absolute top-4 right-4 text-white bg-gray-800 bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
