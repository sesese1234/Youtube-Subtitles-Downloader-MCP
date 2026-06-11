import { YouTubeTimedTextResponse, SubtitleEntry } from './types.js';

interface AutoSubtitleData {
  videoId: string;
  language: string;
  data: YouTubeTimedTextResponse;
  timestamp: number;
}

const autoSubtitleStore: Record<string, AutoSubtitleData> = {};

export function setAutoSubtitle(videoId: string, language: string, data: YouTubeTimedTextResponse) {
  // Store using videoId as the key. If language is missing, use a fallback
  const key = videoId || 'unknown';
  autoSubtitleStore[key] = {
    videoId,
    language,
    data,
    timestamp: Date.now()
  };
}

export function getAutoSubtitle(videoId: string): AutoSubtitleData | undefined {
  return autoSubtitleStore[videoId];
}

export function getAllAutoSubtitles(): AutoSubtitleData[] {
  return Object.values(autoSubtitleStore).sort((a, b) => b.timestamp - a.timestamp);
}
