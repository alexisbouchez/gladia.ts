import { GladiaClient, GladiaError } from '../src';

async function main() {
  // Initialize the client
  const client = new GladiaClient({
    apiKey: process.env.GLADIA_API_KEY || 'your-api-key',
    language: 'en', // Changed to English for better default support
    diarization: true,
  });

  try {
    // YouTube video URL
    const videoUrl = 'https://www.youtube.com/watch?v=DYyY8Nh3TQE';

    console.log('Starting transcription...');
    console.log('This may take a few minutes depending on the video length...');

    // Request transcription and wait for result
    const response = await client.transcribeVideo(videoUrl);

    // Check if we have a result at all
    if (!response) {
      throw new Error('No response received from the API');
    }

    console.log(`Transcription status: ${response.status}`);

    // If status is not 'done', it might be because we're using a callback
    // or the transcription is still processing
    if (response.status !== 'done') {
      console.log('Transcription is not complete yet.');

      if (response.id) {
        console.log(
          `You can check the status later using the ID: ${response.id}`
        );
      }

      return;
    }

    // Make sure we have the result data with transcription
    if (!response.result?.transcription?.full_transcript) {
      throw new Error('Invalid response format: missing transcription data');
    }

    const transcription = response.result.transcription;
    const utterances = transcription.utterances || [];
    const speakers = response.result.speakers || [];

    // Print the full transcription
    console.log('\n== Full Transcription ==');
    console.log(transcription.full_transcript);

    // Print speaker information if available
    if (speakers.length > 0) {
      console.log('\n== Speakers ==');
      speakers.forEach(speaker => {
        console.log(
          `- ${speaker.label} (confidence: ${(speaker.confidence * 100).toFixed(
            2
          )}%)`
        );
      });
    }

    // Print utterances with speaker information
    if (utterances.length > 0) {
      console.log('\n== Utterances ==');
      utterances.forEach(utterance => {
        console.log(
          `\n[${utterance.start.toFixed(2)}s - ${utterance.end.toFixed(2)}s]`
        );
        if (utterance.speaker) {
          console.log(`Speaker: ${utterance.speaker}`);
        }
        console.log(utterance.text);
      });
    }

    // Print confidence score (average from utterances if available)
    if (utterances.length > 0) {
      const avgConfidence =
        utterances.reduce((sum, utterance) => sum + utterance.confidence, 0) /
        utterances.length;
      console.log(`\n== Overall Confidence ==`);
      console.log(`${(avgConfidence * 100).toFixed(2)}%`);
    }

    // Print summary if available
    if (response.result.summary) {
      console.log('\n== Summary ==');
      console.log(response.result.summary.text);
    }

    // Print subtitles if available
    if (response.result.subtitles) {
      console.log('\n== Subtitles ==');
      if (response.result.subtitles.srt) {
        console.log('\nSRT format (sample):');
        // Print just a sample of the SRT
        console.log(
          response.result.subtitles.srt
            .split('\n\n')
            .slice(0, 3)
            .join('\n\n')
        );
      }
      if (response.result.subtitles.vtt) {
        console.log('\nVTT format (sample):');
        // Print just a sample of the VTT
        console.log(
          response.result.subtitles.vtt
            .split('\n\n')
            .slice(0, 3)
            .join('\n\n')
        );
      }
    }

    // Print translations if available
    if (response.result.translations) {
      console.log('\n== Translations ==');
      Object.entries(response.result.translations).forEach(([lang, text]) => {
        console.log(`\n${lang.toUpperCase()}:`);
        console.log(text);
      });
    }

    // Print file and audio info if available
    if (response.file) {
      console.log('\n== File Information ==');
      console.log(`Filename: ${response.file.filename}`);
      console.log(`Source: ${response.file.source}`);
      console.log(`Duration: ${response.file.audio_duration.toFixed(2)}s`);
      console.log(`Channels: ${response.file.number_of_channels}`);
    } else if (response.audio) {
      console.log('\n== Audio Information ==');
      console.log(`Duration: ${response.audio.duration.toFixed(2)}s`);
      console.log(`Language: ${response.audio.language}`);
    }

    // Print metadata if available
    if (response.result?.metadata) {
      console.log('\n== Metadata ==');
      console.log(
        `Audio Duration: ${response.result.metadata.audio_duration.toFixed(2)}s`
      );
      console.log(
        `Transcription Time: ${response.result.metadata.transcription_time.toFixed(
          2
        )}s`
      );
      console.log(
        `Distinct Channels: ${response.result.metadata.number_of_distinct_channels}`
      );
    }

    console.log('\nTranscription completed successfully!');
  } catch (error) {
    console.error('\n== ERROR ==');

    if (error instanceof GladiaError) {
      // Handle Gladia-specific errors
      console.error(
        `API Error (${error.statusCode || 'Unknown'}): ${error.message}`
      );

      if (error.statusCode === 401) {
        console.error('\nAuthentication error. Please check your API key.');
        console.error('You can get your API key from: https://app.gladia.io/');
      } else if (error.statusCode === 404) {
        console.error('\nResource not found. Please check the URL or ID.');
      } else if (error.statusCode === 429) {
        console.error('\nRate limit exceeded. Please try again later.');
      } else if (error.statusCode === 400) {
        console.error('\nBad request. Please check your input parameters.');
      } else if (error.statusCode === 500) {
        console.error(
          '\nServer error. Please try again later or contact support.'
        );
      }
    } else if (error instanceof Error) {
      // Handle generic errors
      console.error(`Error: ${error.message}`);

      if (error.message.includes('Invalid response format')) {
        console.error(
          '\nThe API response format was not as expected. This might indicate an API change.'
        );
        // Dump the response structure to help debugging
        console.error(
          '\nPlease report this to the maintainers with the following information:'
        );
        try {
          const lastResponse = await client.getTranscription(
            error.message.split('ID: ')[1] || ''
          );
          console.error(
            'Response structure:',
            JSON.stringify(lastResponse, null, 2).substring(0, 500) + '...'
          );
        } catch (e) {
          // Ignore errors when trying to get debugging info
        }
      } else if (error.message.includes('No response received')) {
        console.error(
          '\nNo response was received from the API. Please check your internet connection.'
        );
      }
    } else {
      // Fallback for unknown error types
      console.error('An unknown error occurred:', error);
    }

    console.error('\nFor help, please visit: https://docs.gladia.io/');
  }
}

// Run the example
main().catch(e => {
  console.error('Unhandled exception:', e);
  process.exit(1);
});
