export * from './types';
export { GladiaClient } from './client';

// Example usage:
/*
import { GladiaClient } from 'gladia';

const client = new GladiaClient({
  apiKey: 'your-api-key',
  language: 'en',
  diarization: true
});

// Transcribe audio
const result = await client.transcribeAudio('https://example.com/audio.mp3');

// Real-time transcription
const ws = client.createRealTimeTranscription({
  language: 'en',
  interimResults: true
});

ws.onmessage = (event) => {
  const result = JSON.parse(event.data);
  console.log(result.text);
};

// Audio intelligence features
const translation = await client.translateAudio('https://example.com/audio.mp3', 'es');
const summary = await client.summarizeAudio('https://example.com/audio.mp3');
const sentiment = await client.analyzeSentiment('https://example.com/audio.mp3');
const entities = await client.detectEntities('https://example.com/audio.mp3');
const moderation = await client.moderateContent('https://example.com/audio.mp3');
const chapters = await client.generateChapters('https://example.com/audio.mp3');
*/
