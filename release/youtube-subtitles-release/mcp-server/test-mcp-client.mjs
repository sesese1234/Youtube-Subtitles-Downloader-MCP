import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function run() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js']
  });
  
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  
  console.log('Connected to MCP Server. Calling get_subtitles...');
  const result = await client.callTool({
    name: 'get_subtitles',
    arguments: {
      video_url: 'https://www.youtube.com/watch?v=h_D3VFfhvs4',
      format: 'txt'
    }
  });
  
  console.log('--- RESULT ---');
  console.log(result.content[0].text.substring(0, 500) + '...');
  
  await transport.close();
}

run().catch(console.error);
