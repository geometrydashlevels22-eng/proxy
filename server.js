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

// Endpoint 1: Retrieve Metadata
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

// Endpoint 2: Stream Video with Spoofed Browser Headers
app.get('/stream', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL required');

  try {
    const output = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      format: 'b[ext=mp4]/best[ext=mp4]/best'
    });

    if (!output.url) throw new Error('No stream URL resolved');

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/'
      }
    };

    res.setHeader('Content-Type', 'video/mp4');

    https.get(output.url, options, (stream) => {
      // Forward HTTP status code if YouTube returns an error (e.g., 403)
      if (stream.statusCode >= 400) {
        return res.status(stream.statusCode).send(`YouTube CDN Error: ${stream.statusCode}`);
      }
      stream.pipe(res);
    }).on('error', (err) => {
      if (!res.headersSent) res.status(500).send('Pipe Error: ' + err.message);
    });

  } catch (err) {
    if (!res.headersSent) res.status(500).send('Stream Error: ' + err.message);
  }
});

// Endpoint 3: Stream Audio with Spoofed Browser Headers
app.get('/audio', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL required');

  try {
    const output = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      format: 'bestaudio/best'
    });

    if (!output.url) throw new Error('No audio URL resolved');

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/'
      }
    };

    res.setHeader('Content-Type', 'audio/mpeg');

    https.get(output.url, options, (stream) => {
      if (stream.statusCode >= 400) {
        return res.status(stream.statusCode).send(`YouTube CDN Error: ${stream.statusCode}`);
      }
      stream.pipe(res);
    }).on('error', (err) => {
      if (!res.headersSent) res.status(500).send('Pipe Error: ' + err.message);
    });

  } catch (err) {
    if (!res.headersSent) res.status(500).send('Audio Error: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
