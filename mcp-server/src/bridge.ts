/**
 * HTTP Bridge Server
 *
 * Lightweight Express server for the Chrome extension to communicate with.
 * Mirrors MCP tool functionality as REST endpoints on localhost.
 *
 * Endpoints:
 *   GET  /health                        — connection check
 *   POST /api/subtitles/languages       — list available languages
 *   POST /api/subtitles/get             — fetch subtitles as plain text
 *   POST /api/subtitles/convert         — convert SRT content to plain text
 */

import express from 'express';
import cors from 'cors';

import { BRIDGE_PORT, BRIDGE_HOST, MCP_SERVER_VERSION } from './constants.js';
import { logger } from './logger.js';
import { checkRateLimit } from './rate-limiter.js';
import { listSubtitleLanguages, getSubtitles } from './youtube-service.js';
import { convertSrtToPlainText } from './srt-converter.js';
import { SubtitleError } from './types.js';

const app = express();
const startTime = Date.now();

// ── Middleware ──

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '5mb' }));

app.use((req, _res, next) => {
  logger.debug('HTTP request', { method: req.method, path: req.path });
  next();
});

// ── Rate limit middleware ──

function rateLimitMiddleware(_req: express.Request, res: express.Response, next: express.NextFunction): void {
  const rl = checkRateLimit('bridge');
  if (!rl.allowed) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfterMs: rl.retryAfterMs,
    });
    return;
  }
  next();
}

// ── Error handler ──

function sendError(res: express.Response, err: unknown): void {
  if (err instanceof SubtitleError) {
    res.status(err.statusCode || 400).json({ error: err.message, code: err.code });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  logger.error('Bridge error', { error: message });
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
}

// ── Routes ──

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: MCP_SERVER_VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

// List available languages for a video
app.post('/api/subtitles/languages', rateLimitMiddleware, async (req, res) => {
  try {
    const { video_url } = req.body;
    if (!video_url || typeof video_url !== 'string') {
      res.status(400).json({ error: 'Missing required field: video_url', code: 'INVALID_INPUT' });
      return;
    }
    const result = await listSubtitleLanguages(video_url);
    logger.info('Bridge: listed languages', { videoId: result.videoId });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

// Fetch subtitles as plain text (uses YouTube's timedtext engine)
app.post('/api/subtitles/get', rateLimitMiddleware, async (req, res) => {
  try {
    const { video_url, language } = req.body;
    if (!video_url || typeof video_url !== 'string') {
      res.status(400).json({ error: 'Missing required field: video_url', code: 'INVALID_INPUT' });
      return;
    }
    const result = await getSubtitles(video_url, language, 'txt');
    logger.info('Bridge: fetched subtitles', { videoId: result.videoId, lang: result.language });
    res.json({
      text: result.formatted,
      videoTitle: result.videoTitle,
      language: result.language,
      languageName: result.languageName,
      kind: result.kind,
      totalEntries: result.totalEntries,
    });
  } catch (err) {
    sendError(res, err);
  }
});

// Convert SRT content → plain text
// This is the main endpoint the extension uses: it already has SRT from
// YouTube's timedtext API, just needs conversion to .txt
app.post('/api/subtitles/convert', rateLimitMiddleware, (req, res) => {
  try {
    const { srt_content, video_title } = req.body;
    if (!srt_content || typeof srt_content !== 'string') {
      res.status(400).json({ error: 'Missing required field: srt_content', code: 'INVALID_INPUT' });
      return;
    }

    const plainText = convertSrtToPlainText(srt_content);

    if (!plainText.trim()) {
      res.status(400).json({ error: 'SRT content produced no text', code: 'EMPTY_RESULT' });
      return;
    }

    logger.info('Bridge: converted SRT to TXT', {
      inputLength: srt_content.length,
      outputLength: plainText.length,
    });

    res.json({
      text: plainText,
      videoTitle: video_title || null,
    });
  } catch (err) {
    sendError(res, err);
  }
});

import { setAutoSubtitle } from './auto-store.js';

app.post('/api/subtitles/auto', rateLimitMiddleware, (req, res) => {
  try {
    const { videoId, language, data } = req.body;
    if (!videoId || !data) {
      res.status(400).json({ error: 'Missing required fields', code: 'INVALID_INPUT' });
      return;
    }

    setAutoSubtitle(videoId, language || 'en', data);
    logger.info('Bridge: received auto-subtitle from extension', { videoId, language });
    
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
});

// ── Start ──

const serverListener = app.listen(BRIDGE_PORT, BRIDGE_HOST, () => {
  logger.info(`HTTP bridge listening on http://${BRIDGE_HOST}:${BRIDGE_PORT}`);
});

serverListener.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`HTTP bridge port ${BRIDGE_PORT} is already in use. Another instance may be running.`);
  } else {
    logger.error(`HTTP bridge failed to start: ${err.message}`);
  }
});
