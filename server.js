const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Use public Cobalt instance processing engine to bypass watch.html parsing entirely
const COBALT_API = 'https://api.cobalt.tools/api/json';

app.get('/', (req, res) => {
  res.send('Proxy Backend (Cobalt Engine) active!');
});

// Endpoint 1: Fetch Video Metadata
app.get('/info', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: 'URL required' });

  try {
    const response = await fetch(COBALT_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: videoUrl })
    });

    const data = await response.json();
    if (data.status === 'error') throw new Error(data.text);

    res.json({
      title: 'YouTube Stream',
      streamUrl: data.url
    });
  } catch (err) {
    res.status(500).json({ error: 'Engine Error: ' + err.message });
  }
});

// Endpoint 2: Full Video Stream Piping
app.get('/stream', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL required');

  try {
    const response = await fetch(COBALT_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: videoUrl, videoQuality: 'max' })
    });

    const data = await response.json();
    if (!data.url) throw new Error('Failed to resolve media stream');

    // Pipe direct media stream through Render to frontend
    const streamRes = await fetch(data.url);
    res.setHeader('Content-Type', 'video/mp4');
    
    const arrayBuffer = await streamRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    if (!res.headersSent) res.status(500).send('Stream Error: ' + err.message);
  }
});

// Endpoint 3: Audio-Only Stream (YT Music)
app.get('/audio', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL required');

  try {
    const response = await fetch(COBALT_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: videoUrl, isAudioOnly: true })
    });

    const data = await response.json();
    if (!data.url) throw new Error('Failed to resolve audio stream');

    const streamRes = await fetch(data.url);
    res.setHeader('Content-Type', 'audio/mpeg');
    
    const arrayBuffer = await streamRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    if (!res.headersSent) res.status(500).send('Audio Error: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
