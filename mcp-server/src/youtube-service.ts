/**
 * Core YouTube subtitle extraction service.
 * Fetches player data via InnerTube API (no auth/cookies needed),
 * extracts caption tracks, and converts subtitle formats.
 */

import {
  YOUTUBE_VIDEO_URL_REGEX,
  YOUTUBE_INNERTUBE_API_KEY,
  YOUTUBE_INNERTUBE_CLIENT_VERSION,
  getLanguageName,
} from './constants.js';
import { logger } from './logger.js';
import type {
  PlayerResponse,
  CaptionTrack,
  YouTubeTimedTextResponse,
  SubtitleEntry,
  SubtitleResult,
  LanguageListResult,
  LanguageInfo,
  SubtitleError as SubtitleErrorType,
} from './types.js';
import { SubtitleError } from './types.js';

// ── Helpers ──

export function extractVideoId(input: string): string {
  // Direct video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  const match = input.match(YOUTUBE_VIDEO_URL_REGEX);
  if (!match) {
    throw new SubtitleError(
      `Invalid YouTube URL or video ID: "${input}"`,
      'INVALID_INPUT'
    );
  }
  return match[1];
}

function formatTimeSRT(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mmm = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(mmm).padStart(3, '0')}`;
}

// ── InnerTube API ──

async function fetchPlayerResponse(videoId: string): Promise<PlayerResponse> {
  const url = `https://www.youtube.com/youtubei/v1/player?key=${YOUTUBE_INNERTUBE_API_KEY}`;

  const body = {
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: YOUTUBE_INNERTUBE_CLIENT_VERSION,
        hl: 'en',
        gl: 'US',
      },
    },
    videoId,
  };

  logger.debug('Fetching player response', { videoId });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new SubtitleError(
      `YouTube API returned HTTP ${response.status}`,
      'YOUTUBE_API_ERROR',
      response.status
    );
  }

  const data = (await response.json()) as PlayerResponse;

  if (!data.videoDetails) {
    throw new SubtitleError(
      'Video not found or is unavailable',
      'VIDEO_NOT_FOUND'
    );
  }

  return data;
}

// ── Caption track extraction ──

function extractTrackDisplayName(track: CaptionTrack): string {
  if (track.name?.simpleText) return track.name.simpleText.replace(/\s*\(auto-generated\)\s*/i, '').trim();
  if (track.name?.runs?.[0]?.text) return track.name.runs[0].text.replace(/\s*\(auto-generated\)\s*/i, '').trim();
  return getLanguageName(track.languageCode);
}

function parseCaptionTracks(playerResponse: PlayerResponse): {
  tracks: CaptionTrack[];
  translationLanguages: Array<{ code: string; name: string }>;
} {
  const renderer = playerResponse.captions?.playerCaptionsTracklistRenderer;
  if (!renderer) {
    return { tracks: [], translationLanguages: [] };
  }

  const tracks = renderer.captionTracks || [];
  const translationLanguages = (renderer.translationLanguages || []).map((tl) => ({
    code: tl.languageCode,
    name: tl.languageName?.simpleText || tl.languageName?.runs?.[0]?.text || tl.languageCode,
  }));

  return { tracks, translationLanguages };
}

// ── Subtitle fetching ──

async function fetchTimedText(baseUrl: string, targetLang?: string): Promise<{
  data: YouTubeTimedTextResponse;
  actualLang: string;
  actualKind: string;
}> {
  const url = new URL(baseUrl);

  // Ensure JSON format
  url.searchParams.set('fmt', 'json3');

  const originalLang = url.searchParams.get('lang') || 'en';
  const kind = url.searchParams.get('kind') || '';

  // If a target language is requested and differs, set tlang
  if (targetLang && targetLang !== originalLang) {
    url.searchParams.set('tlang', targetLang);
  }

  logger.debug('Fetching timed text', { url: url.toString() });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new SubtitleError(
      `Failed to fetch subtitles (HTTP ${response.status})`,
      'SUBTITLE_FETCH_ERROR',
      response.status
    );
  }

  const data = (await response.json()) as YouTubeTimedTextResponse;
  return {
    data,
    actualLang: targetLang || originalLang,
    actualKind: kind === 'asr' ? 'asr' : 'manual',
  };
}

function parseEvents(data: YouTubeTimedTextResponse): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let index = 1;

  for (const event of data.events || []) {
    if (!event.segs?.length) continue;
    const text = event.segs.map((s) => s.utf8 || '').join('').trim();
    if (!text) continue;

    const startMs = event.tStartMs || 0;
    const endMs = startMs + (event.dDurationMs || 0);

    entries.push({
      index: index++,
      startMs,
      endMs,
      startFormatted: formatTimeSRT(startMs),
      endFormatted: formatTimeSRT(endMs),
      text,
    });
  }

  return entries;
}

function formatAsSRT(entries: SubtitleEntry[]): string {
  return entries
    .map((e) => `${e.index}\n${e.startFormatted} --> ${e.endFormatted}\n${e.text}\n`)
    .join('\n');
}

function formatAsPlainText(entries: SubtitleEntry[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const entry of entries) {
    const clean = entry.text
      .replace(/♪/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();
    if (clean && !seen.has(clean)) {
      lines.push(clean);
      seen.add(clean);
    }
  }

  return lines
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1\n\n')
    .trim();
}

// ── Public API ──

/**
 * List all available subtitle languages for a video.
 */
export async function listSubtitleLanguages(videoUrl: string): Promise<LanguageListResult> {
  const videoId = extractVideoId(videoUrl);
  const playerResponse = await fetchPlayerResponse(videoId);
  const { tracks, translationLanguages } = parseCaptionTracks(playerResponse);

  const manual: LanguageInfo[] = [];
  const autoGenerated: LanguageInfo[] = [];

  for (const track of tracks) {
    const info: LanguageInfo = {
      code: track.languageCode,
      name: extractTrackDisplayName(track),
      kind: track.kind === 'asr' ? 'auto-generated' : 'manual',
      isTranslatable: track.isTranslatable || false,
    };

    if (track.kind === 'asr') {
      autoGenerated.push(info);
    } else {
      manual.push(info);
    }
  }

  return {
    videoId,
    videoTitle: playerResponse.videoDetails?.title || 'Unknown',
    manual,
    autoGenerated,
    translationLanguages,
    totalAvailable: manual.length + autoGenerated.length,
  };
}

/**
 * Get subtitles for a video in the requested format.
 */
export async function getSubtitles(
  videoUrl: string,
  language?: string,
  format: 'json' | 'srt' | 'txt' = 'txt'
): Promise<SubtitleResult> {
  const videoId = extractVideoId(videoUrl);
  const playerResponse = await fetchPlayerResponse(videoId);
  const { tracks } = parseCaptionTracks(playerResponse);

  if (tracks.length === 0) {
    throw new SubtitleError('No subtitles available for this video', 'NO_SUBTITLES');
  }

  // Find the best matching track
  let selectedTrack: CaptionTrack | undefined;
  let needsTranslation = false;

  if (language) {
    // Exact match first
    selectedTrack = tracks.find((t) => t.languageCode === language);

    // If not found, check if we can translate
    if (!selectedTrack) {
      // Use the first available track and translate
      selectedTrack = tracks[0];
      needsTranslation = true;
    }
  } else {
    // Default: prefer manual over auto-generated
    selectedTrack = tracks.find((t) => t.kind !== 'asr') || tracks[0];
  }

  if (!selectedTrack?.baseUrl) {
    throw new SubtitleError('No subtitle track found with a valid URL', 'NO_TRACK_URL');
  }

  const targetLang = needsTranslation ? language : undefined;
  const { data, actualLang, actualKind } = await fetchTimedText(selectedTrack.baseUrl, targetLang);

  const entries = parseEvents(data);

  if (entries.length === 0) {
    throw new SubtitleError('Subtitle track returned no entries', 'EMPTY_SUBTITLES');
  }

  const result: SubtitleResult = {
    videoId,
    videoTitle: playerResponse.videoDetails?.title || 'Unknown',
    language: actualLang,
    languageName: getLanguageName(actualLang),
    kind: actualKind === 'asr' ? 'auto-generated' : 'manual',
    entries,
    totalEntries: entries.length,
    format,
  };

  if (format === 'srt') {
    result.formatted = formatAsSRT(entries);
  } else if (format === 'txt') {
    result.formatted = formatAsPlainText(entries);
  }

  return result;
}
