import React, { useState, useRef } from 'react';
import { AppStep } from '../types';
import ImagePreviewModal from './ImagePreviewModal';

interface VisualizerProps {
  step: AppStep;
  personImage: string | null;
  clothesImage: string | null;
  resultImage: string | null;
  onStepClick: (step: AppStep) => void;
}

const Visualizer: React.FC<VisualizerProps> = ({ step, personImage, clothesImage, resultImage, onStepClick }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const canClick = (targetStep: number) => {
    if (targetStep === 1) return true; // Always can go to person selection
    if (targetStep === 2) return !!personImage; // Can go to clothes if person selected
    if (targetStep === 3) return !!personImage && !!clothesImage; // Can go to result if both selected
    return false;
  };

  const handleCardInteraction = (targetStep: number, image: string | null) => {
    if (clickTimeoutRef.current) {
      // Double click detected
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      if (image) {
        setPreviewImage(image);
      }
    } else {
      // Single click - wait to see if double click happens
      clickTimeoutRef.current = setTimeout(() => {
        if (canClick(targetStep)) {
          onStepClick(targetStep as AppStep);
        }
        clickTimeoutRef.current = null;
      }, 250);
    }
  };

  const getCardStyle = (cardIndex: number) => {
    // Active state highlighting
    const isActive = step === cardIndex;
    const isPast = step > cardIndex;
    const isClickable = canClick(cardIndex);
    
    let base = "relative w-28 h-40 md:w-40 md:h-56 rounded-2xl shadow-xl transition-all duration-500 ease-in-out border-4 ";
    
    // Tilt logic
    if (cardIndex === 1) base += "-rotate-6 z-10 translate-x-4 ";
    if (cardIndex === 2) base += "rotate-0 z-20 -translate-y-4 scale-110 ";
    if (cardIndex === 3) base += "rotate-6 z-10 -translate-x-4 ";

    // Border color based on state
    if (isActive) base += "border-blue-500 ring-4 ring-blue-200 ";
    else if (isPast) base += "border-green-500 ";
    else base += "border-white opacity-60 ";

    // Interactivity
    if (isClickable) {
        base += "cursor-pointer hover:brightness-105 active:scale-105 ";
    } else {
        base += "cursor-default ";
    }

    return base;
  };

  const renderPlaceholder = (icon: string, label: string) => (
    <div className="w-full h-full bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400">
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );

  return (
    <div className="w-full py-10 bg-gradient-to-br from-indigo-50 to-purple-100 flex justify-center items-center overflow-hidden">
      <div className="flex items-center justify-center pt-4">
        
        {/* Card 1: Person */}
        <div 
            className={getCardStyle(1)}
            onClick={() => handleCardInteraction(1, personImage)}
            title="选择模特"
        >
          <div className="w-full h-full overflow-hidden rounded-lg bg-white">
            {personImage ? (
              <img src={personImage} alt="Person" className="w-full h-full object-cover" />
            ) : (
              renderPlaceholder("👤", "人物")
            )}
          </div>
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow text-gray-700 pointer-events-none">
            Step 1
          </div>
        </div>

        {/* Card 2: Clothes */}
        <div 
            className={getCardStyle(2)}
            onClick={() => handleCardInteraction(2, clothesImage)}
            title={personImage ? "选择服装" : "请先选择模特"}
        >
           <div className="w-full h-full overflow-hidden rounded-lg bg-white">
            {clothesImage ? (
              <img src={clothesImage} alt="Clothes" className="w-full h-full object-cover" />
            ) : (
              renderPlaceholder("👕", "服装")
            )}
          </div>
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow text-gray-700 pointer-events-none">
            Step 2
          </div>
        </div>

        {/* Card 3: Result */}
        <div 
            className={getCardStyle(3)}
            onClick={() => handleCardInteraction(3, resultImage)}
            title={personImage && clothesImage ? "生成效果" : "请先选择模特和服装"}
        >
           <div className="w-full h-full overflow-hidden rounded-lg bg-white">
            {resultImage ? (
              <img src={resultImage} alt="Result" className="w-full h-full object-cover" />
            ) : (
              renderPlaceholder("✨", "效果")
            )}
          </div>
           <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow text-gray-700 pointer-events-none">
            Step 3
          </div>
        </div>

      </div>

      <ImagePreviewModal 
        isOpen={!!previewImage}
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default Visualizer;