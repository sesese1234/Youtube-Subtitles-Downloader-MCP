import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mcpServerDir = path.join(__dirname, 'mcp-server');
const serverPath = path.join(mcpServerDir, 'dist', 'index.js');
const nodeModulesDir = path.join(mcpServerDir, 'node_modules');

// Auto-install dependencies if missing (e.g. if downloaded from a release zip)
if (!fs.existsSync(nodeModulesDir)) {
  console.log('Installing dependencies for the MCP server. Please wait...');
  try {
    execSync('npm install', { cwd: mcpServerDir, stdio: 'inherit' });
    console.log('Dependencies installed successfully!\n');
  } catch (err) {
    console.error('\nFailed to install dependencies automatically.');
    console.error('Please run "npm install" manually inside the "mcp-server" folder.');
    process.exit(1);
  }
}

// Get the path to the node executable
const nodePath = process.execPath;

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
