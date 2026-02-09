
import React, { useEffect, useState } from 'react';
import { PRESET_PERSON_IMAGES } from '../constants';
import { convertBlobToBase64, fetchUrlToBase64, preloadImages } from '../utils/imageUtils';
import ImageWithFade from './ImageWithFade';

interface Step1PersonProps {
  onSelect: (imageUrl: string) => void;
  currentImage: string | null;
}

const Step1Person: React.FC<Step1PersonProps> = ({ onSelect, currentImage }) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'upload' | 'url'>('preset');
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPresetLoading, setIsPresetLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsPresetLoading(true);
    preloadImages(PRESET_PERSON_IMAGES)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsPresetLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      // Convert remote URL to base64 for better compatibility with Gemini
      const base64 = await fetchUrlToBase64(urlInput);
      onSelect(base64);
    } catch (error) {
      alert("无法加载该链接的图片 (可能是跨域限制)，请尝试下载后上传。");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetSelect = async (url: string) => {
      setIsLoading(true);
      try {
        const base64 = await fetchUrlToBase64(url);
        onSelect(base64);
      } catch (e) {
         console.error("Preset load failed:", e);
         alert("加载预设图片失败 (网络原因)，请重试或选择其他图片。");
      } finally {
        setIsLoading(false);
      }
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-sm">1</span>
        选择模特 / 您的照片
      </h2>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 bg-gray-100 p-1 rounded-lg w-max">
        <button
          onClick={() => setActiveTab('preset')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'preset' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          预设模特
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          上传照片
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'url' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          网络链接
        </button>
      </div>

      {/* Content Area */}
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
                <span className="text-gray-400 text-sm">正在加载预设模特...</span>
            </div>
        )}

        {!isLoading && activeTab === 'preset' && !isPresetLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {PRESET_PERSON_IMAGES.map((url, index) => (
              <button
                key={index}
                onClick={() => handlePresetSelect(url)}
                className={`relative group rounded-xl overflow-hidden aspect-[3/4] border-2 transition-all ${currentImage && currentImage.includes(url) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-blue-300'}`}
              >
                <ImageWithFade
                  src={url}
                  alt={`Preset ${index}`}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover"
                />
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
              id="person-upload"
            />
            <label htmlFor="person-upload" className="cursor-pointer flex flex-col items-center">
              <span className="text-4xl mb-2">📤</span>
              <span className="text-gray-600 font-medium">点击上传照片</span>
              <span className="text-gray-400 text-sm mt-1">支持 JPG, PNG</span>
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
              placeholder="https://example.com/photo.jpg"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!urlInput}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              确认使用
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Step1Person;
