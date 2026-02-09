import React from 'react';
import ImageWithFade from './ImageWithFade';
import { HistoryItem } from '../types';

interface GalleryProps {
  items: HistoryItem[];
}

const Gallery: React.FC<GalleryProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-gray-700 mb-4 px-2">历史记录</h3>
      <div className="flex space-x-4 overflow-x-auto pb-6 px-2 no-scrollbar">
        {items.map((item) => (
          <div key={item.id} className="flex-shrink-0 w-32 md:w-40 flex flex-col group cursor-pointer">
            <div className="relative rounded-xl overflow-hidden shadow-md aspect-[3/4] mb-2">
                <ImageWithFade
                  src={item.resultUrl}
                  alt="Result"
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-300"
                />
                <a href={item.resultUrl} download={`tryon-${item.id}.png`} className="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-full hover:bg-white text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" title="下载">
                   ⬇️
                </a>
            </div>
            <div className="flex space-x-1 justify-center opacity-50">
                <ImageWithFade
                  src={item.personUrl}
                  alt="Person"
                  wrapperClassName="w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm"
                  className="w-6 h-6 object-cover"
                />
                <ImageWithFade
                  src={item.clothesUrl}
                  alt="Clothes"
                  wrapperClassName="w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm bg-gray-100"
                  className="w-6 h-6 object-contain"
                />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;
