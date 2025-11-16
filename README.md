# Firefox Tab Audio Transcription Extension

A Firefox extension that captures and transcribes audio playing in browser tabs using open source transcription engines.

## Features

- 🎙️ **Tab Audio Capture**: Record audio from any active browser tab
- 📝 **Transcription**: Convert recorded audio to text (mock implementation included, ready for real engine integration)
- 💾 **Storage**: Save recordings and transcriptions locally
- 🎨 **Clean UI**: Modern, intuitive popup interface
- 🔒 **Privacy-Focused**: All processing happens locally in the browser

## Installation

### For Development/Testing

1. Clone this repository:
   ```bash
   git clone https://github.com/Slammus/FirefoxTranscriptionExtension.git
   cd FirefoxTranscriptionExtension
   ```

2. Open Firefox and navigate to `about:debugging`

3. Click "This Firefox" in the left sidebar

4. Click "Load Temporary Add-on"

5. Navigate to the extension directory and select the `manifest.json` file

6. The extension icon should appear in your Firefox toolbar

## Usage

1. Navigate to a tab with audio content (e.g., YouTube, podcast website, etc.)

2. Click the extension icon in the toolbar to open the popup

3. Click **"Start Recording"** to begin capturing audio from the current tab

4. Play the audio in the tab

5. Click **"Stop Recording"** when finished

6. Wait a moment for the transcription to process

7. View the transcription result in the popup

8. Click **"Copy to Clipboard"** to copy the transcription text

## Architecture

The extension consists of several key components:

### Files Structure

```
FirefoxTranscriptionExtension/
├── manifest.json           # Extension configuration and permissions
├── background.js           # Background script for audio capture and processing
├── popup/
│   ├── popup.html         # Popup UI structure
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup logic and user interactions
├── icons/
│   ├── icon-48.png        # 48x48 extension icon
│   └── icon-96.png        # 96x96 extension icon
└── README.md              # This file
```

### Components

#### Background Script (`background.js`)
- Handles audio capture using the `tabCapture` API
- Manages `MediaRecorder` for recording audio streams
- Processes audio data and triggers transcription
- Stores recordings and transcriptions in local storage

#### Popup Interface (`popup/`)
- Provides user controls for starting/stopping recordings
- Displays recording status and transcription results
- Handles communication with the background script
- Allows copying transcriptions to clipboard

## Permissions

The extension requires the following permissions:

- **`activeTab`**: Access the currently active tab
- **`tabCapture`**: Capture audio from tabs
- **`storage`**: Store recordings and transcriptions locally
- **`<all_urls>`**: Access any website for audio capture

## Integrating Real Transcription Engines

The current implementation includes a mock transcription engine for demonstration. To integrate a real open-source transcription engine, you can use one of the following options:

### Option 1: Whisper.cpp (via WebAssembly)

[Whisper.cpp](https://github.com/ggerganov/whisper.cpp) can be compiled to WebAssembly for in-browser transcription:

```javascript
// In background.js, replace getMockTranscription() with:
async function transcribeWithWhisper(audioBlob) {
  // Convert audio to WAV format
  const audioContext = new AudioContext();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Convert to format expected by Whisper
  const wavData = audioBufferToWav(audioBuffer);
  
  // Call Whisper.cpp WebAssembly module
  const transcription = await whisperModule.transcribe(wavData);
  return transcription;
}
```

### Option 2: Web Speech API

For a simpler approach, use the browser's built-in speech recognition:

```javascript
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  // Handle transcription
};
recognition.start();
```

### Option 3: Vosk

[Vosk](https://alphacephei.com/vosk/) provides offline speech recognition:

```javascript
// Load Vosk model and process audio
const model = await vosk.loadModel('model-path');
const recognizer = new vosk.Recognizer(model, sampleRate);
const result = recognizer.acceptWaveform(audioData);
```

### Option 4: External Service

Send audio to a local transcription service:

```javascript
async function transcribeWithService(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  
  const response = await fetch('http://localhost:5000/transcribe', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
}
```

## Development

### Testing

1. Load the extension as described in Installation
2. Open the Browser Console (Ctrl+Shift+J) to see debug logs
3. Navigate to a page with audio
4. Test recording and transcription functionality

### Debugging

- Background script logs appear in the Browser Console
- Popup script logs appear in the extension's popup inspector
- Use `about:debugging` to inspect the extension

## Known Limitations

- Currently uses mock transcription (needs real engine integration)
- Audio format conversion may be needed for some transcription engines
- Large audio files may require chunking for processing
- No support for real-time streaming transcription yet

## Future Enhancements

- [ ] Real transcription engine integration (Whisper, Vosk, etc.)
- [ ] Real-time streaming transcription
- [ ] Multiple language support
- [ ] Export transcriptions to file
- [ ] Timestamp synchronization with audio
- [ ] Speaker diarization
- [ ] Custom vocabulary/terminology support

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is open source. See the LICENSE file for details.

## Privacy

This extension is designed with privacy in mind:
- All audio processing happens locally in your browser
- No data is sent to external servers (except if you configure an external transcription service)
- Recordings are stored only in local browser storage
- You have full control over your data

## Support

For issues, questions, or suggestions, please open an issue on GitHub.