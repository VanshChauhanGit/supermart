const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.m4a';
    cb(null, 'voice-' + Date.now() + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

/**
 * Transcribe PCM audio buffer with Google Chromium Speech API
 */
function sendToGoogleSpeech(audioBuffer, lang) {
  return new Promise((resolve, reject) => {
    const targetLang = lang === 'hi-IN' ? 'hi-IN' : 'en-IN';
    const key = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw';
    const url = `http://www.google.com/speech-api/v2/recognize?client=chromium&lang=${targetLang}&key=${key}`;

    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/l16; rate=16000',
        'Content-Length': audioBuffer.length,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          let recognizedText = '';
          const lines = body.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed?.result?.[0]?.alternative?.[0]?.transcript) {
                recognizedText = parsed.result[0].alternative[0].transcript;
              }
            } catch (_e) {}
          }
          resolve(recognizedText);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Speech API timeout'));
    });

    req.write(audioBuffer);
    req.end();
  });
}

// POST /api/v1/voice/transcribe
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  let tempWavPath = null;
  const inputFilePath = req.file?.path;

  try {
    if (!inputFilePath || !fs.existsSync(inputFilePath)) {
      return res.status(400).json({ success: false, message: 'Audio file is required' });
    }

    const lang = req.body?.lang || 'en-IN';
    tempWavPath = path.join(uploadDir, `converted-${Date.now()}.wav`);

    let pcmBuffer = null;

    // Use macOS afconvert if available to convert any m4a/aac/wav to 16kHz 16-bit mono PCM
    try {
      execSync(`/usr/bin/afconvert -f WAVE -d LEI16@16000 -c 1 "${inputFilePath}" "${tempWavPath}" 2>/dev/null`);
      if (fs.existsSync(tempWavPath)) {
        // Read PCM data (skip 44-byte standard wav header)
        const wavFile = fs.readFileSync(tempWavPath);
        pcmBuffer = wavFile.length > 44 ? wavFile.subarray(44) : wavFile;
      }
    } catch (_convErr) {
      // Fallback: read file directly
      pcmBuffer = fs.readFileSync(inputFilePath);
    }

    if (!pcmBuffer || pcmBuffer.length === 0) {
      return res.status(400).json({ success: false, message: 'Empty audio data received' });
    }

    console.log(`[Voice] Processing speech audio: ${pcmBuffer.length} bytes, lang=${lang}`);
    const transcript = await sendToGoogleSpeech(pcmBuffer, lang);

    if (transcript && transcript.trim()) {
      console.log(`[Voice] Recognized text: "${transcript}"`);
      return res.json({
        success: true,
        text: transcript.trim()
      });
    }

    return res.json({
      success: false,
      message: 'Could not detect speech. Please speak clearly.'
    });
  } catch (error) {
    console.error('[Voice] Transcription error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Transcription failed'
    });
  } finally {
    // Cleanup temporary audio files
    if (inputFilePath && fs.existsSync(inputFilePath)) {
      try { fs.unlinkSync(inputFilePath); } catch (_e) {}
    }
    if (tempWavPath && fs.existsSync(tempWavPath)) {
      try { fs.unlinkSync(tempWavPath); } catch (_e) {}
    }
  }
});

module.exports = router;
