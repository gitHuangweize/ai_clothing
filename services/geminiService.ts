// ============ 配置 ============
const TIMEOUT_MS = 90000; // 90秒超时
const MAX_RETRIES = 2; // 最大重试次数

// ============ 缓存 ============
const tryOnCache = new Map<string, string>();
const clothesCache = new Map<string, string>();
const TRY_ON_CACHE_PREFIX = 'ai-try-on:tryon:';
const CLOTHES_CACHE_PREFIX = 'ai-try-on:clothes:';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const getStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

const readCache = (key: string): string | null => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; v: string };
    if (!parsed?.t || !parsed?.v) return null;
    if (Date.now() - parsed.t > CACHE_TTL_MS) {
      storage.removeItem(key);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
};

const writeCache = (key: string, value: string) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // Ignore quota errors
  }
};

// 生成缓存 key (使用完整字符串 hash)
const generateCacheKey = (...args: string[]): string => {
  const combined = args.join('|');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
};

// ============ 带超时的 fetch ============
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

// ============ 带重试的请求 ============
const fetchWithRetry = async (
  url: string, 
  options: RequestInit, 
  maxRetries: number = MAX_RETRIES
): Promise<Response> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, TIMEOUT_MS);
      
      // 429 (Rate Limit) 时重试
      if (response.status === 429 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); // 递增等待
        continue;
      }
      
      return response;
    } catch (err: any) {
      lastError = err;
      
      // 超时或网络错误时重试
      if (err.name === 'AbortError') {
        lastError = new Error('请求超时，服务器响应过慢');
      }
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
    }
  }
  
  throw lastError || new Error('请求失败');
};

/**
 * Generates an image of a person wearing specific clothes.
 * @param personBase64 Base64 string of the person
 * @param clothesBase64 Base64 string of the clothes
 */
export const generateTryOnImage = async (personBase64: string, clothesBase64: string): Promise<string> => {
  // 检查缓存
  const cacheKey = generateCacheKey(personBase64, clothesBase64);
  const memoryCached = tryOnCache.get(cacheKey);
  if (memoryCached) {
    console.log('[Cache] 使用缓存的试穿结果');
    return memoryCached;
  }

  const storageKey = `${TRY_ON_CACHE_PREFIX}${cacheKey}`;
  const storageCached = readCache(storageKey);
  if (storageCached) {
    tryOnCache.set(cacheKey, storageCached);
    console.log('[Cache] 使用本地存储的试穿结果');
    return storageCached;
  }

  const response = await fetchWithRetry('/api/generate-try-on', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personBase64, clothesBase64 }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  // 存入缓存
  tryOnCache.set(cacheKey, data.output);
  writeCache(storageKey, data.output);
  
  return data.output;
};

/**
 * Generates an image of clothes based on a text prompt.
 * @param prompt User description of clothes
 */
export const generateClothesFromText = async (prompt: string): Promise<string> => {
  // 检查缓存
  const cacheKey = generateCacheKey(prompt);
  const memoryCached = clothesCache.get(cacheKey);
  if (memoryCached) {
    console.log('[Cache] 使用缓存的服装生成结果');
    return memoryCached;
  }

  const storageKey = `${CLOTHES_CACHE_PREFIX}${cacheKey}`;
  const storageCached = readCache(storageKey);
  if (storageCached) {
    clothesCache.set(cacheKey, storageCached);
    console.log('[Cache] 使用本地存储的服装生成结果');
    return storageCached;
  }

  const response = await fetchWithRetry('/api/generate-clothes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  // 存入缓存
  clothesCache.set(cacheKey, data.output);
  writeCache(storageKey, data.output);
  
  return data.output;
};
