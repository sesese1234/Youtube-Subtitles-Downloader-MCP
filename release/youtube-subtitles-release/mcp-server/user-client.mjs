import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  console.log('Connecting to MCP server...');
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['C:/Users/Yossi/Documents/Projects/YouTube/Sbutitles_MCP/mcp-server/dist/index.js']
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log('Connected!');

  console.log('Calling get_subtitles...');
  const result = await client.callTool({
    name: 'get_subtitles',
    arguments: {
      video_url: 'https://www.youtube.com/watch?v=h_D3VFfhvs4'
    }
  });

  console.log('Result:');
  console.log(JSON.stringify(result, null, 2));

  await client.close();
}

main().catch(console.error);
