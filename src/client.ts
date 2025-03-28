import {
  GladiaConfig,
  TranscriptionOptions,
  TranscriptionResult,
  RealTimeTranscriptionOptions,
  RealTimeTranscriptionResult,
  TranscriptionResponse,
  AudioUploadResponse,
  GladiaError,
} from './types';

export class GladiaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultOptions: Partial<TranscriptionOptions>;

  constructor(config: GladiaConfig) {
    if (!config.apiKey) {
      throw new GladiaError('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.gladia.io';
    this.defaultOptions = {
      language: config.language,
      diarization: config.diarization,
      diarization_config: config.diarizationConfig,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'x-gladia-key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        let errorCode = null;

        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          errorCode = errorData.code || null;
        } catch (e) {
          // Ignore JSON parsing errors
        }

        throw new GladiaError(errorMessage, response.status, errorCode);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof GladiaError) {
        throw error;
      }

      // Handle network errors or other fetch issues
      throw new GladiaError(
        error instanceof Error ? error.message : 'Network error occurred',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  private async waitForResult(
    resultUrl: string,
    options: { pollingInterval?: number; maxRetries?: number } = {}
  ): Promise<TranscriptionResult> {
    const { pollingInterval = 2000, maxRetries = 60 } = options; // Default 2 minutes max waiting time
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await this.request<TranscriptionResult>(resultUrl);

        if (response.status === 'done') {
          // Success case - the API returns a valid result
          if (!response.result?.transcription?.full_transcript) {
            console.warn(
              'Warning: Response missing expected transcription data'
            );
          }
          return response; // Return the response as-is, don't validate specific structure
        } else if (response.status === 'error') {
          throw new GladiaError(
            `Transcription failed: ${response.error?.message ||
              'Unknown error'}`,
            undefined,
            response.error?.code
          );
        }

        // Still processing - log and wait
        console.log(
          `Transcription status: ${response.status} (attempt ${retries +
            1}/${maxRetries})`
        );
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        retries++;
      } catch (error) {
        if (error instanceof GladiaError && error.statusCode === 404) {
          // Resource not found yet, might need a moment to propagate
          console.log(
            `Waiting for resource to be available (attempt ${retries +
              1}/${maxRetries})`
          );
          await new Promise(resolve => setTimeout(resolve, pollingInterval));
          retries++;
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }

    throw new GladiaError(
      `Transcription timed out after ${maxRetries} attempts`,
      408,
      'TIMEOUT'
    );
  }

  /**
   * Transcribe audio from a URL
   */
  async transcribeAudio(
    audioUrl: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
    };

    try {
      // Use v2 endpoint for transcription
      const response = await this.request<TranscriptionResponse>(
        '/v2/transcription',
        {
          method: 'POST',
          body: JSON.stringify({
            audio_url: audioUrl,
            ...mergedOptions,
          }),
        }
      );

      if (!response.id) {
        throw new GladiaError('Invalid response: missing id');
      }

      // Handle callback case
      if (options.callback) {
        return {
          id: response.id,
          status: response.status,
        } as TranscriptionResult;
      }

      // For non-callback case, we need to poll for results
      const resultUrl =
        response.result_url ||
        `${this.baseUrl}/v2/transcription/${response.id}`;
      return this.waitForResult(resultUrl);
    } catch (error) {
      // Check for specific error types and provide better messages
      if (error instanceof GladiaError) {
        if (error.statusCode === 413) {
          throw new GladiaError(
            'File too large. Maximum file size is 500MB.',
            413,
            'PAYLOAD_TOO_LARGE'
          );
        } else if (error.statusCode === 415) {
          throw new GladiaError(
            'Unsupported file format. Please use a supported audio format (mp3, wav, mp4, etc.).',
            415,
            'UNSUPPORTED_MEDIA_TYPE'
          );
        }
      }
      throw error;
    }
  }

  /**
   * Transcribe video from a URL (same as transcribeAudio)
   */
  async transcribeVideo(
    videoUrl: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    return this.transcribeAudio(videoUrl, options);
  }

  /**
   * Upload and transcribe a file
   */
  async transcribeFile(
    file: File | Blob,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    // Create a properly named file to ensure correct format detection
    const fileName = (file as File).name || `audio_${Date.now()}.mp3`;
    const fileExtension =
      fileName
        .split('.')
        .pop()
        ?.toLowerCase() || 'mp3';
    const namedFile = new File([file], `audio.${fileExtension}`, {
      type: file.type || `audio/${fileExtension}`,
    });

    // First, upload the file
    const formData = new FormData();
    formData.append('audio', namedFile);

    try {
      const uploadResponse = await fetch(`${this.baseUrl}/v2/upload`, {
        method: 'POST',
        headers: {
          'x-gladia-key': this.apiKey,
          // Let browser set Content-Type with boundary
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        let errorMessage = `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`;
        let errorData: { message?: string; code?: string } = {};

        try {
          errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If not JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }

        throw new GladiaError(
          errorMessage,
          uploadResponse.status,
          errorData.code
        );
      }

      const uploadData = await uploadResponse.json();

      if (!uploadData.audio_url) {
        throw new GladiaError('Upload successful but no audio URL returned');
      }

      // Then transcribe the uploaded file
      return this.transcribeAudio(uploadData.audio_url, options);
    } catch (error) {
      if (error instanceof GladiaError) {
        throw error;
      }

      throw new GladiaError(
        error instanceof Error
          ? `File upload failed: ${error.message}`
          : 'File upload failed',
        0,
        'UPLOAD_ERROR'
      );
    }
  }

  /**
   * Get a previously created transcription by ID
   */
  async getTranscription(id: string): Promise<TranscriptionResult> {
    return this.request<TranscriptionResult>(`/v2/transcription/${id}`);
  }

  /**
   * Delete a transcription by ID
   */
  async deleteTranscription(id: string): Promise<void> {
    await this.request(`/v2/transcription/${id}`, { method: 'DELETE' });
  }

  /**
   * Create a WebSocket connection for real-time transcription
   */
  createRealTimeTranscription(
    options: RealTimeTranscriptionOptions = {}
  ): WebSocket {
    const wsUrl = new URL(`${this.baseUrl}/v2/live`);
    wsUrl.searchParams.append('x-gladia-key', this.apiKey);

    // Add options as query parameters
    Object.entries(options).forEach(([key, value]) => {
      if (typeof value === 'object') {
        wsUrl.searchParams.append(key, JSON.stringify(value));
      } else if (value !== undefined) {
        wsUrl.searchParams.append(key, String(value));
      }
    });

    const socket = new WebSocket(wsUrl.toString());

    // Add convenience methods to the socket
    const enhancedSocket = socket as WebSocket & {
      sendAudio: (audioChunk: ArrayBuffer | Blob) => void;
      stopRecording: () => void;
    };

    enhancedSocket.sendAudio = (audioChunk: ArrayBuffer | Blob) => {
      if (socket.readyState === WebSocket.OPEN) {
        if (audioChunk instanceof Blob) {
          // If we have a Blob, we need to convert it to ArrayBuffer
          const reader = new FileReader();
          reader.onload = () => {
            socket.send(reader.result as ArrayBuffer);
          };
          reader.readAsArrayBuffer(audioChunk);
        } else {
          socket.send(audioChunk);
        }
      }
    };

    enhancedSocket.stopRecording = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'stop_recording' }));
      }
    };

    return enhancedSocket;
  }

  /**
   * Translate audio/video from a URL
   */
  async translateAudio(
    audioUrl: string,
    targetLanguages: string[] | string,
    options: Omit<TranscriptionOptions, 'translation'> = {}
  ): Promise<TranscriptionResult> {
    const languages = Array.isArray(targetLanguages)
      ? targetLanguages
      : [targetLanguages];

    return this.transcribeAudio(audioUrl, {
      ...options,
      translation: true,
      translation_config: {
        target_languages: languages,
      },
    });
  }

  /**
   * Generate a summary of audio/video
   */
  async summarizeAudio(
    audioUrl: string,
    options: Omit<TranscriptionOptions, 'summarization'> = {}
  ): Promise<TranscriptionResult> {
    return this.transcribeAudio(audioUrl, {
      ...options,
      summarization: true,
    });
  }

  /**
   * Analyze sentiment in audio/video
   */
  async analyzeSentiment(
    audioUrl: string,
    options: Omit<TranscriptionOptions, 'sentiment_analysis'> = {}
  ): Promise<TranscriptionResult> {
    return this.transcribeAudio(audioUrl, {
      ...options,
      sentiment_analysis: true,
    });
  }

  /**
   * Recognize named entities in audio/video
   */
  async detectEntities(
    audioUrl: string,
    options: Omit<TranscriptionOptions, 'named_entity_recognition'> = {}
  ): Promise<TranscriptionResult> {
    return this.transcribeAudio(audioUrl, {
      ...options,
      named_entity_recognition: true,
    });
  }

  /**
   * Apply content moderation to audio/video
   */
  async moderateContent(
    audioUrl: string,
    options: Omit<TranscriptionOptions, 'content_moderation'> = {}
  ): Promise<TranscriptionResult> {
    return this.transcribeAudio(audioUrl, {
      ...options,
      content_moderation: true,
    });
  }

  /**
   * Generate chapters for audio/video
   */
  async generateChapters(
    audioUrl: string,
    options: Omit<TranscriptionOptions, 'chapterization'> = {}
  ): Promise<TranscriptionResult> {
    return this.transcribeAudio(audioUrl, {
      ...options,
      chapterization: true,
    });
  }
}
