import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

// Swiggy / Zomato style continuous commercial order bell sequence
const CHIME_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background:transparent;margin:0;padding:0;">
  <script>
    function playChime() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        function tone(freq, start, duration, vol) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(vol, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + duration);
        }

        const now = ctx.currentTime;
        // Commercial 4-tone ascending ring: C5 -> E5 -> G5 -> C6
        tone(523.25, now, 0.28, 0.8);        // C5
        tone(659.25, now + 0.14, 0.32, 0.85); // E5
        tone(783.99, now + 0.28, 0.38, 0.95); // G5
        tone(1046.50, now + 0.44, 0.7, 1.0);  // C6 (Loud bright finish)
      } catch (e) {}
    }

    // Play immediately on mount
    playChime();

    // Repeat every 2.4 seconds like commercial store POS machines
    window._chimeInterval = setInterval(playChime, 2400);
  </script>
</body>
</html>
`;

export default function OrderChimeSound({ isPlaying = false }) {
  // If on web platform, play via window.AudioContext directly
  useEffect(() => {
    if (Platform.OS === 'web' && isPlaying) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const tone = (freq, start, duration, vol) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(vol, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + duration);
        };

        const play = () => {
          const now = ctx.currentTime;
          tone(523.25, now, 0.28, 0.8);
          tone(659.25, now + 0.14, 0.32, 0.85);
          tone(783.99, now + 0.28, 0.38, 0.95);
          tone(1046.50, now + 0.44, 0.7, 1.0);
        };

        play();
        const interval = setInterval(play, 2400);
        return () => clearInterval(interval);
      } catch (e) {}
    }
  }, [isPlaying]);

  if (!isPlaying) return null;

  // On Native (iOS / Android), render the zero-pixel WebView with Web Audio
  if (Platform.OS !== 'web') {
    return (
      <View style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}>
        <WebView
          originWhitelist={['*']}
          source={{ html: CHIME_HTML }}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          javaScriptEnabled={true}
          scrollEnabled={false}
          bounces={false}
        />
      </View>
    );
  }

  return null;
}
