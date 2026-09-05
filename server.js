const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const youtubedl = require('youtube-dl-exec');

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

// Endpoint 2: Direct Binary Stream (Video)
app.get('/stream', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL required');

  res.setHeader('Content-Type', 'video/mp4');

  // Spawn yt-dlp to stream output directly to stdout
  const ytProcess = spawn('npx', [
    'yt-dlp',
    '-f', 'b[ext=mp4]/best[ext=mp4]/best',
    '-o', '-',
    videoUrl
  ]);

  ytProcess.stdout.pipe(res);

  ytProcess.stderr.on('data', (data) => {
    console.error(`yt-dlp stderr: ${data}`);
  });

  req.on('close', () => {
    ytProcess.kill();
  });
});

// Endpoint 3: Direct Binary Stream (Audio / YT Music)
app.get('/audio', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL required');

  res.setHeader('Content-Type', 'audio/mpeg');

  const ytProcess = spawn('npx', [
    'yt-dlp',
    '-f', 'bestaudio/best',
    '-o', '-',
    videoUrl
  ]);

  ytProcess.stdout.pipe(res);

  ytProcess.stderr.on('data', (data) => {
    console.error(`yt-dlp stderr: ${data}`);
  });

  req.on('close', () => {
    ytProcess.kill();
  });
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
