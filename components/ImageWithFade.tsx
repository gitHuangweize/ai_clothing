import React, { useEffect, useState } from 'react';

interface ImageWithFadeProps {
  src: string;
  alt: string;
  wrapperClassName?: string;
  className?: string;
  placeholderClassName?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'sync' | 'auto';
}

const ImageWithFade: React.FC<ImageWithFadeProps> = ({
  src,
  alt,
  wrapperClassName,
  className,
  placeholderClassName,
  loading = 'lazy',
  decoding = 'async',
}) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    const img = new Image();
    img.src = src;

    const markLoaded = () => {
      if (!cancelled) setLoaded(true);
    };

    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
    } else {
      img.onload = markLoaded;
      img.onerror = markLoaded;
      if ((img as any).decode) {
        (img as any).decode().then(markLoaded).catch(() => {});
      }
    }

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className={`relative ${wrapperClassName || ''}`}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`block transition-opacity duration-300 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} ${className || ''}`}
      />
      {!loaded && (
        <div
          className={`absolute inset-0 bg-gray-200 animate-pulse ${placeholderClassName || ''}`}
        />
      )}
    </div>
  );
};

export default ImageWithFade;
