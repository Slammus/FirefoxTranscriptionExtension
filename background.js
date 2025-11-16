// Background script for managing audio capture and transcription
console.log('Tab Audio Transcription extension loaded');

let activeRecordings = new Map();
let mediaStreams = new Map();

// Handle messages from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.action === 'startRecording') {
    startRecording(message.tabId)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
  
  if (message.action === 'stopRecording') {
    stopRecording(message.tabId)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.action === 'getRecordingStatus') {
    const status = {
      isRecording: activeRecordings.has(message.tabId),
      hasStream: mediaStreams.has(message.tabId)
    };
    sendResponse({ success: true, status });
    return true;
  }
});

async function startRecording(tabId) {
  try {
    // Check if already recording
    if (activeRecordings.has(tabId)) {
      throw new Error('Already recording this tab');
    }
    
    // Capture tab audio
    const stream = await browser.tabCapture.capture({
      audio: true,
      video: false
    });
    
    if (!stream) {
      throw new Error('Failed to capture tab audio');
    }
    
    mediaStreams.set(tabId, stream);
    
    // Create MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm'
    });
    
    const audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      console.log('Recording stopped, processing audio...');
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      
      // Store the audio data
      const recording = activeRecordings.get(tabId);
      if (recording) {
        recording.audioBlob = audioBlob;
        recording.audioChunks = audioChunks;
        
        // Convert to base64 for storage
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result;
          browser.storage.local.set({
            [`recording_${tabId}`]: {
              audioData: base64Audio,
              timestamp: Date.now(),
              transcription: 'Processing...'
            }
          });
          
          // Trigger transcription
          transcribeAudio(tabId, audioBlob);
        };
        reader.readAsDataURL(audioBlob);
      }
    };
    
    mediaRecorder.start();
    
    activeRecordings.set(tabId, {
      mediaRecorder,
      stream,
      audioChunks,
      startTime: Date.now()
    });
    
    console.log(`Started recording tab ${tabId}`);
    return { message: 'Recording started' };
    
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
}

async function stopRecording(tabId) {
  try {
    const recording = activeRecordings.get(tabId);
    if (!recording) {
      throw new Error('No active recording for this tab');
    }
    
    // Stop the media recorder
    if (recording.mediaRecorder && recording.mediaRecorder.state !== 'inactive') {
      recording.mediaRecorder.stop();
    }
    
    // Stop all tracks in the stream
    if (recording.stream) {
      recording.stream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up stream reference
    if (mediaStreams.has(tabId)) {
      mediaStreams.delete(tabId);
    }
    
    // Keep recording in map until transcription completes
    console.log(`Stopped recording tab ${tabId}`);
    return { message: 'Recording stopped' };
    
  } catch (error) {
    console.error('Error stopping recording:', error);
    throw error;
  }
}

async function transcribeAudio(tabId, audioBlob) {
  try {
    console.log('Starting transcription for tab', tabId);
    
    // Convert audio blob to WAV format for transcription
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // For now, we'll use a mock transcription
    // In a real implementation, you would:
    // 1. Convert the audio to WAV or another supported format
    // 2. Use a library like Whisper.cpp via WebAssembly
    // 3. Or send to a local transcription service
    
    setTimeout(async () => {
      const mockTranscription = await getMockTranscription(audioBlob);
      
      // Store transcription result
      const stored = await browser.storage.local.get(`recording_${tabId}`);
      if (stored[`recording_${tabId}`]) {
        stored[`recording_${tabId}`].transcription = mockTranscription;
        stored[`recording_${tabId}`].status = 'completed';
        await browser.storage.local.set(stored);
      }
      
      // Clean up active recording
      activeRecordings.delete(tabId);
      
      console.log('Transcription completed for tab', tabId);
      
      // Notify popup if it's open
      browser.runtime.sendMessage({
        action: 'transcriptionComplete',
        tabId: tabId,
        transcription: mockTranscription
      }).catch(() => {
        // Popup might not be open
      });
    }, 2000);
    
  } catch (error) {
    console.error('Error transcribing audio:', error);
    
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

async function getMockTranscription(audioBlob) {
  // Mock transcription for demonstration
  // In production, this would use Whisper.cpp, Vosk, or another open-source engine
  const size = audioBlob.size;
  const durationEstimate = Math.round(size / 16000); // rough estimate
  
  return `[Mock Transcription]\n\nThis is a demonstration transcription. The audio was ${durationEstimate} seconds long.\n\nTo enable real transcription, integrate an open-source engine like:\n- Whisper.cpp (via WebAssembly)\n- Vosk\n- DeepSpeech\n\nThe extension successfully captured the tab audio and is ready for integration with a real transcription engine.`;
}

// Clean up on tab close
browser.tabs.onRemoved.addListener((tabId) => {
  if (activeRecordings.has(tabId)) {
    stopRecording(tabId).catch(console.error);
  }
});
