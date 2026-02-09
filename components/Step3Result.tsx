import React, { useState } from 'react';
import { generateTryOnImage } from '../services/geminiService';
import ImageWithFade from './ImageWithFade';

interface Step3ResultProps {
  personImage: string;
  clothesImage: string;
  onResultGenerated: (resultUrl: string) => void;
  onBack: () => void;
}

const PROGRESS_MESSAGES = [
  { time: 0, text: '正在连接 AI 服务器...' },
  { time: 3, text: '正在分析人物特征...' },
  { time: 8, text: '正在识别服装样式...' },
  { time: 15, text: '正在合成试穿效果...' },
  { time: 25, text: '正在优化图像细节...' },
  { time: 40, text: '即将完成，请稍候...' },
  { time: 60, text: '服务器繁忙，仍在处理中...' },
];

const Step3Result: React.FC<Step3ResultProps> = ({ personImage, clothesImage, onResultGenerated, onBack }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  const handleGenerate = async () => {
    setIsProcessing(true);
    setError(null);
    setElapsedTime(0);
    setProgressText(PROGRESS_MESSAGES[0].text);

    // 启动计时器和进度更新
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
      
      // 根据时间更新进度文字
      const currentMessage = [...PROGRESS_MESSAGES]
        .reverse()
        .find(m => elapsed >= m.time);
      if (currentMessage) {
        setProgressText(currentMessage.text);
      }
    }, 1000);

    try {
      const resultBase64 = await generateTryOnImage(personImage, clothesImage);
      clearInterval(timer);
      onResultGenerated(resultBase64);
    } catch (err: any) {
      clearInterval(timer);
      console.error("Generation failed:", err);
      let errorMessage = "生成失败，请稍后重试。";
      
      // Extract more specific error info if available
      if (err.message) {
          if (err.message.includes("API key")) {
              errorMessage = "API Key 无效或缺失，请检查配置。";
          } else if (err.message.includes("403")) {
               errorMessage = "访问被拒绝 (403)。请确保你的浏览器已开启代理 (科学上网)。";
          } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
               errorMessage = "网络连接失败。请检查你的网络代理设置 (需要连接到 Google)。";
          } else if (err.message.includes("429")) {
               errorMessage = "请求过多 (Rate Limit)，请稍后再试。";
          } else if (err.message.includes("Candidate was blocked")) {
               errorMessage = "图片生成被安全策略拦截，请尝试更换图片或描述。";
          } else {
              errorMessage = `错误: ${err.message}`;
          }
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col justify-center items-center text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-sm">3</span>
        准备就绪！
      </h2>

      <div className="flex items-center justify-center space-x-8 mb-8">
        <div className="relative">
             <ImageWithFade
               src={personImage}
               alt="Person"
               wrapperClassName="w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200"
               className="w-20 h-20 object-cover"
             />
             <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow">👤</div>
        </div>
        <div className="text-gray-300 text-2xl">+</div>
        <div className="relative">
             <ImageWithFade
               src={clothesImage}
               alt="Clothes"
               wrapperClassName="w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50"
               className="w-20 h-20 object-contain"
             />
             <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow">👕</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm max-w-md">
            {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isProcessing}
        className={`w-full max-w-sm py-4 rounded-xl font-bold text-xl text-white shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-3
            ${isProcessing ? 'bg-gray-800 cursor-not-allowed' : 'bg-black hover:bg-gray-900'}`}
      >
        {isProcessing ? (
           <>
             <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <span>{progressText}</span>
           </>
        ) : (
           <>
            <span>✨ 立即试穿</span>
           </>
        )}
      </button>

      {isProcessing && (
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-500">已用时 {elapsedTime} 秒</div>
          <div className="text-xs text-gray-400 mt-1">通常需要 15-45 秒</div>
        </div>
      )}

      <button onClick={onBack} className="mt-4 text-gray-500 hover:text-gray-800 underline text-sm">
        返回重选
      </button>

    </div>
  );
};

export default Step3Result;
