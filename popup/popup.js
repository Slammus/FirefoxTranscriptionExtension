// Popup script for controlling transcription
let currentTabId = null;
let isRecording = false;
let transcriptionCheckInterval = null;

// DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusIndicator = document.getElementById('status');
const statusText = statusIndicator.querySelector('.status-text');
const transcriptionSection = document.getElementById('transcriptionSection');
const transcriptionResult = document.getElementById('transcriptionResult');
const copyBtn = document.getElementById('copyBtn');
const errorSection = document.getElementById('errorSection');
const errorText = document.getElementById('errorText');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get current tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      currentTabId = tabs[0].id;
      
      // Check if there's an existing recording
      await checkRecordingStatus();
      await loadStoredTranscription();
    }
  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  }
});

// Event listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
copyBtn.addEventListener('click', copyToClipboard);

// Listen for transcription completion messages
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'transcriptionComplete' && message.tabId === currentTabId) {
    displayTranscription(message.transcription);
    updateStatus('Ready', false, false);
  }
});

async function startRecording() {
  try {
    hideError();
    updateStatus('Recording...', true, false);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    const response = await browser.runtime.sendMessage({
      action: 'startRecording',
      tabId: currentTabId
    });
    
    if (response.success) {
      isRecording = true;
      console.log('Recording started successfully');
    } else {
      throw new Error(response.error || 'Failed to start recording');
    }
  } catch (error) {
    console.error('Error starting recording:', error);
    showError('Failed to start recording: ' + error.message);
    updateStatus('Ready', false, false);
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

async function stopRecording() {
  try {
    hideError();
    updateStatus('Processing...', false, true);
    startBtn.disabled = true;
    stopBtn.disabled = true;
    
    const response = await browser.runtime.sendMessage({
      action: 'stopRecording',
      tabId: currentTabId
    });
    
    if (response.success) {
      isRecording = false;
      console.log('Recording stopped successfully');
      
      // Start checking for transcription
      startTranscriptionCheck();
    } else {
      throw new Error(response.error || 'Failed to stop recording');
    }
  } catch (error) {
    console.error('Error stopping recording:', error);
    showError('Failed to stop recording: ' + error.message);
    updateStatus('Ready', false, false);
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

async function checkRecordingStatus() {
  try {
    const response = await browser.runtime.sendMessage({
      action: 'getRecordingStatus',
      tabId: currentTabId
    });
    
    if (response.success && response.status.isRecording) {
      isRecording = true;
      updateStatus('Recording...', true, false);
      startBtn.disabled = true;
      stopBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error checking recording status:', error);
  }
}

async function loadStoredTranscription() {
  try {
    const stored = await browser.storage.local.get(`recording_${currentTabId}`);
    const recording = stored[`recording_${currentTabId}`];
    
    if (recording && recording.transcription && recording.transcription !== 'Processing...') {
      displayTranscription(recording.transcription);
    }
  } catch (error) {
    console.error('Error loading stored transcription:', error);
  }
}

function startTranscriptionCheck() {
  if (transcriptionCheckInterval) {
    clearInterval(transcriptionCheckInterval);
  }
  
  transcriptionCheckInterval = setInterval(async () => {
    try {
      const stored = await browser.storage.local.get(`recording_${currentTabId}`);
      const recording = stored[`recording_${currentTabId}`];
      
      if (recording && recording.transcription && recording.transcription !== 'Processing...') {
        clearInterval(transcriptionCheckInterval);
        transcriptionCheckInterval = null;
        
        displayTranscription(recording.transcription);
        updateStatus('Ready', false, false);
        startBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error checking transcription:', error);
    }
  }, 1000);
}

function displayTranscription(text) {
  transcriptionResult.textContent = text;
  transcriptionSection.style.display = 'block';
}

function updateStatus(text, recording, processing) {
  statusText.textContent = text;
  statusIndicator.classList.remove('recording', 'processing');
  
  if (recording) {
    statusIndicator.classList.add('recording');
  } else if (processing) {
    statusIndicator.classList.add('processing');
  }
}

function showError(message) {
  errorText.textContent = message;
  errorSection.style.display = 'block';
}

function hideError() {
  errorSection.style.display = 'none';
  errorText.textContent = '';
}

async function copyToClipboard() {
  try {
    const text = transcriptionResult.textContent;
    await navigator.clipboard.writeText(text);
    
    // Visual feedback
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span class="btn-icon">✓</span>Copied!';
    copyBtn.disabled = true;
    
    setTimeout(() => {
      copyBtn.innerHTML = originalText;
      copyBtn.disabled = false;
    }, 2000);
  } catch (error) {
    showError('Failed to copy to clipboard: ' + error.message);
  }
}

// Cleanup on unload
window.addEventListener('unload', () => {
  if (transcriptionCheckInterval) {
    clearInterval(transcriptionCheckInterval);
  }
});
