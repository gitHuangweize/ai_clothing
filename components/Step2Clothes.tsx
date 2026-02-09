
import React, { useEffect, useMemo, useState } from 'react';
import { PRESET_CLOTHES_IMAGES } from '../constants';
import { convertBlobToBase64, fetchUrlToBase64, preloadImages } from '../utils/imageUtils';
import ImageWithFade from './ImageWithFade';
import { generateClothesFromText } from '../services/geminiService';

interface Step2ClothesProps {
  onSelect: (imageUrl: string) => void;
  personImage: string | null;
  currentImage: string | null;
}

const Step2Clothes: React.FC<Step2ClothesProps> = ({ onSelect, personImage, currentImage }) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'upload' | 'ai' | 'url'>('preset');
  const [customPresets, setCustomPresets] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingTime, setGeneratingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isPresetLoading, setIsPresetLoading] = useState(true);

  // Handle Preset Selection (Base64 conversion needed for API)
  const handlePresetSelect = async (url: string) => {
    try {
        if (url.startsWith('data:')) {
            onSelect(url);
            return;
        }
        setIsLoading(true);
        const base64 = await fetchUrlToBase64(url);
        onSelect(base64);
    } catch (e) {
        console.error("Preset clothes load failed", e);
        alert("加载预设图片失败 (网络原因)，请重试。");
    } finally {
        setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await convertBlobToBase64(e.target.files[0]);
        onSelect(base64);
      } catch (err) {
        alert("图片读取失败");
      }
    }
  };

  const handleUrlSubmit = async () => {
      if (!urlInput) return;
      setIsLoading(true);
      try {
        const base64 = await fetchUrlToBase64(urlInput);
        onSelect(base64);
      } catch (error) {
        alert("无法加载该链接的图片。");
      } finally {
        setIsLoading(false);
      }
  };

  const handleAiGeneration = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratingTime(0);

    // 启动计时器
    const timer = setInterval(() => {
      setGeneratingTime(prev => prev + 1);
    }, 1000);

    try {
      const generatedImage = await generateClothesFromText(prompt);
      clearInterval(timer);
      setCustomPresets(prev => [generatedImage, ...prev]);
      onSelect(generatedImage);
      setActiveTab('preset'); // Switch to preset to show the result
    } catch (error: any) {
      clearInterval(timer);
      const msg = error.message?.includes('超时') 
        ? '请求超时，请重试' 
        : '生成服装失败，请重试';
      alert(msg);
    } finally {
      setIsGenerating(false);
      setGeneratingTime(0);
    }
  };

  // Combine original presets and generated/custom presets
  const allPresets = useMemo(() => [...customPresets, ...PRESET_CLOTHES_IMAGES], [customPresets]);

  useEffect(() => {
    let cancelled = false;
    setIsPresetLoading(true);
    preloadImages(PRESET_CLOTHES_IMAGES)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsPresetLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col relative">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-sm">2</span>
          选择或生成服装
        </h2>
        {/* Step 1 Preview Mini Badge */}
        {personImage && (
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                <span className="text-xs text-gray-400">当前模特:</span>
                <ImageWithFade
                  src={personImage}
                  alt="Selected Person"
                  wrapperClassName="w-6 h-6 rounded-full overflow-hidden"
                  className="w-6 h-6 object-cover"
                />
            </div>
        )}
      </div>

      <div className="flex space-x-2 mb-6 bg-gray-100 p-1 rounded-lg w-max overflow-x-auto max-w-full">
        <button onClick={() => setActiveTab('preset')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'preset' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>衣柜</button>
        <button onClick={() => setActiveTab('upload')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>上传</button>
        <button onClick={() => setActiveTab('url')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'url' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>链接</button>
        <button onClick={() => setActiveTab('ai')} className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${activeTab === 'ai' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm' : 'text-purple-600 hover:text-purple-700'}`}>
           ✨ AI 设计
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar min-h-[300px]">
        {isLoading && (
            <div className="flex flex-col items-center justify-center h-40 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-400 text-sm">正在加载图片...</span>
            </div>
        )}

        {!isLoading && activeTab === 'preset' && isPresetLoading && (
          <div className="flex flex-col items-center justify-center h-40 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-400 text-sm">正在加载衣柜...</span>
          </div>
        )}

        {!isLoading && activeTab === 'preset' && !isPresetLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allPresets.map((url, index) => (
              <button
                key={index}
                onClick={() => handlePresetSelect(url)}
                className="relative group rounded-xl overflow-hidden aspect-square border-2 border-transparent hover:border-blue-300 transition-all focus:ring-2 focus:ring-blue-500 bg-gray-50"
              >
                <ImageWithFade
                  src={url}
                  alt={`Clothes ${index}`}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-contain p-2"
                />
                {customPresets.includes(url) && (
                    <span className="absolute top-1 right-1 bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">AI</span>
                )}
              </button>
            ))}
          </div>
        )}

        {!isLoading && activeTab === 'upload' && (
           <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
             <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload} 
              className="hidden" 
              id="clothes-upload"
            />
            <label htmlFor="clothes-upload" className="cursor-pointer flex flex-col items-center">
              <span className="text-4xl mb-2">🧥</span>
              <span className="text-gray-600 font-medium">点击上传服装</span>
            </label>
          </div>
        )}

        {!isLoading && activeTab === 'url' && (
           <div className="flex flex-col h-full justify-center space-y-4 max-w-md mx-auto">
            <label className="text-sm font-medium text-gray-700">图片链接</label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/clothes.jpg"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!urlInput}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              确认使用
            </button>
          </div>
        )}

        {!isLoading && activeTab === 'ai' && (
          <div className="flex flex-col h-full space-y-4">
             <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <label className="text-sm font-bold text-purple-900 mb-2 block">描述你想设计的衣服</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例如：一件红色的丝绸晚礼服，露肩设计，金色刺绣..."
                  className="w-full p-3 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-400 outline-none min-h-[120px] text-sm"
                />
             </div>
             
             <button
               onClick={handleAiGeneration}
               disabled={isGenerating || !prompt}
               className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-2
                 ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'}`}
             >
               {isGenerating ? (
                   <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>正在设计中... ({generatingTime}s)</span>
                   </>
               ) : (
                   <>
                    <span>✨ 开始生成</span>
                   </>
               )}
             </button>
             <p className="text-xs text-gray-400 text-center">生成后的图片将自动加入您的衣柜</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Step2Clothes;
