import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import { useApp } from '../context/AppContext';

const POPULAR_VOICE_SEARCHES = [
  { label: 'Amul Milk', icon: 'water-outline' },
  { label: 'Aashirvaad Atta', icon: 'nutrition-outline' },
  { label: 'Tata Tea', icon: 'cafe-outline' },
  { label: 'Amul Butter', icon: 'cube-outline' },
  { label: 'Fresh Bread', icon: 'restaurant-outline' },
  { label: 'Maggi Noodles', icon: 'flame-outline' },
  { label: 'Cold Drink', icon: 'wine-outline' },
  { label: 'Fortune Oil', icon: 'color-fill-outline' }
];

export default function VoiceSearchModal({ visible, onClose, onSearch }) {
  const { apiBaseUrl } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedLang, setSelectedLang] = useState('en-IN'); // 'en-IN' | 'hi-IN'
  const [statusMessage, setStatusMessage] = useState('Listening... Speak now');
  const [hasMicPermission, setHasMicPermission] = useState(true);
  const [countdown, setCountdown] = useState(4);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRingAnim = useRef(new Animated.Value(0)).current;
  const waveAnim1 = useRef(new Animated.Value(0.3)).current;
  const waveAnim2 = useRef(new Animated.Value(0.7)).current;
  const waveAnim3 = useRef(new Animated.Value(0.4)).current;
  const waveAnim4 = useRef(new Animated.Value(0.8)).current;

  const recordingTimer = useRef(null);
  const countdownInterval = useRef(null);
  const autoCloseTimer = useRef(null);

  // Safe Haptic feedback helper
  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch (_e) {}
  };

  // Pulsing animation while listening
  useEffect(() => {
    let loop;
    if (visible && isListening) {
      loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseRingAnim, {
              toValue: 1,
              duration: 1600,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseRingAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(waveAnim1, { toValue: 0.2, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim2, { toValue: 0.2, duration: 500, useNativeDriver: true }),
            Animated.timing(waveAnim2, { toValue: 1, duration: 500, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim3, { toValue: 1, duration: 450, useNativeDriver: true }),
            Animated.timing(waveAnim3, { toValue: 0.3, duration: 450, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim4, { toValue: 0.3, duration: 600, useNativeDriver: true }),
            Animated.timing(waveAnim4, { toValue: 1, duration: 600, useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
      pulseRingAnim.setValue(0);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [visible, isListening]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      setTranscript('');
      startRecording();
    } else {
      cleanupTimers();
      setIsListening(false);
      setIsTranscribing(false);
      try {
        if (recorder?.isRecording) {
          recorder.stop();
        }
      } catch (_e) {}
    }
  }, [visible]);

  const cleanupTimers = () => {
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
  };

  const startRecording = async () => {
    cleanupTimers();
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setHasMicPermission(false);
        setStatusMessage('Microphone permission required');
        setIsListening(false);
        return;
      }

      setHasMicPermission(true);
      setTranscript('');
      setIsTranscribing(false);
      setStatusMessage(selectedLang === 'hi-IN' ? 'सुन रहे हैं... बोलिए' : 'Listening... Speak now');
      setIsListening(true);
      setCountdown(4);

      try {
        await recorder.prepareToRecordAsync();
        recorder.record();
      } catch (recErr) {
        console.log('[Voice] prepare/record warning:', recErr?.message);
      }

      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

      // Countdown interval for visual feedback
      let timeLeft = 4;
      countdownInterval.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countdownInterval.current);
        }
      }, 1000);

      // Auto-stop after 4 seconds of speech
      recordingTimer.current = setTimeout(() => {
        stopAndTranscribe();
      }, 4000);

    } catch (err) {
      console.log('[Voice] startRecording error:', err);
      setStatusMessage('Could not start microphone. Tap to retry');
      setIsListening(false);
    }
  };

  const stopAndTranscribe = async () => {
    cleanupTimers();
    setIsListening(false);
    setIsTranscribing(true);
    setStatusMessage(selectedLang === 'hi-IN' ? 'पहचान रहे हैं...' : 'Recognizing your speech...');
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recorder.stop();
      const audioUri = recorder.uri;

      if (!audioUri) {
        setIsTranscribing(false);
        setStatusMessage('No audio captured. Tap mic to retry');
        return;
      }

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: 'voice.m4a',
        type: 'audio/m4a'
      });
      formData.append('lang', selectedLang);

      const targetUrl = `${apiBaseUrl || 'http://localhost:5050/api/v1'}/voice/transcribe`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success && data.text && data.text.trim()) {
        const cleanText = data.text.trim();
        setTranscript(cleanText);
        setStatusMessage(selectedLang === 'hi-IN' ? `मिल गया: "${cleanText}"` : `Found: "${cleanText}"`);
        setIsTranscribing(false);
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);

        // Auto execute search after 750ms so user can see recognized text
        autoCloseTimer.current = setTimeout(() => {
          onSearch(cleanText);
          onClose();
        }, 750);
      } else {
        setIsTranscribing(false);
        setStatusMessage(data.message || 'Could not understand. Tap mic to retry');
      }
    } catch (err) {
      console.log('[Voice] Transcription error:', err);
      setIsTranscribing(false);
      setStatusMessage('Voice recognition failed. Tap mic to retry');
    }
  };

  const handleMicPress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (isListening) {
      // User tapped while listening -> finish immediately and transcribe
      stopAndTranscribe();
    } else if (!isTranscribing) {
      // User tapped while idle -> start new recording
      startRecording();
    }
  };

  const handleConfirm = (queryToSearch) => {
    const finalQuery = (typeof queryToSearch === 'string' ? queryToSearch : transcript).trim();
    if (!finalQuery) return;
    cleanupTimers();
    try {
      if (recorder?.isRecording) recorder.stop();
    } catch (_e) {}
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    onSearch(finalQuery);
    onClose();
  };

  const handleChipSelect = (itemLabel) => {
    cleanupTimers();
    try {
      if (recorder?.isRecording) recorder.stop();
    } catch (_e) {}
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setTranscript(itemLabel);
    onSearch(itemLabel);
    onClose();
  };

  const toggleLanguage = (langCode) => {
    triggerHaptic();
    setSelectedLang(langCode);
    setTranscript('');
    if (visible) {
      startRecording();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-slate-900/65 justify-end">
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-t-[36px] px-6 pt-5 pb-8 border-t border-slate-200/90 shadow-2xl">
              
              {/* ── Top Bar: Title, Lang Switcher & Close ── */}
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-xl bg-[#FEF3C7] items-center justify-center mr-2.5">
                    <Ionicons name="mic" size={17} color="#D97706" />
                  </View>
                  <View>
                    <Text className="text-base font-black text-slate-900 tracking-tight">
                      Voice Search
                    </Text>
                    <Text className="text-[11px] font-semibold text-slate-400">
                      Mandhaur Supermart Express Voice
                    </Text>
                  </View>
                </View>

                {/* Language Switcher Tabs */}
                <View className="flex-row items-center bg-slate-100 p-1 rounded-full border border-slate-200 mr-2">
                  <TouchableOpacity
                    onPress={() => toggleLanguage('en-IN')}
                    className={`px-2.5 py-1 rounded-full ${selectedLang === 'en-IN' ? 'bg-white shadow-xs' : ''}`}
                  >
                    <Text className={`text-[10px] ${selectedLang === 'en-IN' ? 'font-black text-slate-900' : 'font-semibold text-slate-500'}`}>
                      English
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleLanguage('hi-IN')}
                    className={`px-2.5 py-1 rounded-full ${selectedLang === 'hi-IN' ? 'bg-white shadow-xs' : ''}`}
                  >
                    <Text className={`text-[10px] ${selectedLang === 'hi-IN' ? 'font-black text-slate-900' : 'font-semibold text-slate-500'}`}>
                      हिन्दी
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* ── Center Stage: Pulsing Microphone & Visualizer ── */}
              <View className="items-center py-6">
                <View className="items-center justify-center relative mb-4">
                  {/* Outer Pulsing Aura Ring */}
                  {isListening && (
                    <Animated.View
                      style={{
                        position: 'absolute',
                        width: 130,
                        height: 130,
                        borderRadius: 65,
                        backgroundColor: '#FDE047',
                        opacity: pulseRingAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.6, 0],
                        }),
                        transform: [
                          {
                            scale: pulseRingAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.5],
                            }),
                          },
                        ],
                      }}
                    />
                  )}

                  {/* Secondary Pulse Glow */}
                  {isListening && (
                    <Animated.View
                      style={{
                        position: 'absolute',
                        width: 106,
                        height: 106,
                        borderRadius: 53,
                        backgroundColor: '#FEF08A',
                        transform: [{ scale: pulseAnim }],
                      }}
                    />
                  )}

                  {/* Central Mic Button */}
                  <TouchableOpacity
                    onPress={handleMicPress}
                    activeOpacity={0.88}
                    className={`w-20 h-20 rounded-full items-center justify-center shadow-lg border-2 ${
                      isListening
                        ? 'bg-[#F7C400] border-[#FACC15]'
                        : isTranscribing
                        ? 'bg-amber-100 border-amber-300'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    {isTranscribing ? (
                      <ActivityIndicator size="large" color="#D97706" />
                    ) : (
                      <Ionicons
                        name={isListening ? 'mic' : 'mic-outline'}
                        size={36}
                        color={isListening ? '#0F172A' : '#F7C400'}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Status Indicator */}
                <View className="flex-row items-center mb-1">
                  <View
                    className={`w-2 h-2 rounded-full mr-2 ${
                      isListening
                        ? 'bg-emerald-500'
                        : isTranscribing
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <Text className="text-xs font-bold text-slate-700">
                    {statusMessage}
                  </Text>
                </View>

                {/* Helpful Instruction / Countdown */}
                {isListening && (
                  <Text className="text-[11px] font-semibold text-slate-400 mb-2">
                    Tap mic when done (or auto-searches in {countdown}s)
                  </Text>
                )}

                {/* Sound Waves Animation Bar */}
                {isListening && (
                  <View className="flex-row items-center gap-1.5 h-6 my-1">
                    {[waveAnim1, waveAnim2, waveAnim3, waveAnim4, waveAnim2, waveAnim1].map((anim, idx) => (
                      <Animated.View
                        key={idx}
                        style={{
                          width: 4,
                          height: 20,
                          borderRadius: 2,
                          backgroundColor: '#D97706',
                          transform: [{ scaleY: anim }],
                        }}
                      />
                    ))}
                  </View>
                )}

                {/* ── Recognized Text Showcase Card ── */}
                <View className="w-full bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-4 my-2 min-h-[72px] items-center justify-center">
                  {transcript ? (
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" style={{ marginRight: 6 }} />
                      <Text className="text-lg font-black text-slate-900 text-center tracking-tight">
                        &ldquo;{transcript}&rdquo;
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-xs font-semibold text-slate-400 text-center italic">
                      Try saying: &ldquo;Amul Milk&rdquo;, &ldquo;Tata Tea&rdquo;, &ldquo;Aashirvaad Atta&rdquo;...
                    </Text>
                  )}
                </View>

                {/* Confirm / Search Action Button */}
                {Boolean(transcript.trim()) && (
                  <TouchableOpacity
                    onPress={() => handleConfirm(transcript)}
                    activeOpacity={0.85}
                    className="w-full mt-2 py-3 px-4 rounded-2xl bg-[#F7C400] active:bg-[#eab308] border border-[#facc15] flex-row items-center justify-center shadow-xs"
                  >
                    <Text className="text-slate-900 text-sm font-black mr-2">
                      Search for &ldquo;{transcript}&rdquo;
                    </Text>
                    <Ionicons name="arrow-forward-circle" size={18} color="#0F172A" />
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Section: Quick 1-Tap Voice Query Chips ── */}
              <View className="pt-2">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Popular Searches (Tap to quick-search):
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {POPULAR_VOICE_SEARCHES.map(item => (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => handleChipSelect(item.label)}
                      activeOpacity={0.7}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-row items-center active:bg-amber-50 active:border-amber-300"
                    >
                      <Ionicons name={item.icon} size={13} color="#D97706" style={{ marginRight: 5 }} />
                      <Text className="text-xs font-bold text-slate-800">
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
