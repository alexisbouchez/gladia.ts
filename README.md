# Gladia TypeScript SDK

Official TypeScript SDK for Gladia - State-of-the-art Speech to Text API

[![npm version](https://img.shields.io/npm/v/gladia.svg)](https://www.npmjs.com/package/gladia)
[![GitHub](https://img.shields.io/github/license/alexisbouchez/gladia.ts)](https://github.com/alexisbouchez/gladia.ts/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/alexisbouchez/gladia.ts)](https://github.com/alexisbouchez/gladia.ts/issues)
[![GitHub stars](https://img.shields.io/github/stars/alexisbouchez/gladia.ts)](https://github.com/alexisbouchez/gladia.ts/stargazers)

## Features

- 🎯 Full TypeScript support with comprehensive type definitions
- 🎙️ Asynchronous audio and video transcription
- 🔄 Real-time transcription with WebSocket support
- 🌍 Multi-language support (100+ languages)
- 👥 Speaker diarization
- 🔤 Translation capabilities
- 📝 Audio summarization
- 😊 Sentiment analysis
- 🏷️ Named entity recognition
- 🛡️ Content moderation
- 📚 Chapter generation

## Installation

```bash
npm install gladia
# or
yarn add gladia
```

## Quick Start

```typescript
import { GladiaClient } from 'gladia';

const client = new GladiaClient({
  apiKey: process.env.GLADIA_API_KEY || 'your-api-key',
  language: 'en',
  diarization: true,
});

// Transcribe a YouTube video
const result = await client.transcribeVideo(
  'https://www.youtube.com/watch?v=DYyY8Nh3TQE'
);

// Print the full transcription
console.log(result.result.transcription.full_transcript);

// Print speaker information
if (result.result.speakers && result.result.speakers.length > 0) {
  result.result.speakers.forEach(speaker => {
    console.log(
      `Speaker ${speaker.label}: ${speaker.confidence * 100}% confidence`
    );
  });
}

// Print segments with timing
result.result.transcription.segments.forEach(segment => {
  console.log(`[${segment.start}s - ${segment.end}s] ${segment.text}`);
});
```

## API Reference

### Client Configuration

```typescript
interface GladiaConfig {
  apiKey: string; // Required: Your Gladia API key
  baseUrl?: string; // Optional: Custom API base URL (defaults to https://api.gladia.io/v2)
  language?: string; // Optional: Default language for transcription
  diarization?: boolean; // Optional: Enable speaker diarization
  diarizationConfig?: {
    // Optional: Diarization configuration
    number_of_speakers?: number;
    min_speakers?: number;
    max_speakers?: number;
  };
}
```

### Methods

#### Audio Transcription

```typescript
transcribeAudio(
  audioUrl: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult>
```

#### Video Transcription

```typescript
transcribeVideo(
  videoUrl: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult>
```

#### File Upload Transcription

```typescript
transcribeFile(
  file: File | Blob,
  options?: TranscriptionOptions
): Promise<TranscriptionResult>
```

#### Get Transcription Result

```typescript
getTranscription(
  id: string
): Promise<TranscriptionResult>
```

#### Delete Transcription

```typescript
deleteTranscription(
  id: string
): Promise<void>
```

#### Real-time Transcription

```typescript
createRealTimeTranscription(
  options?: RealTimeTranscriptionOptions
): WebSocket & {
  sendAudio: (audioChunk: ArrayBuffer | Blob) => void;
  stopRecording: () => void;
}
```

#### Audio Intelligence Features

```typescript
translateAudio(
  audioUrl: string,
  targetLanguages: string[] | string,
  options?: Omit<TranscriptionOptions, 'translation'>
): Promise<TranscriptionResult>

summarizeAudio(
  audioUrl: string,
  options?: Omit<TranscriptionOptions, 'summarization'>
): Promise<TranscriptionResult>

analyzeSentiment(
  audioUrl: string,
  options?: Omit<TranscriptionOptions, 'sentiment_analysis'>
): Promise<TranscriptionResult>

detectEntities(
  audioUrl: string,
  options?: Omit<TranscriptionOptions, 'named_entity_recognition'>
): Promise<TranscriptionResult>

moderateContent(
  audioUrl: string,
  options?: Omit<TranscriptionOptions, 'content_moderation'>
): Promise<TranscriptionResult>

generateChapters(
  audioUrl: string,
  options?: Omit<TranscriptionOptions, 'chapterization'>
): Promise<TranscriptionResult>
```

### Response Structure

The SDK follows the official Gladia API v2 response structure:

```typescript
interface TranscriptionResult {
  id: string;
  status: 'created' | 'processing' | 'done' | 'error';

  result?: {
    transcription: {
      full_transcript: string;
      segments: Segment[];
    };

    speakers?: Speaker[];

    summary?: {
      text: string;
    };

    sentiment?: {
      score: number;
      label: string;
    };

    entities?: Array<{
      text: string;
      type: string;
      start: number;
      end: number;
    }>;

    moderation?: {
      categories: Array<{
        name: string;
        confidence: number;
      }>;
    };

    chapters?: Array<{
      title: string;
      start: number;
      end: number;
      summary: string;
    }>;

    subtitles?: {
      srt?: string;
      vtt?: string;
    };

    translations?: Record<string, string>;
  };

  audio?: {
    duration: number;
    language: string;
  };

  error?: {
    message: string;
    code: string;
  };
}
```

## Examples

### YouTube Video Transcription

```typescript
import { GladiaClient } from 'gladia';

// Initialize client
const client = new GladiaClient({
  apiKey: process.env.GLADIA_API_KEY,
  language: 'en',
});

// Transcribe a YouTube video
const result = await client.transcribeVideo(
  'https://www.youtube.com/watch?v=VIDEO_ID'
);

// Check if transcription is complete
if (result.status === 'done' && result.result?.transcription) {
  console.log(result.result.transcription.full_transcript);
}
```

### Real-time Transcription

```typescript
import { GladiaClient } from 'gladia';

// Initialize client
const client = new GladiaClient({
  apiKey: process.env.GLADIA_API_KEY,
});

// Create WebSocket for real-time transcription
const socket = client.createRealTimeTranscription({
  language: 'en',
  toggle_diarization: true,
  toggle_interim_results: true,
});

// Handle incoming messages
socket.onmessage = event => {
  const data = JSON.parse(event.data);

  if (data.type === 'transcript' && data.is_final) {
    console.log(`Transcript: ${data.text}`);
  }
};

// Start recording after connection is established
socket.onopen = () => {
  // For example purposes - assuming we have audio data chunks
  // In a real app, you would get these from a microphone
  const audioChunk = new Uint8Array([
    /* audio data */
  ]);
  socket.sendAudio(audioChunk.buffer);

  // Later when done recording
  socket.stopRecording();
};

// Close connection when done
socket.onclose = () => {
  console.log('Transcription session ended');
};
```

### Audio Intelligence

```typescript
import { GladiaClient } from 'gladia';

// Initialize client
const client = new GladiaClient({
  apiKey: process.env.GLADIA_API_KEY,
});

// Translation
const translation = await client.translateAudio(
  'https://example.com/audio.mp3',
  ['es', 'fr', 'de']
);

// Summarization
const summary = await client.summarizeAudio('https://example.com/audio.mp3');
console.log(summary.result?.summary?.text);

// Sentiment Analysis
const sentiment = await client.analyzeSentiment(
  'https://example.com/audio.mp3'
);
console.log(sentiment.result?.sentiment?.label);

// Entity Recognition
const entities = await client.detectEntities('https://example.com/audio.mp3');
entities.result?.entities?.forEach(entity => {
  console.log(`${entity.text} (${entity.type})`);
});

// Content Moderation
const moderation = await client.moderateContent(
  'https://example.com/audio.mp3'
);

// Chapter Generation
const chapters = await client.generateChapters('https://example.com/audio.mp3');
chapters.result?.chapters?.forEach(chapter => {
  console.log(`${chapter.title} (${chapter.start}s - ${chapter.end}s)`);
  console.log(chapter.summary);
});
```

## Error Handling

The SDK uses a custom `GladiaError` class for error handling:

```typescript
try {
  const result = await client.transcribeAudio('https://example.com/audio.mp3');
} catch (error) {
  if (error instanceof GladiaError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);

    // Handle specific error cases
    if (error.statusCode === 401) {
      console.error('Invalid API key');
    } else if (error.statusCode === 429) {
      console.error('Rate limit exceeded');
    }
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

If you encounter any issues or have questions, please file an issue on the [GitHub repository](https://github.com/alexisbouchez/gladia.ts/issues).
