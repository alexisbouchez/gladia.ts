export interface GladiaConfig {
  apiKey: string;
  baseUrl?: string;
  language?: string;
  diarization?: boolean;
  diarizationConfig?: {
    number_of_speakers?: number;
    min_speakers?: number;
    max_speakers?: number;
  };
}

export interface TranscriptionOptions {
  language?: string;
  language_behavior?: 'automatic' | 'manual';
  detect_language?: boolean;
  transcription_hint?: string;
  toggle_noise_reduction?: boolean;
  toggle_diarization?: boolean;
  toggle_highlights?: boolean;
  model_name?: 'gemma' | 'nova';
  enable_code_switching?: boolean;
  output_format?: 'segments' | 'full_transcript';
  audio_channel_selector?: 'left' | 'right' | 'mixed';

  diarization?: boolean;
  diarization_config?: {
    number_of_speakers?: number;
    min_speakers?: number;
    max_speakers?: number;
  };

  translation?: boolean;
  translation_config?: {
    target_languages?: string[];
    model?: 'base' | 'large';
  };

  subtitles?: boolean;
  subtitles_config?: {
    formats?: ('srt' | 'vtt')[];
  };

  summarization?: boolean;
  summarization_config?: {
    type?: 'paragraph' | 'bullets';
    length?: 'small' | 'medium' | 'large';
  };

  named_entity_recognition?: boolean;

  sentiment_analysis?: boolean;

  content_moderation?: boolean;

  chapterization?: boolean;

  callback?: boolean;
  callback_config?: {
    url: string;
    method?: 'POST' | 'PUT';
    headers?: Record<string, string>;
  };
}

export interface Speaker {
  id: string;
  label: string;
  confidence: number;
}

export interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
  confidence: number;
  speaker?: string;
  words?: Word[];
}

export interface TranscriptionResponse {
  id: string;
  result_url: string;
  status: 'created' | 'processing' | 'done' | 'error';
}

export interface TranscriptionResult {
  id: string;
  request_id?: string;
  version?: number;
  status: 'created' | 'processing' | 'done' | 'error';
  created_at?: string;
  completed_at?: string;
  custom_metadata?: any;
  error_code?: string;
  kind?: string;

  file?: {
    id: string;
    filename: string;
    source: string;
    audio_duration: number;
    number_of_channels: number;
  };

  request_params?: {
    audio_url: string;
    language?: string;
    diarization?: boolean;
    [key: string]: any;
  };

  result?: {
    metadata?: {
      audio_duration: number;
      number_of_distinct_channels: number;
      billing_time: number;
      transcription_time: number;
    };

    transcription: {
      languages: string[];
      utterances: Utterance[];
      full_transcript: string;
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

export interface Utterance {
  start: number;
  end: number;
  text: string;
  confidence: number;
  speaker?: string;
  words?: Word[];
  channel?: number;
}

export interface AudioUploadResponse {
  audio_url: string;
}

export interface RealTimeTranscriptionOptions {
  language?: string;
  language_behavior?: 'automatic' | 'manual';
  detect_language?: boolean;
  transcription_hint?: string;
  toggle_noise_reduction?: boolean;
  toggle_diarization?: boolean;
  toggle_interim_results?: boolean;
  model_name?: 'gemma' | 'nova';
  audio_channel_selector?: 'left' | 'right' | 'mixed';

  diarization?: boolean;

  translation?: boolean;
  translation_config?: {
    target_languages?: string[];
  };

  named_entity_recognition?: boolean;

  sentiment_analysis?: boolean;

  callback_url?: string;
}

export interface RealTimeTranscriptionResult {
  type:
    | 'transcript'
    | 'translation'
    | 'sentiment_analysis'
    | 'named_entity_recognition'
    | 'speech_start'
    | 'speech_end';
  is_final: boolean;
  text?: string;
  confidence?: number;
  speaker?: string;
  language?: string;
  start?: number;
  end?: number;
  entities?: Array<{
    text: string;
    type: string;
  }>;
  sentiment?: {
    score: number;
    label: string;
  };
}

export class GladiaError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'GladiaError';
  }
}
