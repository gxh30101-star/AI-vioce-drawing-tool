const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { MsEdgeTTS } = require('msedge-tts');

const PORT = 3001;
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

// ===== Chinese to English prompt translation =====
const PROMPT_MAP = {
  '日落': 'beautiful sunset over ocean, golden sky, orange clouds, silhouette of mountains, oil painting style',
  '夕阳': 'beautiful sunset, golden hour, warm colors, dramatic clouds, landscape painting',
  '海滩': 'tropical beach scene, white sand, turquoise water, palm trees, clear blue sky, paradise',
  '沙滩': 'sandy beach, ocean waves, seashells, warm sunlight, peaceful scene',
  '城堡': 'medieval castle on hilltop, stone towers, flags, dramatic sky, fantasy art',
  '房子': 'cozy house with garden, chimney smoke, flowers, warm lighting, illustration style',
  '花园': 'beautiful flower garden, colorful flowers, butterflies, green grass, sunny day, illustration',
  '星空': 'starry night sky, milky way, glowing stars, deep blue and purple, magical atmosphere',
  '夜空': 'night sky full of stars, moon, aurora borealis, dreamy atmosphere',
  '山水': 'Chinese ink wash painting, mountains and water, misty landscape, traditional art style',
  '雪人': 'cute snowman in winter snow, carrot nose, scarf, top hat, snowflakes falling, cozy scene',
  '太阳': 'bright sun in blue sky, warm rays, clouds, cheerful atmosphere, illustration style',
  '树': 'beautiful tree with green leaves, strong trunk, flowers blooming, sunny day, nature art',
  '猫': 'cute cat, fluffy fur, big eyes, sitting peacefully, adorable, digital art illustration',
  '小猫': 'adorable kitten, playful pose, soft fur, cute expression, digital art',
  '狗': 'cute dog, happy expression, wagging tail, warm colors, digital art illustration',
  '小狗': 'adorable puppy, playful, big eyes, fluffy, digital art illustration',
  '彩虹': 'beautiful rainbow after rain, colorful arc in sky, clouds, sunny, magical scene',
  '蛋糕': 'beautiful birthday cake, candles, frosting, sprinkles, celebration, illustration style',
  '气球': 'colorful balloons floating in sky, festive atmosphere, bright colors, celebration',
  '爱心': 'red heart shape, romantic, glowing, sparkles, love theme, digital art',
  '音乐': 'music notes floating, guitar, musical atmosphere, colorful, artistic illustration',
  '机器人': 'cute robot, metallic body, glowing eyes, futuristic style, digital art illustration',
  '飞船': 'spaceship in outer space, stars, planets, sci-fi style, detailed illustration',
  '摩天轮': 'colorful ferris wheel at night, lights, amusement park, festive atmosphere',
  '花': 'beautiful flowers bouquet, roses, tulips, colorful petals, watercolor style',
  '猫头鹰': 'wise owl sitting on branch, detailed feathers, moonlight, forest, digital art',
  '蝴蝶': 'beautiful butterfly, colorful wings, flowers, nature, detailed illustration',
  '龙': 'Chinese dragon, red and gold, flying through clouds, traditional art style',
  '凤凰': 'phoenix rising, fire feathers, golden and red, mythical bird, dramatic lighting',
  '熊猫': 'cute panda eating bamboo, black and white, adorable, digital art illustration',
  '美人鱼': 'mermaid under the sea, flowing hair, coral reef, fish, magical underwater scene',
  '森林': 'enchanted forest, tall trees, sunlight through leaves, magical atmosphere, nature art',
  '海洋': 'deep ocean scene, blue water, fish, coral reef, underwater world, illustration',
  '月亮': 'full moon in night sky, craters visible, stars around, peaceful moonlight scene',
  '向日葵': 'field of sunflowers, bright yellow petals, blue sky, sunny day, impressionist style',
  '樱花': 'cherry blossom trees, pink petals falling, spring scene, Japanese style art',
  '雪山': 'snowy mountain peak, clear sky, pine trees, winter landscape, majestic scenery',
  '城市': 'city skyline at night, lights, buildings, modern cityscape, digital art',
  '宇宙': 'outer space, planets, nebula, stars, galaxy, cosmic scene, digital art',
};

// Build English prompt from Chinese text
function buildPrompt(chineseText) {
  // Check for exact matches first
  for (const [zh, en] of Object.entries(PROMPT_MAP)) {
    if (chineseText.includes(zh)) {
      return en;
    }
  }
  // Fallback: use the text directly with style suffix
  return `${chineseText}, beautiful illustration, detailed, high quality, digital art`;
}

// ===== Parse request body =====
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// ===== Agnes.ai Configuration =====
const AGNES_API_KEY = 'sk-SeSleKEh1AGJfAOw2npfZLzqA8Tmehts7BEj6VxY5djNrcIP';
const AGNES_API_BASE = 'https://apihub.agnes-ai.com/v1';
const AGNES_MODEL = 'agnes-image-2.0-flash';

// ===== Fetch image from agnes.ai =====
async function fetchImage(prompt, width, height) {
  const postData = JSON.stringify({
    model: AGNES_MODEL,
    prompt: prompt,
    n: 1,
    size: `${width}x${height}`,
  });

  return new Promise((resolve, reject) => {
    const url = new URL(`${AGNES_API_BASE}/images/generations`);
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGNES_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 60000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          if (json.error) {
            reject(new Error(json.error.message || 'Image generation failed'));
            return;
          }

          if (!json.data || json.data.length === 0) {
            reject(new Error('No image generated'));
            return;
          }

          const imageUrl = json.data[0].url;

          // Fetch the actual image
          https.get(imageUrl, { timeout: 30000 }, (imgRes) => {
            const chunks = [];
            imgRes.on('data', chunk => chunks.push(chunk));
            imgRes.on('end', () => resolve(Buffer.concat(chunks)));
            imgRes.on('error', reject);
          }).on('error', reject);

        } catch (e) {
          reject(new Error('Invalid response from agnes.ai'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// ===== HTTP Server =====
const server = http.createServer(async (req, res) => {
  try {
    let urlPath = req.url.split('?')[0];

    // --- Image Generation API ---
    if (urlPath === '/api/generate-image') {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }

      if (req.method === 'POST') {
        try {
          const body = await parseBody(req);
          const { prompt, ratio = '1:1' } = body;

          if (!prompt) {
            res.writeHead(400, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ error: 'Missing prompt' }));
            return;
          }

          // Convert ratio to dimensions
          let width, height;
          switch (ratio) {
            case '4:3':
              width = 1024;
              height = 768;
              break;
            case '16:9':
              width = 1024;
              height = 576;
              break;
            case '1:1':
            default:
              width = 1024;
              height = 1024;
              break;
          }

          console.log(`Generating image: "${prompt}" ratio: ${ratio} (${width}x${height})`);
          const englishPrompt = buildPrompt(prompt);
          console.log(`English prompt: "${englishPrompt}"`);

          const imageBuffer = await fetchImage(englishPrompt, width, height);

          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': imageBuffer.length,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(imageBuffer);
        } catch (err) {
          console.error('Image generation error:', err.message);
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }
    }

    // --- TTS API ---
    if (urlPath === '/api/tts') {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }

      if (req.method === 'POST') {
        try {
          const body = await parseBody(req);
          const { text, voice = 'zh-CN-XiaoxiaoNeural' } = body;

          if (!text) {
            res.writeHead(400, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ error: 'Missing text' }));
            return;
          }

          console.log(`TTS: "${text}" with voice ${voice}`);

          const tts = new MsEdgeTTS();
          await tts.setMetadata(voice, 'audio-24khz-96kbitrate-mono-mp3', 'default');

          // Use toFile to generate audio (it expects a directory, creates audio.mp3 inside)
          const tempDir = path.join(__dirname, 'temp_tts');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

          await tts.toFile(tempDir, text);

          // Read the generated file
          const audioFile = path.join(tempDir, 'audio.mp3');
          const audioBuffer = fs.readFileSync(audioFile);

          // Clean up
          try { fs.unlinkSync(audioFile); } catch (e) {}
          try { fs.rmdirSync(tempDir); } catch (e) {}

          res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(audioBuffer);
        } catch (err) {
          console.error('TTS error:', err.message);
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }
    }

    // --- Static files ---
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(PUBLIC, urlPath);

    // Prevent path traversal
    if (!filePath.startsWith(PUBLIC)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  } catch (e) {
    console.error('Request error:', e.message);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Voice Drawing Tool running at http://localhost:${PORT}`);
  console.log(`Image generation: POST http://localhost:${PORT}/api/generate-image`);
});
