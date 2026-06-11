import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the path to the node executable
const nodePath = process.execPath;
const serverPath = path.join(__dirname, 'mcp-server', 'dist', 'index.js');

// Determine potential config locations
const homedir = os.homedir();
const claudeDesktopConfig = path.join(homedir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
const cursorConfig = path.join(homedir, '.cursor', 'mcp.json');

const configEntry = {
  "command": nodePath,
  "args": [serverPath]
};

console.log('--- MCP Configuration ---');
console.log('To install this MCP server on any PC, add the following to your MCP client config (Claude Desktop, Cursor, Gemini):');
console.log();
console.log(JSON.stringify({
  mcpServers: {
    "youtube-subtitles-mcp": configEntry
  }
}, null, 2));
console.log();
console.log('This uses absolute paths so it works perfectly in any MCP client.');
console.log('Run this script (node install-mcp.js) whenever you move the folder to a new PC.');
