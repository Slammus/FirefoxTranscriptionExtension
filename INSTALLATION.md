# Installation and Testing Guide

This guide will walk you through installing and testing the Firefox Tab Audio Transcription Extension.

## Prerequisites

- Firefox Browser (version 90 or later recommended)
- Basic understanding of Firefox extension development (optional)

## Installation Steps

### Method 1: Load Temporary Extension (Development)

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Slammus/FirefoxTranscriptionExtension.git
   cd FirefoxTranscriptionExtension
   ```

2. **Open Firefox Developer Tools**
   - Open Firefox
   - Type `about:debugging` in the address bar and press Enter
   - Click on "This Firefox" in the left sidebar

3. **Load the Extension**
   - Click the "Load Temporary Add-on..." button
   - Navigate to the extension directory
   - Select the `manifest.json` file
   - Click "Open"

4. **Verify Installation**
   - You should see the extension listed in the "Temporary Extensions" section
   - The extension icon (microphone) should appear in the Firefox toolbar
   - Check for any error messages in the extension console

### Method 2: Package and Install (Production)

1. **Package the Extension**
   ```bash
   cd FirefoxTranscriptionExtension
   zip -r firefox-transcription.xpi * -x "*.git*" -x "*test*" -x "*examples*"
   ```

2. **Install the Package**
   - Open Firefox
   - Type `about:addons` in the address bar
   - Click the gear icon and select "Install Add-on From File..."
   - Select the `firefox-transcription.xpi` file
   - Approve the installation when prompted

## Testing the Extension

### Test 1: Basic Audio Capture

1. **Open Test Page**
   - Navigate to `test-page.html` in your browser
   - Or visit any website with audio content (YouTube, podcast site, etc.)

2. **Start Recording**
   - Click the extension icon in the toolbar
   - Click "Start Recording" button
   - The status should change to "Recording..."

3. **Play Audio**
   - If using test page: Click "Speak Test Phrase" or play the audio player
   - If using another site: Play the video/audio content

4. **Stop Recording**
   - Click "Stop Recording" button in the extension popup
   - The status should change to "Processing..."
   - Wait for transcription to complete (2-3 seconds with mock implementation)

5. **View Results**
   - The transcription should appear in the popup
   - Click "Copy to Clipboard" to copy the text
   - Paste somewhere to verify the copy function works

### Test 2: Multiple Recordings

1. Record audio from the same tab multiple times
2. Verify that each recording is properly processed
3. Check that previous transcriptions are preserved

### Test 3: Different Tabs

1. Open multiple tabs with audio content
2. Switch between tabs and record audio from each
3. Verify that recordings are associated with the correct tab

### Test 4: Error Handling

1. Try starting recording on a tab without audio
2. Try stopping when no recording is active
3. Verify appropriate error messages are displayed

## Debugging

### Browser Console

View background script logs:
1. Go to `about:debugging`
2. Find your extension in the list
3. Click "Inspect" next to "Manifest URL"
4. Open the Console tab to see logs

### Popup Console

View popup script logs:
1. Right-click the extension icon
2. Select "Inspect"
3. The popup inspector will open with the Console tab

### Common Issues

#### Extension Not Loading
- **Issue**: Extension doesn't appear after loading
- **Solution**: Check manifest.json syntax, verify all files exist

#### Recording Not Starting
- **Issue**: "Start Recording" button does nothing
- **Solution**: 
  - Check browser console for errors
  - Verify tabCapture permission is granted
  - Make sure you're on a tab with content (not about: pages)

#### No Audio Captured
- **Issue**: Recording completes but no audio data
- **Solution**:
  - Verify the tab has audio playing
  - Check that system audio is working
  - Try a different tab or audio source

#### Transcription Stuck on "Processing..."
- **Issue**: Transcription never completes
- **Solution**:
  - Check browser console for errors
  - Verify storage permission is granted
  - Try recording again

## Performance Testing

### Test Audio Duration Handling

1. **Short Recording** (< 10 seconds)
   - Should process quickly
   - Minimal memory usage

2. **Medium Recording** (10-60 seconds)
   - Should process within a few seconds
   - Moderate memory usage

3. **Long Recording** (> 60 seconds)
   - May take longer to process
   - Monitor memory usage in browser console

### Memory Usage

Check extension memory:
1. Go to `about:memory`
2. Click "Measure and save..."
3. Look for your extension in the list
4. Verify reasonable memory usage (< 100MB for typical use)

## Integration Testing (With Real Transcription Engine)

Once you integrate a real transcription engine (see `examples/whisper-integration.js`):

### Test 1: Model Loading
- Verify model loads on first use
- Check loading time (should be under 30 seconds for small models)
- Monitor memory usage during loading

### Test 2: Transcription Accuracy
- Record clear speech samples
- Compare transcription with expected text
- Test with different accents, speeds, and audio quality

### Test 3: Language Support
- Test with different languages (if supported)
- Verify proper character encoding
- Check for language detection accuracy

### Test 4: Performance
- Measure transcription time relative to audio length
- Test with various audio qualities (bitrates)
- Monitor CPU and memory usage during transcription

## Automated Testing

For automated testing, consider:

1. **Unit Tests** (using Jest or Mocha)
   ```javascript
   // Example test
   describe('Audio Capture', () => {
     it('should start recording on valid tab', async () => {
       const result = await startRecording(tabId);
       expect(result.success).toBe(true);
     });
   });
   ```

2. **Integration Tests** (using Selenium or Puppeteer)
   ```javascript
   // Example test
   test('Full recording workflow', async () => {
     await page.goto('test-page.html');
     await page.click('#extension-icon');
     await page.click('#startBtn');
     // ... test steps
   });
   ```

## Security Testing

### Privacy Checks
- [ ] Verify no data is sent to external servers (unless configured)
- [ ] Check that recordings are only stored locally
- [ ] Ensure proper cleanup of audio data

### Permission Checks
- [ ] Verify all required permissions are declared
- [ ] Test with minimal permissions
- [ ] Check for permission prompts

### Data Protection
- [ ] Verify recordings are associated with correct tabs
- [ ] Check that data is properly isolated between tabs
- [ ] Test data cleanup on tab close

## Troubleshooting

### Extension Not Working After Firefox Update
1. Reload the extension from `about:debugging`
2. Check for API changes in Firefox release notes
3. Update manifest version if needed

### Audio Quality Issues
1. Check source audio quality
2. Verify MediaRecorder codec support
3. Test with different audio formats

### Storage Issues
1. Check browser storage limits
2. Clear old recordings from storage
3. Implement storage cleanup routine

## Next Steps

After successful testing:

1. **Integrate Real Transcription Engine**
   - Follow guide in `examples/whisper-integration.js`
   - Test thoroughly with the integration

2. **Optimize Performance**
   - Implement audio chunking for long recordings
   - Add progress indicators
   - Optimize model loading

3. **Enhance Features**
   - Add export functionality
   - Implement real-time transcription
   - Support multiple languages

4. **Publish Extension**
   - Submit to Firefox Add-ons (AMO)
   - Follow Mozilla's review guidelines
   - Set up update mechanism

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review the README.md for common solutions
3. Open an issue on GitHub with:
   - Firefox version
   - Extension version
   - Steps to reproduce
   - Error messages
   - Browser console logs
