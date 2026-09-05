const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so local file:// documents can talk to Render
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Proxy Backend is active and running!');
});

// Endpoint 1: Fetch Video / Track Metadata
app.get('/info', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).json({ error: 'Valid YouTube URL or ID required' });
  }

  try {
    const info = await ytdl.getInfo(videoUrl);
    res.json({
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      lengthSeconds: info.videoDetails.lengthSeconds,
      thumbnail: info.videoDetails.thumbnails.pop()?.url
    });
  } catch (err) {
    console.error('Metadata Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve video information: ' + err.message });
  }
});

// Endpoint 2: Full Video Stream
app.get('/stream', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).send('Valid YouTube URL or ID required');
  }

  try {
    res.setHeader('Content-Type', 'video/mp4');
    ytdl(videoUrl, { 
      filter: 'audioandvideo', 
      quality: 'highestvideo' 
    }).pipe(res);
  } catch (err) {
    console.error('Video Stream Error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Video Stream Error: ' + err.message);
    }
  }
});

// Endpoint 3: Lightweight Audio-Only Stream (YouTube Music)
app.get('/audio', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).send('Valid YouTube URL or ID required');
  }

  try {
    res.setHeader('Content-Type', 'audio/mpeg');
    ytdl(videoUrl, { 
      filter: 'audioonly', 
      quality: 'highestaudio' 
    }).pipe(res);
  } catch (err) {
    console.error('Audio Stream Error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Audio Stream Error: ' + err.message);
    }
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`Backend proxy running on port ${PORT}`);
});
