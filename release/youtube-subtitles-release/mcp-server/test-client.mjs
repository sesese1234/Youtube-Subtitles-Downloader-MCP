import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Connecting to MCP server...');
  const serverPath = path.join(__dirname, 'dist', 'index.js');
  
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath]
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log('Connected!');

  console.log('Calling open_youtube_video...');
  await client.callTool({
    name: 'open_youtube_video',
    arguments: {
      video_url: 'https://www.youtube.com/watch?v=h_D3VFfhvs4'
    }
  });

  console.log('Waiting 5 seconds for the extension to push subtitles...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Calling get_subtitles for Smooth Criminal...');
  const result = await client.callTool({
    name: 'get_subtitles',
    arguments: {
      video_url: 'https://www.youtube.com/watch?v=h_D3VFfhvs4'
    }
  });

  if (result.isError) {
    console.error('Error fetching subtitles:', result.content[0].text);
  } else {
    const subtitlesContent = result.content[0].text;
    const outputPath = path.join(__dirname, 'smooth_criminal_subtitles.txt');
    fs.writeFileSync(outputPath, subtitlesContent, 'utf-8');
    console.log(`Saved subtitles to: ${outputPath}`);
  }

  await client.close();
}

main().catch(console.error);
