/**
 * Example: Integrating Whisper.js for Real Transcription
 * 
 * This file shows how to integrate Whisper.js (a JavaScript port of OpenAI's Whisper)
 * into the Firefox extension for real transcription capabilities.
 * 
 * Repository: https://github.com/xenova/whisper-web
 */

// Step 1: Add Whisper.js to your extension
// You can include it via npm or use a CDN build

// Step 2: Modify background.js to use Whisper instead of mock transcription

/**
 * Initialize Whisper model (add to background.js)
 */
let whisperModel = null;
let isModelLoading = false;

async function loadWhisperModel() {
  if (whisperModel || isModelLoading) {
    return whisperModel;
  }
  
  try {
    isModelLoading = true;
    console.log('Loading Whisper model...');
    
    // Using Xenova's Transformers.js (Whisper implementation)
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0');
    
    // Load the model (tiny model for faster loading, use 'base' or 'small' for better accuracy)
    whisperModel = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
    
    console.log('Whisper model loaded successfully');
    isModelLoading = false;
    return whisperModel;
  } catch (error) {
    console.error('Error loading Whisper model:', error);
    isModelLoading = false;
    throw error;
  }
}

/**
 * Convert WebM audio blob to format suitable for Whisper
 */
async function convertAudioForWhisper(audioBlob) {
  // Create audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Decode audio data
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Whisper expects 16kHz mono audio
  const targetSampleRate = 16000;
  
  // Resample if needed
  let audioData;
  if (audioBuffer.sampleRate !== targetSampleRate) {
    // Simple resampling - for production, use a proper resampling library
    const offlineContext = new OfflineAudioContext(
      1, // mono
      audioBuffer.duration * targetSampleRate,
      targetSampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    const resampledBuffer = await offlineContext.startRendering();
    audioData = resampledBuffer.getChannelData(0);
  } else {
    // Already at correct sample rate, just get channel data
    audioData = audioBuffer.getChannelData(0);
  }
  
  return audioData;
}

/**
 * Transcribe audio using Whisper (replaces getMockTranscription in background.js)
 */
async function transcribeAudioWithWhisper(tabId, audioBlob) {
  try {
    console.log('Starting Whisper transcription for tab', tabId);
    
    // Load model if not already loaded
    const model = await loadWhisperModel();
    
    // Convert audio to format suitable for Whisper
    const audioData = await convertAudioForWhisper(audioBlob);
    
    // Perform transcription
    const result = await model(audioData, {
      // Options
      language: 'english', // or 'auto' for automatic detection
      task: 'transcribe',
      chunk_length_s: 30, // Process in 30-second chunks
      stride_length_s: 5, // 5-second overlap between chunks
    });
    
    // Extract transcription text
    const transcription = result.text;
    
    console.log('Whisper transcription completed:', transcription);
    
    // Store transcription result
    const stored = await browser.storage.local.get(`recording_${tabId}`);
    if (stored[`recording_${tabId}`]) {
      stored[`recording_${tabId}`].transcription = transcription;
      stored[`recording_${tabId}`].status = 'completed';
      await browser.storage.local.set(stored);
    }
    
    // Clean up active recording
    activeRecordings.delete(tabId);
    
    // Notify popup
    browser.runtime.sendMessage({
      action: 'transcriptionComplete',
      tabId: tabId,
      transcription: transcription
    }).catch(() => {});
    
  } catch (error) {
    console.error('Error transcribing audio with Whisper:', error);
    
    // Store error status
    const stored = await browser.storage.local.get(`recording_${tabId}`);
    if (stored[`recording_${tabId}`]) {
      stored[`recording_${tabId}`].transcription = 'Transcription failed: ' + error.message;
      stored[`recording_${tabId}`].status = 'error';
      await browser.storage.local.set(stored);
    }
    
    activeRecordings.delete(tabId);
  }
}

/**
 * Alternative: Using Vosk (requires local server)
 * 
 * Vosk provides offline speech recognition with multiple language models
 * https://alphacephei.com/vosk/
 */
async function transcribeAudioWithVosk(audioBlob) {
  try {
    // Convert audio to WAV format
    const audioContext = new AudioContext();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Convert to WAV
    const wavBlob = audioBufferToWav(audioBuffer);
    
    // Send to local Vosk server
    const formData = new FormData();
    formData.append('audio', wavBlob);
    
    const response = await fetch('http://localhost:2700/transcribe', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Vosk server error: ' + response.statusText);
    }
    
    const result = await response.json();
    return result.text || result.transcription;
    
  } catch (error) {
    console.error('Error with Vosk transcription:', error);
    throw error;
  }
}

/**
 * Helper function: Convert AudioBuffer to WAV format
 */
function audioBufferToWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const data = [];
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      // Convert float to 16-bit PCM
      const int16 = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
      data.push(int16);
    }
  }
  
  const dataLength = data.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  
  // Write WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write audio data
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    view.setInt16(offset, data[i], true);
    offset += 2;
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Instructions for integration:
 * 
 * 1. Choose your transcription engine (Whisper.js or Vosk)
 * 
 * 2. For Whisper.js:
 *    - Add to manifest.json: "permissions": ["webRequest", "webRequestBlocking"]
 *    - Replace the transcribeAudio function in background.js with transcribeAudioWithWhisper
 *    - The model will be loaded on first use (may take a few seconds)
 *    - Tiny model: ~75MB, Base model: ~150MB
 * 
 * 3. For Vosk:
 *    - Set up a local Vosk server (Python or Docker)
 *    - Replace transcribeAudio function with transcribeAudioWithVosk
 *    - Requires local server running on port 2700 (configurable)
 * 
 * 4. For other engines:
 *    - Follow similar pattern of converting audio and calling the engine
 *    - Ensure proper audio format conversion
 *    - Handle errors appropriately
 */

// Export functions for use in background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadWhisperModel,
    transcribeAudioWithWhisper,
    transcribeAudioWithVosk,
    audioBufferToWav
  };
}
