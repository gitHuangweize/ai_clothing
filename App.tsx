import React, { useEffect, useState } from 'react';
import { AppStep, HistoryItem } from './types';
import Visualizer from './components/Visualizer';
import Step1Person from './components/Step1Person';
import Step2Clothes from './components/Step2Clothes';
import Step3Result from './components/Step3Result';
import Gallery from './components/Gallery';
import { PRESET_CLOTHES_IMAGES } from './constants';
import { preloadImages } from './utils/imageUtils';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.SELECT_PERSON);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [clothesImage, setClothesImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Pre-load from local storage if desired, keeping it simple for now
  useEffect(() => {
    const schedule = (cb: () => void) => {
      if (typeof window === 'undefined') return;
      const win = window as any;
      if (typeof win.requestIdleCallback === 'function') {
        win.requestIdleCallback(cb, { timeout: 1500 });
      } else {
        setTimeout(cb, 300);
      }
    };

    schedule(() => {
      preloadImages(PRESET_CLOTHES_IMAGES).catch(() => {});
    });

  }, []);
  
  const handlePersonSelect = (img: string) => {
    setPersonImage(img);
    // If user changes person, invalidate previous result to encourage regeneration
    if (resultImage) setResultImage(null);
    
    // Auto advance mostly, but maybe user wants to change mind. 
    // Let's auto advance for smoother flow
    setTimeout(() => setStep(AppStep.SELECT_CLOTHES), 300);
  };

  const handleClothesSelect = (img: string) => {
    setClothesImage(img);
    // If user changes clothes, invalidate previous result
    if (resultImage) setResultImage(null);

    setTimeout(() => setStep(AppStep.GENERATE_RESULT), 300);
  };

  const handleResultGenerated = (result: string) => {
    setResultImage(result);
    
    // Save to history
    if (personImage && clothesImage) {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            personUrl: personImage,
            clothesUrl: clothesImage,
            resultUrl: result,
            timestamp: Date.now()
        };
        setHistory(prev => [newItem, ...prev]);
    }
  };

  const resetProcess = () => {
    setResultImage(null);
    setStep(AppStep.SELECT_PERSON);
  };

  const goBackToClothes = () => {
      setResultImage(null);
      setStep(AppStep.SELECT_CLOTHES);
  }

  const handleStepJump = (targetStep: AppStep) => {
      // Logic for random access via cards
      if (targetStep === AppStep.SELECT_PERSON) {
          setStep(AppStep.SELECT_PERSON);
      } else if (targetStep === AppStep.SELECT_CLOTHES) {
          if (personImage) setStep(AppStep.SELECT_CLOTHES);
      } else if (targetStep === AppStep.GENERATE_RESULT) {
          if (personImage && clothesImage) setStep(AppStep.GENERATE_RESULT);
      }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md md:max-w-2xl mx-auto bg-gray-50 shadow-2xl overflow-hidden">
      
      {/* Header / Visualizer Area */}
      <Visualizer 
        step={step} 
        personImage={personImage} 
        clothesImage={clothesImage} 
        resultImage={resultImage} 
        onStepClick={handleStepJump}
      />

      {/* Main Action Area */}
      <div className="flex-1 -mt-6 relative z-30 px-4 pb-8 flex flex-col">
        <div className="w-full bg-white rounded-t-3xl shadow-lg flex-1 overflow-hidden min-h-[500px]">
            {step === AppStep.SELECT_PERSON && (
                <Step1Person 
                    onSelect={handlePersonSelect} 
                    currentImage={personImage} 
                />
            )}
            
            {step === AppStep.SELECT_CLOTHES && (
                <Step2Clothes 
                    onSelect={handleClothesSelect} 
                    personImage={personImage}
                    currentImage={clothesImage}
                />
            )}

            {step === AppStep.GENERATE_RESULT && personImage && clothesImage && !resultImage && (
                <Step3Result 
                    personImage={personImage}
                    clothesImage={clothesImage}
                    onResultGenerated={handleResultGenerated}
                    onBack={goBackToClothes}
                />
            )}

            {step === AppStep.GENERATE_RESULT && resultImage && (
                <div className="p-6 h-full flex flex-col items-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">✨ 换装完成!</h2>
                    <div className="w-full rounded-2xl overflow-hidden shadow-lg border-4 border-white mb-6">
                        <img src={resultImage} alt="Final Result" className="w-full h-auto" />
                    </div>
                    <div className="flex space-x-4">
                        <button 
                            onClick={resetProcess}
                            className="bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-black transition-transform transform active:scale-95"
                        >
                            试穿下一套
                        </button>
                        <button
                            onClick={() => handleStepJump(AppStep.SELECT_CLOTHES)}
                            className="bg-white text-gray-800 border-2 border-gray-200 px-6 py-3 rounded-full font-bold shadow-sm hover:border-gray-400 transition-colors"
                        >
                            更换服装
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Gallery Section */}
        <Gallery items={history} />
        
        {/* Footer info */}
        <div className="text-center text-gray-400 text-xs py-4">
            Powered by Gemini Nano Banana (Flash Image)
        </div>
      </div>
    </div>
  );
};

export default App;
