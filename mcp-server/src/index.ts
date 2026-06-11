#!/usr/bin/env node
/**
 * YouTube Subtitles MCP Server
 *
 * Exposes YouTube subtitle extraction as MCP tools via stdio transport.
 * Always returns plain text (.txt) to the connected model.
 *
 * Internally fetches SRT from YouTube's timedtext API (same engine as
 * the Chrome extension), converts SRT → plain text, and returns it.
 *
 * Tools:
 *   - get_subtitles             — fetch video subtitles as plain text
 *   - list_subtitle_languages   — list available subtitle languages
 *   - convert_srt_to_txt        — convert raw SRT content to plain text
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './constants.js';
import { logger } from './logger.js';
import { checkRateLimit } from './rate-limiter.js';
import { listSubtitleLanguages, getSubtitles } from './youtube-service.js';
import { convertSrtToPlainText } from './srt-converter.js';
import { SubtitleError } from './types.js';

// ── Server init ──

const server = new McpServer({
  name: MCP_SERVER_NAME,
  version: MCP_SERVER_VERSION,
});

// ── Error handler ──

function handleError(err: unknown): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  if (err instanceof SubtitleError) {
    logger.warn('Subtitle error', { code: err.code, message: err.message });
    return {
      content: [{ type: 'text' as const, text: `Error [${err.code}]: ${err.message}` }],
      isError: true,
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  logger.error('Unexpected error', { error: message });
  return {
    content: [{ type: 'text' as const, text: `Unexpected error: ${message}` }],
    isError: true,
  };
}

// ── Tool: get_subtitles ──
// Fetches subtitles using YouTube's timedtext API, converts to plain text.

server.tool(
  'get_subtitles',
  'Get subtitles for a YouTube video as plain text. Uses YouTube\'s native subtitle engine internally, converts to clean readable text.',
  {
    video_url: z.string().describe('YouTube video URL or video ID (e.g. "https://www.youtube.com/watch?v=dQw4w9WgXcQ" or "dQw4w9WgXcQ")'),
    language: z.string().optional().describe('Language code (e.g. "en", "es", "ja"). Omit for auto-detect.'),
  },
  async ({ video_url, language }) => {
    const rl = checkRateLimit('mcp');
    if (!rl.allowed) {
      return {
        content: [{ type: 'text' as const, text: `Rate limit exceeded. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.` }],
        isError: true,
      };
    }

    try {
      // Fetch as SRT internally, then convert to plain text
      const result = await getSubtitles(video_url, language, 'txt');

      logger.info('Fetched subtitles', {
        videoId: result.videoId,
        lang: result.language,
        entries: result.totalEntries,
      });

      const header = [
        `Video: ${result.videoTitle}`,
        `Language: ${result.languageName} (${result.language})`,
        `Type: ${result.kind}`,
        `Entries: ${result.totalEntries}`,
        '─'.repeat(50),
        '',
      ].join('\n');

      return {
        content: [{ type: 'text' as const, text: header + result.formatted }],
      };
    } catch (err) {
      return handleError(err);
    }
  }
);

// ── Tool: list_subtitle_languages ──

server.tool(
  'list_subtitle_languages',
  'List all available subtitle languages for a YouTube video. Returns manual subtitles and auto-generated captions.',
  {
    video_url: z.string().describe('YouTube video URL or video ID'),
  },
  async ({ video_url }) => {
    const rl = checkRateLimit('mcp');
    if (!rl.allowed) {
      return {
        content: [{ type: 'text' as const, text: `Rate limit exceeded. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.` }],
        isError: true,
      };
    }

    try {
      const result = await listSubtitleLanguages(video_url);
      logger.info('Listed languages', { videoId: result.videoId, total: result.totalAvailable });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return handleError(err);
    }
  }
);

// ── Tool: convert_srt_to_txt ──
// Accepts raw SRT content (e.g. from the extension) and returns plain text.

server.tool(
  'convert_srt_to_txt',
  'Convert SRT subtitle content to clean plain text. Strips timestamps, indices, and formatting artifacts. Useful when you already have SRT data.',
  {
    srt_content: z.string().describe('Raw SRT file content with timestamps and indices'),
    video_title: z.string().optional().describe('Optional video title for context'),
  },
  async ({ srt_content, video_title }) => {
    const rl = checkRateLimit('mcp');
    if (!rl.allowed) {
      return {
        content: [{ type: 'text' as const, text: `Rate limit exceeded. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.` }],
        isError: true,
      };
    }

    try {
      const plainText = convertSrtToPlainText(srt_content);

      if (!plainText.trim()) {
        return {
          content: [{ type: 'text' as const, text: 'Error: SRT content produced no text after conversion.' }],
          isError: true,
        };
      }

      logger.info('Converted SRT to TXT', { inputLength: srt_content.length, outputLength: plainText.length });

      const header = video_title
        ? `Video: ${video_title}\n${'─'.repeat(50)}\n\n`
        : '';

      return {
        content: [{ type: 'text' as const, text: header + plainText }],
      };
    } catch (err) {
      return handleError(err);
    }
  }
);

// ── Start server ──

async function main() {
  logger.info('Starting YouTube Subtitles MCP server', {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP server connected via stdio');
}

main().catch((err) => {
  logger.error('Fatal error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
