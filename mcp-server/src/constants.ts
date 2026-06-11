/**
 * Configuration constants and language mappings.
 * All configurable values read from env vars with sensible defaults.
 */

// ── Server config ──

export const MCP_SERVER_NAME = 'youtube-subtitles';
export const MCP_SERVER_VERSION = '1.0.0';
export const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT || '3847', 10);
export const BRIDGE_HOST = process.env.BRIDGE_HOST || '127.0.0.1';

// ── Rate limiting ──

export const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '30', 10);
export const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

// ── YouTube ──

export const YOUTUBE_VIDEO_URL_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
export const YOUTUBE_INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
export const YOUTUBE_INNERTUBE_CLIENT_VERSION = '2.20240101.00.00';

// ── Language code → display name (70+ languages) ──

export const LANGUAGE_NAMES: Record<string, string> = {
  // Major world languages
  'en': 'English', 'en-GB': 'English (UK)', 'en-IN': 'English (India)',
  'es': 'Spanish', 'es-419': 'Spanish (Latin America)', 'es-US': 'Spanish (US)',
  'pt': 'Portuguese', 'pt-PT': 'Portuguese (Portugal)', 'pt-BR': 'Portuguese (Brazil)',
  'fr': 'French', 'fr-CA': 'French (Canada)',
  'de': 'German', 'it': 'Italian', 'nl': 'Dutch',
  // Asian languages
  'ja': 'Japanese', 'ko': 'Korean',
  'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)', 'zh-HK': 'Chinese (Hong Kong)',
  'zh': 'Chinese', 'zh-Hans': 'Chinese (Simplified)', 'zh-Hant': 'Chinese (Traditional)',
  'hi': 'Hindi', 'bn': 'Bengali', 'ta': 'Tamil', 'te': 'Telugu',
  'mr': 'Marathi', 'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam',
  'pa': 'Punjabi', 'or': 'Odia', 'as': 'Assamese', 'ne': 'Nepali', 'si': 'Sinhala',
  'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian', 'ms': 'Malay',
  'fil': 'Filipino', 'my': 'Burmese', 'km': 'Khmer', 'lo': 'Lao',
  // European languages
  'ru': 'Russian', 'uk': 'Ukrainian', 'pl': 'Polish', 'cs': 'Czech',
  'sk': 'Slovak', 'hu': 'Hungarian', 'ro': 'Romanian', 'bg': 'Bulgarian',
  'sr': 'Serbian', 'sr-Latn': 'Serbian (Latin)', 'hr': 'Croatian', 'sl': 'Slovenian',
  'el': 'Greek', 'tr': 'Turkish', 'sv': 'Swedish', 'da': 'Danish',
  'no': 'Norwegian', 'fi': 'Finnish', 'et': 'Estonian', 'lv': 'Latvian', 'lt': 'Lithuanian',
  'is': 'Icelandic', 'sq': 'Albanian', 'mk': 'Macedonian', 'be': 'Belarusian',
  'bs': 'Bosnian', 'ca': 'Catalan', 'gl': 'Galician', 'eu': 'Basque',
  // Middle Eastern & African languages
  'ar': 'Arabic', 'he': 'Hebrew', 'iw': 'Hebrew', 'fa': 'Persian', 'ur': 'Urdu',
  'sw': 'Swahili', 'af': 'Afrikaans', 'am': 'Amharic', 'zu': 'Zulu',
  // Central Asian languages
  'ka': 'Georgian', 'hy': 'Armenian', 'az': 'Azerbaijani',
  'kk': 'Kazakh', 'ky': 'Kyrgyz', 'uz': 'Uzbek', 'mn': 'Mongolian',
};

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || LANGUAGE_NAMES[code.split('-')[0]] || code.toUpperCase();
}
