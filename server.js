const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Force ytdl to use YouTube's innerTube API instead of parsing watch.html
const agentOptions = {
  pipedagent: true,
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
    }
  }
};

app.get('/', (req, res) => {
  res.send('Proxy Backend is active and running!');
});

// Endpoint 1: Fetch Metadata via InnerTube API
app.get('/info', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).json({ error: 'Valid YouTube URL or ID required' });
  }

  try {
    // Uses iOS innerTube client to avoid parsing watch.html
    const info = await ytdl.getBasicInfo(videoUrl, agentOptions);
    res.json({
      title: info.videoDetails.title,
      author: info.videoDetails.author?.name || 'Unknown Artist',
      lengthSeconds: info.videoDetails.lengthSeconds,
      thumbnail: info.videoDetails.thumbnails?.pop()?.url || ''
    });
  } catch (err) {
    console.error('Metadata Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve video information: ' + err.message });
  }
});

// Endpoint 2: Stream Video
app.get('/stream', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).send('Valid YouTube URL or ID required');
  }

  try {
    res.setHeader('Content-Type', 'video/mp4');
    ytdl(videoUrl, { 
      filter: 'audioandvideo', 
      quality: 'highestvideo',
      ...agentOptions
    }).pipe(res);
  } catch (err) {
    console.error('Video Stream Error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Video Stream Error: ' + err.message);
    }
  }
});

// Endpoint 3: Stream Audio
app.get('/audio', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).send('Valid YouTube URL or ID required');
  }

  try {
    res.setHeader('Content-Type', 'audio/mpeg');
    ytdl(videoUrl, { 
      filter: 'audioonly', 
      quality: 'highestaudio',
      ...agentOptions
    }).pipe(res);
  } catch (err) {
    console.error('Audio Stream Error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Audio Stream Error: ' + err.message);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend proxy running on port ${PORT}`);
});
