const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('Proxy Backend (yt-dlp Engine) active!');
});

// Endpoint 1: Fetch Video Metadata
app.get('/info', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: 'URL required' });

  try {
    const output = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      referer: 'https://www.youtube.com/'
    });

    res.json({
      title: output.title,
      author: output.uploader || 'Unknown',
      thumbnail: output.thumbnail
    });
  } catch (err) {
    console.error('Info Error:', err.message);
    res.status(500).json({ error: 'Engine Error: ' + err.message });
  }
});

// Endpoint 2: Stream Full Video
app.get('/stream', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL required');

  try {
    const output = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      format: 'b[ext=mp4]/best[ext=mp4]/best'
    });

    if (!output.url) throw new Error('No direct stream URL resolved');

    res.redirect(output.url);
  } catch (err) {
    console.error('Stream Error:', err.message);
    if (!res.headersSent) res.status(500).send('Stream Error: ' + err.message);
  }
});

// Endpoint 3: Stream Audio Only (YT Music)
app.get('/audio', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL required');

  try {
    const output = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      format: 'bestaudio/best'
    });

    if (!output.url) throw new Error('No direct audio stream URL resolved');

    res.redirect(output.url);
  } catch (err) {
    console.error('Audio Error:', err.message);
    if (!res.headersSent) res.status(500).send('Audio Error: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
