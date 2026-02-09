
export type ImageCompressionOptions = {
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number;
  quality?: number;
  outputType?: 'image/jpeg' | 'image/webp' | 'image/png';
};

const DEFAULT_MAX_DIM = 1024;
const DEFAULT_MAX_BYTES = 1_200_000; // ~1.2MB
const DEFAULT_QUALITY = 0.82;
const DEFAULT_OUTPUT_TYPE: ImageCompressionOptions['outputType'] = 'image/jpeg';

const blobFromCanvas = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to Blob failed'));
      },
      type,
      quality
    );
  });

export const compressImage = async (file: Blob, options: ImageCompressionOptions = {}): Promise<Blob> => {
  const {
    maxWidth = DEFAULT_MAX_DIM,
    maxHeight = DEFAULT_MAX_DIM,
    maxBytes = DEFAULT_MAX_BYTES,
    quality = DEFAULT_QUALITY,
    outputType = DEFAULT_OUTPUT_TYPE,
  } = options;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.src = dataUrl;
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
  });

  let width = img.width;
  let height = img.height;

  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0, width, height);

  let currentQuality = quality;
  let blob = await blobFromCanvas(canvas, outputType, currentQuality);

  if (outputType !== 'image/png') {
    const qualitySteps = [0.72, 0.62, 0.52, 0.42];
    for (const step of qualitySteps) {
      if (blob.size <= maxBytes) break;
      currentQuality = Math.min(currentQuality, step);
      blob = await blobFromCanvas(canvas, outputType, currentQuality);
    }
  }

  return blob;
};

export const convertBlobToBase64 = async (
  blob: Blob,
  options: ImageCompressionOptions = {}
): Promise<string> => {
  try {
    blob = await compressImage(blob, options);
  } catch (e) {
    console.warn('Compression failed, using original', e);
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(blob);
  });
};

export const fetchUrlToBase64 = async (
  url: string,
  options: ImageCompressionOptions = {}
): Promise<string> => {
  const attemptFetch = async (targetUrl: string) => {
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    return await convertBlobToBase64(blob, options);
  };

  try {
    // 1. Try direct fetch first (works if CORS is enabled on source)
    return await attemptFetch(url);
  } catch (error) {
    // 2. Try wsrv.nl (standard image proxy)
    try {
      // Note: wsrv.nl expects the URL to be encoded
      const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`;
      return await attemptFetch(proxyUrl);
    } catch (proxyError1) {
       // 3. Try allorigins.win (general CORS proxy)
       try {
          const proxyUrl2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          return await attemptFetch(proxyUrl2);
       } catch (proxyError2) {
          // 4. Try CodeTabs (another fallback)
          try {
             const proxyUrl3 = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
             return await attemptFetch(proxyUrl3);
          } catch (proxyError3) {
             console.error("All proxies failed:", proxyError3);
             throw new Error("无法加载图片 (跨域限制)。请尝试下载图片后上传本地文件。");
          }
       }
    }
  }
};

export const stripBase64Header = (base64Str: string): string => {
  if (!base64Str.startsWith('data:')) return base64Str;
  return base64Str.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
};

export const getMimeTypeFromBase64 = (base64Str: string): string => {
  const match = base64Str.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
  if (match && match[1]) {
    return `image/${match[1]}`;
  }
  return 'image/png'; // Default
};

export const preloadImages = async (urls: string[]): Promise<void> => {
  const unique = Array.from(new Set(urls)).filter(Boolean);
  await Promise.all(
    unique.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
          if ((img as any).decode) {
            (img as any).decode().then(resolve).catch(resolve);
          }
        })
    )
  );
};
