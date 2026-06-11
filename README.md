# YouTube Subtitles MCP Server

this extention is based on: https://github.com/NoteLMai/YouTube-Subtitle-Downloader

MCP server that extracts YouTube video subtitles and delivers them as **plain text (.txt)** to any MCP-compatible client (Claude Desktop, Cursor, Windsurf, etc.).

Uses YouTube's native timedtext API — the same engine as the Chrome extension. SRT is fetched internally, converted to clean plain text, and returned to the model.

## Architecture

```
┌─────────────────┐     stdio (JSON-RPC)     ┌──────────────┐
│  Claude Desktop  │◄──────────────────────►│  MCP Server  │──► YouTube API
│  Cursor / etc.   │                         │  (index.ts)  │
└─────────────────┘                          └──────────────┘

┌─────────────────┐     HTTP localhost:3847   ┌──────────────┐
│ Chrome Extension │◄──────────────────────►│  HTTP Bridge │──► SRT→TXT
│  (existing UI)   │                         │  (bridge.ts) │
└─────────────────┘                          └──────────────┘
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_subtitles` | Fetch subtitles as plain text. Accepts `video_url` and optional `language`. |
| `list_subtitle_languages` | List available subtitle languages for a video. |
| `convert_srt_to_txt` | Convert raw SRT content to plain text (for extension integration). |
| `open_youtube_video` | Commands the Chrome Extension to automatically open the video in a new tab so it can capture subtitles. |

## Quick Start

### 1. Install & Build

If you downloaded the release zip, simply run the setup script:
```bash
node install-mcp.js
```
This will automatically install dependencies and generate the correct MCP configuration for your machine.

For manual setup:
```bash
cd mcp-server
npm install
npm run build
```

### 2. Register with MCP Clients

**Claude Desktop** — edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "youtube-subtitles": {
      "command": "node",
      "args": ["C:/Users/YOU/path-to/Sbutitles_MCP/mcp-server/dist/index.js"]
    }
  }
}
```

**Cursor** — edit `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "youtube-subtitles": {
      "command": "node",
      "args": ["C:/Users/YOU/path-to/Sbutitles_MCP/mcp-server/dist/index.js"]
    }
  }
}
```

### 3. Run the HTTP Bridge (for Chrome Extension)

```bash
cd mcp-server
npm run start:bridge
```

The bridge listens on `http://127.0.0.1:3847`. The Chrome extension auto-detects it and shows a ⚡ badge when connected.

### 4. Development Mode

```bash
npm run dev          # MCP server with hot reload
npm run dev:bridge   # HTTP bridge with hot reload
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BRIDGE_PORT` | `3847` | HTTP bridge port |
| `BRIDGE_HOST` | `127.0.0.1` | HTTP bridge bind address |
| `RATE_LIMIT_MAX` | `30` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `LOG_LEVEL` | `info` | Log level: debug, info, warn, error |

Copy `.env.example` to `.env` to customize.

## Chrome Extension

The extension works standalone as before. When the MCP bridge is running, it additionally:
- Shows a ⚡ badge indicating server connection
- Can route subtitle requests through the bridge
- Sends SRT to `/api/subtitles/convert` for TXT conversion
- **Listens for `OPEN_TAB` commands to natively open videos without using the OS default browser.**

## HTTP Bridge Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Connection check |
| `POST` | `/api/subtitles/languages` | List languages (`{ video_url }`) |
| `POST` | `/api/subtitles/get` | Fetch subtitles as text (`{ video_url, language? }`) |
| `POST` | `/api/subtitles/convert` | Convert SRT→TXT (`{ srt_content, video_title? }`) |
