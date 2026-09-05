const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('Proxy Backend active!');
});

// Endpoint 1: Metadata
app.get('/info', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: 'URL required' });

  try {
    const output = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true,
      referer: 'https://www.youtube.com/'
    });

    res.json({
      title: output.title,
      author: output.uploader || 'Unknown',
      thumbnail: output.thumbnail
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint 2: Direct Video Pipe (Fixes 403 Forbidden)
app.get('/stream', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL required');

  try {
    const output = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      format: 'b[ext=mp4]/best[ext=mp4]/best'
    });

    if (!output.url) throw new Error('No stream URL resolved');

    res.setHeader('Content-Type', 'video/mp4');
    
    // Pipe video data through Render so YouTube sees Render's IP, not yours
    https.get(output.url, (stream) => {
      stream.pipe(res);
    }).on('error', (err) => {
      res.status(500).send('Pipe Error: ' + err.message);
    });

  } catch (err) {
    if (!res.headersSent) res.status(500).send('Stream Error: ' + err.message);
  }
});

// Endpoint 3: Direct Audio Pipe
app.get('/audio', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL required');

  try {
    const output = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      format: 'bestaudio/best'
    });

    if (!output.url) throw new Error('No audio URL resolved');

    res.setHeader('Content-Type', 'audio/mpeg');

    https.get(output.url, (stream) => {
      stream.pipe(res);
    }).on('error', (err) => {
      res.status(500).send('Pipe Error: ' + err.message);
    });

  } catch (err) {
    if (!res.headersSent) res.status(500).send('Audio Error: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
