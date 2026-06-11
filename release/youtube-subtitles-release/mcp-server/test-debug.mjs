const videoId = 'oRdxUFDoQe0';
const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;

async function test() {
  console.log('Fetching page...');
  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const html = await response.text();
  const marker = 'ytInitialPlayerResponse';
  const markerIdx = html.indexOf(marker);
  const startIdx = html.indexOf('{', markerIdx);
  
  let depth = 0, endIdx = startIdx;
  for (let i = startIdx; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') depth--;
    if (depth === 0) { endIdx = i; break; }
  }

  const jsonStr = html.substring(startIdx, endIdx + 1);
  const data = JSON.parse(jsonStr);
  const track = data.captions.playerCaptionsTracklistRenderer.captionTracks[0];
  
  console.log('Base URL:', track.baseUrl);
  
  const finalUrl = track.baseUrl + '&fmt=json3';
  console.log('Fetching timedtext:', finalUrl);
  
  const subtitleResponse = await fetch(finalUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });
  
  const text = await subtitleResponse.text();
  console.log('Status:', subtitleResponse.status);
  console.log('Text length:', text.length);
  console.log('Text start:', text.substring(0, 100));
}

test();
