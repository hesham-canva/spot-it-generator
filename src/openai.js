/**
 * AI API Integration
 * - OpenAI GPT-4.1 for text generation (symbol descriptions)
 * - Leonardo.ai for image generation
 */

const STORAGE_KEY_OPENAI_API = "spotit_openai_api_key";
const STORAGE_KEY_LEONARDO_API = "spotit_leonardo_api_key";
const STORAGE_KEY_IMAGE_PREFIX = "spotit_image_";

let openaiApiKey = null;
let leonardoApiKey = null;

// Leonardo.ai Nano Banana model configuration
// Documentation: https://docs.leonardo.ai/docs/generate-images-using-nano-banana
const LEONARDO_MODEL = "gemini-2.5-flash-image";

// All style presets for Nano Banana model
// From: https://docs.leonardo.ai/docs/generate-images-using-nano-banana
export const LEONARDO_STYLES = {
  "3D Render": "debdf72a-91a4-467b-bf61-cc02bdeb69c6",
  Acrylic: "3cbb655a-7ca4-463f-b697-8a03ad67327c",
  Creative: "6fedbf1f-4a17-45ec-84fb-92fe524a29ef",
  Dynamic: "111dc692-d470-4eec-b791-3475abac4c46",
  Fashion: "594c4a08-a522-4e0e-b7ff-e4dac4b6b622",
  "Game Concept": "09d2b5b5-d7c5-4c02-905d-9f84051640f4",
  "Graphic Design 2D": "703d6fe5-7f1c-4a9e-8da0-5331f214d5cf",
  "Graphic Design 3D": "7d7c2bc5-4b12-4ac3-81a9-630057e9e89f",
  Illustration: "645e4195-f63d-4715-a3f2-3fb1e6eb8c70",
  None: "556c1ee5-ec38-42e8-955a-1e82dad0ffa1",
  Portrait: "8e2bc543-6ee2-45f9-bcd9-594b6ce84dcd",
  "Portrait Cinematic": "4edb03c9-8a26-4041-9d01-f85b5d4abd71",
  "Portrait Fashion": "0d34f8e1-46d4-428f-8ddd-4b11811fa7c9",
  "Pro B&W Photography": "22a9a7d2-2166-4d86-80ff-22e2643adbcf",
  "Pro Color Photography": "7c3f932b-a572-47cb-9b9b-f20211e63b5b",
  "Pro Film Photography": "581ba6d6-5aac-4492-bebe-54c424a0d46e",
  "Ray Traced": "b504f83c-3326-4947-82e1-7fe9e839ec0f",
  "Stock Photo": "5bdc3f2a-1be6-4d1c-8e77-992a30824a2c",
  Watercolor: "1db308ce-c7ad-4d10-96fd-592fa6b75cc4",
};

// Default style for image generation
const STORAGE_KEY_STYLE = "spotit_leonardo_style";
let selectedStyle = "Illustration"; // Default to Illustration for icon-style images

/**
 * Set the Leonardo style
 * @param {string} styleName - Style name (key from LEONARDO_STYLES)
 */
export function setLeonardoStyle(styleName) {
  if (LEONARDO_STYLES[styleName]) {
    selectedStyle = styleName;
    localStorage.setItem(STORAGE_KEY_STYLE, styleName);
  }
}

/**
 * Get the selected Leonardo style name
 * @returns {string}
 */
export function getLeonardoStyle() {
  const saved = localStorage.getItem(STORAGE_KEY_STYLE);
  if (saved && LEONARDO_STYLES[saved]) {
    selectedStyle = saved;
  }
  return selectedStyle;
}

/**
 * Get the style ID for the current selection
 * @returns {string}
 */
export function getLeonardoStyleId() {
  return LEONARDO_STYLES[getLeonardoStyle()];
}

/**
 * Set the OpenAI API key
 * @param {string} key - OpenAI API key
 */
export function setOpenAIApiKey(key) {
  openaiApiKey = key;
  localStorage.setItem(STORAGE_KEY_OPENAI_API, key);
}

/**
 * Get the stored OpenAI API key
 * @returns {string|null}
 */
export function getOpenAIApiKey() {
  if (!openaiApiKey) {
    openaiApiKey = localStorage.getItem(STORAGE_KEY_OPENAI_API);
  }
  return openaiApiKey;
}

/**
 * Set the Leonardo API key
 * @param {string} key - Leonardo API key
 */
export function setLeonardoApiKey(key) {
  leonardoApiKey = key;
  localStorage.setItem(STORAGE_KEY_LEONARDO_API, key);
}

/**
 * Get the stored Leonardo API key
 * @returns {string|null}
 */
export function getLeonardoApiKey() {
  if (!leonardoApiKey) {
    leonardoApiKey = localStorage.getItem(STORAGE_KEY_LEONARDO_API);
  }
  return leonardoApiKey;
}

/**
 * Legacy compatibility - set both API keys
 * @param {string} openaiKey - OpenAI API key
 * @param {string} leonardoKey - Leonardo API key
 */
export function setApiKeys(openaiKey, leonardoKey) {
  setOpenAIApiKey(openaiKey);
  setLeonardoApiKey(leonardoKey);
}

/**
 * Clear all stored API keys
 */
export function clearApiKeys() {
  openaiApiKey = null;
  leonardoApiKey = null;
  localStorage.removeItem(STORAGE_KEY_OPENAI_API);
  localStorage.removeItem(STORAGE_KEY_LEONARDO_API);
}

/**
 * Generate unique symbol descriptions using GPT-4.1
 * @param {string} theme - Optional theme to guide generation
 * @param {number} count - Number of symbols to generate
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string[]>} Array of symbol descriptions
 */
export async function generateDescriptions(
  theme = "",
  count = 57,
  onProgress = null
) {
  const key = getOpenAIApiKey();
  if (!key) {
    throw new Error("OpenAI API key not set");
  }

  const themePrompt = theme
    ? `The theme is "${theme}". All symbols should relate to this theme.`
    : "Use a diverse mix of everyday objects, animals, food, nature, and simple shapes.";

  const prompt = `Generate exactly ${count} unique, simple symbol descriptions for a Spot It card game. Each description should be:
- A simple, recognizable object or symbol (1-4 words)
- Visually distinct from others
- Easy to identify quickly
- Suitable for all ages

${themePrompt}

Format: Return ONLY a JSON array of ${count} strings, no other text.
Example format: ["red apple", "yellow sun", "blue star", ...]`;

  if (onProgress) onProgress(0, "Generating symbol descriptions...");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that generates creative, distinct symbol ideas for card games. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error?.message || "Failed to generate descriptions"
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Parse JSON from response
    let descriptions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        descriptions = JSON.parse(jsonMatch[0]);
      } else {
        descriptions = JSON.parse(content);
      }
    } catch (e) {
      throw new Error("Failed to parse AI response as JSON");
    }

    if (!Array.isArray(descriptions) || descriptions.length < count) {
      throw new Error(
        `Expected ${count} descriptions, got ${descriptions?.length || 0}`
      );
    }

    if (onProgress) onProgress(100, "Descriptions generated!");

    return descriptions.slice(0, count);
  } catch (error) {
    console.error("Description generation error:", error);
    throw error;
  }
}

/**
 * Generate a single image using Leonardo.ai Nano Banana model
 * Uses V2 API endpoint: https://cloud.leonardo.ai/api/rest/v2/generations
 * @param {string} description - Symbol description
 * @param {number} index - Symbol index for tracking
 * @returns {Promise<string>} Image URL
 */
export async function generateImage(description, index = 0) {
  const key = getLeonardoApiKey();
  if (!key) {
    throw new Error("Leonardo API key not set");
  }
  const prompt = `A single ${description}, just one, not multiple. Centered composition, completely white background, no text, no duplicates, only one subject in the image. Clean, icon style suitable for a card game symbol. There should be no frames or cirlces, only the subject.`;

  try {
    // Step 1: Create a generation request using V2 API with Nano Banana
    const createResponse = await fetch(
      "https://cloud.leonardo.ai/api/rest/v2/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: LEONARDO_MODEL,
          parameters: {
            width: 1024,
            height: 1024,
            prompt: prompt,
            quantity: 1,
            style_ids: [getLeonardoStyleId()],
            prompt_enhance: "OFF",
          },
          public: false,
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(
        error.error?.message || error.message || "Failed to create generation"
      );
    }

    const createData = await createResponse.json();
    // V2 API returns generationId inside "generate" object
    const generationId =
      createData.generate?.generationId || createData.generationId;

    if (!generationId) {
      console.error("Unexpected API response:", createData);
      throw new Error("No generation ID received");
    }

    // Step 2: Poll for completion
    const imageUrl = await pollForGenerationComplete(key, generationId);

    // Step 3: Fetch the image and convert to base64 for caching
    const imageData = await fetchImageAsBase64(imageUrl);

    return imageData;
  } catch (error) {
    console.error(`Image generation error for "${description}":`, error);
    throw error;
  }
}

/**
 * Poll Leonardo.ai for generation completion
 * Works with both V1 and V2 API responses
 * @param {string} apiKey - Leonardo API key
 * @param {string} generationId - Generation ID to poll
 * @param {number} maxAttempts - Maximum polling attempts
 * @returns {Promise<string>} Image URL
 */
async function pollForGenerationComplete(
  apiKey,
  generationId,
  maxAttempts = 60
) {
  const pollInterval = 2000; // 2 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    // Use V1 endpoint for polling (works for both V1 and V2 generations)
    const response = await fetch(
      `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      continue; // Retry on error
    }

    const data = await response.json();
    const generation = data.generations_by_pk;

    if (generation?.status === "COMPLETE") {
      // Check for images in the response (handles both V1 and V2 response formats)
      const images = generation.generated_images || generation.images;
      if (images?.length > 0) {
        return images[0].url;
      }
    }

    if (generation?.status === "FAILED") {
      throw new Error("Image generation failed");
    }
  }

  throw new Error("Image generation timed out");
}

/**
 * Fetch an image URL and convert to base64 data URL
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 data URL
 */
async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Rate limiter for Leonardo.ai API
 * - Max 10 concurrent generations
 * - Max 100 requests per minute
 */
class RateLimiter {
  constructor(maxConcurrent = 10, maxPerMinute = 100) {
    this.maxConcurrent = maxConcurrent;
    this.maxPerMinute = maxPerMinute;
    this.activeCount = 0;
    this.requestTimestamps = [];
    this.queue = [];
  }

  async acquire() {
    // Wait until we can make a request
    while (this.activeCount >= this.maxConcurrent || this.isRateLimited()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.cleanupTimestamps();
    }

    this.activeCount++;
    this.requestTimestamps.push(Date.now());
  }

  release() {
    this.activeCount--;
  }

  isRateLimited() {
    this.cleanupTimestamps();
    return this.requestTimestamps.length >= this.maxPerMinute;
  }

  cleanupTimestamps() {
    const oneMinuteAgo = Date.now() - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo
    );
  }

  getStatus() {
    this.cleanupTimestamps();
    return {
      active: this.activeCount,
      requestsThisMinute: this.requestTimestamps.length,
    };
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(10, 100);

/**
 * Generate a single image with rate limiting and retry logic
 * @param {string} description - Symbol description
 * @param {number} index - Symbol index
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<string>} Image data URL
 */
async function generateImageWithRateLimit(description, index, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await rateLimiter.acquire();

      try {
        const result = await generateImage(description, index);
        return result;
      } finally {
        rateLimiter.release();
      }
    } catch (error) {
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimitError =
        error.message?.includes("rate") ||
        error.message?.includes("429") ||
        error.message?.includes("too many");

      if (isRateLimitError && attempt < maxRetries - 1) {
        // Wait longer before retry on rate limit
        const waitTime = (attempt + 1) * 10000; // 10s, 20s, 30s
        console.warn(
          `Rate limit hit for "${description}", waiting ${
            waitTime / 1000
          }s before retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else if (attempt < maxRetries - 1) {
        // Regular error, shorter wait
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  throw lastError;
}

/**
 * Generate all images with concurrency control and rate limiting
 * Leonardo.ai limits: 10 concurrent, 100 per minute
 * @param {string[]} descriptions - Array of symbol descriptions
 * @param {function} onProgress - Progress callback (current, total, status)
 * @param {function} onImageComplete - Called when each image completes (index, imageData)
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<string[]>} Array of image data URLs
 */
export async function generateAllImages(
  descriptions,
  onProgress = null,
  onImageComplete = null,
  signal = null
) {
  const images = new Array(descriptions.length).fill(null);
  const failed = [];
  let completed = 0;

  // Process in batches of 10 (max concurrent)
  const batchSize = 10;

  for (let i = 0; i < descriptions.length; i += batchSize) {
    if (signal?.aborted) {
      throw new Error("Generation cancelled");
    }

    const batchStart = i;
    const batchEnd = Math.min(i + batchSize, descriptions.length);
    const batch = descriptions.slice(batchStart, batchEnd);

    const status = rateLimiter.getStatus();
    if (onProgress) {
      onProgress(
        completed,
        descriptions.length,
        `Generating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          descriptions.length / batchSize
        )} (${status.requestsThisMinute}/100 requests this minute)...`
      );
    }

    // Process batch concurrently (up to 10 at a time)
    const batchPromises = batch.map(async (desc, j) => {
      const index = batchStart + j;

      if (signal?.aborted) {
        return;
      }

      try {
        const imageData = await generateImageWithRateLimit(desc, index);
        images[index] = imageData;
        completed++;

        cacheImage(index, imageData);

        if (onImageComplete) {
          onImageComplete(index, imageData);
        }
        if (onProgress) {
          const status = rateLimiter.getStatus();
          onProgress(
            completed,
            descriptions.length,
            `Generated: ${desc} (${status.active} active, ${status.requestsThisMinute}/100 this minute)`
          );
        }
      } catch (error) {
        console.error(`Failed to generate image ${index}:`, error);
        failed.push({ index, description: desc, error: error.message });
        completed++;

        if (onImageComplete) {
          onImageComplete(index, null, error);
        }
        if (onProgress) {
          onProgress(
            completed,
            descriptions.length,
            `Failed: ${desc} - ${error.message}`
          );
        }
      }
    });

    // Wait for all in batch to complete
    await Promise.all(batchPromises);

    // Brief pause between batches to avoid overwhelming the API
    if (batchEnd < descriptions.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (failed.length > 0) {
    console.warn(`${failed.length} images failed to generate:`, failed);
  }

  return images;
}

/**
 * Cache an image in localStorage
 * @param {number} index - Symbol index
 * @param {string} imageData - Base64 image data
 */
export function cacheImage(index, imageData) {
  try {
    localStorage.setItem(`${STORAGE_KEY_IMAGE_PREFIX}${index}`, imageData);
  } catch (e) {
    console.warn("Cache quota exceeded, clearing old images");
    clearImageCache();
  }
}

/**
 * Get cached image
 * @param {number} index - Symbol index
 * @returns {string|null}
 */
export function getCachedImage(index) {
  return localStorage.getItem(`${STORAGE_KEY_IMAGE_PREFIX}${index}`);
}

/**
 * Get all cached images
 * @param {number} count - Number of images to retrieve
 * @returns {string[]}
 */
export function getAllCachedImages(count = 57) {
  const images = [];
  for (let i = 0; i < count; i++) {
    images.push(getCachedImage(i));
  }
  return images;
}

/**
 * Clear all cached images
 * @param {number} maxCount - Maximum number of cached images to clear
 */
export function clearImageCache(maxCount = 57) {
  for (let i = 0; i < maxCount; i++) {
    localStorage.removeItem(`${STORAGE_KEY_IMAGE_PREFIX}${i}`);
  }
}

/**
 * Check if all images are cached
 * @returns {boolean}
 */
export function hasAllCachedImages() {
  for (let i = 0; i < 57; i++) {
    if (!getCachedImage(i)) {
      return false;
    }
  }
  return true;
}
