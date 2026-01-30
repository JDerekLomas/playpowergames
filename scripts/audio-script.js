import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import { URL } from 'url';

// DOCUMENTATION: https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
// SAMPLE VOICE: https://cloud.google.com/text-to-speech/docs/voices

// --- CONFIGURATION ---
// IMPORTANT: Replace this with your actual Google Cloud API Key.
const API_KEY = 'AIzaSyDVbvAcif1ibeEnQuJEAcW1k7H9kHeY3n8';

// The folder where the generated MP3 files will be saved.
const OUTPUT_DIR = 'output';

// Centralized voice configuration. The script will select from here based on the key ('spanish', 'english').
const voiceConfigs = {
  spanish: {
    languageCode: "es-US",
    name: "es-US-Chirp3-HD-Puck"
  },
  english: {
    languageCode: "en-US",
    name: "en-US-Chirp3-HD-Puck"
  }
};

// The Google Text-to-Speech API endpoint.
const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
// --- END CONFIGURATION ---


// --- IN-MEMORY INPUT DATA ---
// Input is now an object with keys for each language.
// Each key contains an array of audio files to generate.
const inputData = {
  spanish: [
    {
      text: "Localiza la fracción equivalente en la línea numérica.",
      outputFileName: "step_1_es.mp3"
    },
    {
      text: "Divide la línea en cuatro partes.",
      outputFileName: "step_2_es.mp3"
    },
    {
      text: "Mueve dos pasos desde el inicio.",
      outputFileName: "step_3_es.mp3"
    },
    {
      text: "Mueve un paso desde el inicio.",
      outputFileName: "step_4_es.mp3"
    },
    {
      text: "Entonces un medio es igual a dos cuartos.",
      outputFileName: "step_5_es.mp3"
    }
  ],
  english: [
    {
      text: "Plot the equivalent fraction on the number line.",
      outputFileName: "step_1_en.mp3"
    },
    {
      text: "Divide the line into four parts.",
      outputFileName: "step_2_en.mp3"
    },
    {
      text: "Move two steps from the start.",
      outputFileName: "step_3_en.mp3"
    },
    {
      text: "Move one step from the start.",
      outputFileName: "step_4_en.mp3"
    },
    {
      text: "So one half equals two fourths.",
      outputFileName: "step_5_en.mp3"
    }
  ]
};
// --- END IN-MEMORY DATA ---


/**
 * Synthesizes speech using the native Node.js https module.
 * @param {object} requestData - An object containing the text and outputFileName.
 * @param {object} voice - The voice configuration object (languageCode, name).
 * @param {number} index - The global index of the request for logging.
 * @returns {Promise<void>} A promise that resolves when the operation is settled.
 */
function synthesizeSpeech(requestData, voice, index) {
  const { text, outputFileName } = requestData;

  if (!text || !outputFileName) {
    console.error(`[Request #${index}] Invalid request data. Missing 'text' or 'outputFileName'. Skipping.`);
    return Promise.resolve(); // Return a resolved promise to not break the chain
  }

  console.log(`[Request #${index}] Starting synthesis for: "${outputFileName}" using voice ${voice.name}...`);

  const payload = {
    input: { text },
    voice: voice,
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.8,
    },
  };
  const stringifiedPayload = JSON.stringify(payload);

  // Return a promise to be used with Promise.allSettled
  return new Promise((resolve) => {
    const url = new URL(API_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(stringifiedPayload),
      },
    };

    const req = https.request(options, (res) => {
      const bodyChunks = [];
      res.on('data', (chunk) => bodyChunks.push(chunk));

      // This callback runs when the full response is received.
      res.on('end', async () => {
        try {
          const responseBody = Buffer.concat(bodyChunks).toString();
          const responseData = JSON.parse(responseBody);

          if (res.statusCode >= 200 && res.statusCode < 300 && responseData.audioContent) {
            const audioBuffer = Buffer.from(responseData.audioContent, 'base64');
            const outputPath = path.join(OUTPUT_DIR, outputFileName);
            await fs.writeFile(outputPath, audioBuffer);
            console.log(`[Request #${index}] ✅ Successfully created: ${outputPath}`);
          } else {
            // Handle API-level errors (e.g., bad request, invalid key)
            const errorMessage = JSON.stringify(responseData, null, 2);
            console.error(`[Request #${index}] ❌ API returned an error for "${outputFileName}". Status: ${res.statusCode}. Response: ${errorMessage}`);
          }
        } catch (e) {
          // Handle JSON parsing or file writing errors
          console.error(`[Request #${index}] ❌ Failed to process response for "${outputFileName}". Error: ${e.message}`);
        } finally {
          // Resolve the promise to indicate this job is done, regardless of success.
          resolve();
        }
      });
    });

    // Handle network-level errors
    req.on('error', (error) => {
      console.error(`[Request #${index}] ❌ Network error for "${outputFileName}". Error: ${error.message}`);
      resolve(); // Resolve so Promise.allSettled can continue
    });

    // Send the request payload
    req.write(stringifiedPayload);
    req.end();
  });
}


/**
 * Main function to run the batch process.
 */
async function main() {
  console.log('--- Starting Batch Text-to-Speech Synthesis ---');

  if (API_KEY === 'YOUR_API_KEY') {
    console.error("\n🛑 ERROR: Please replace 'YOUR_API_KEY' in synthesize.js with your actual Google Cloud API key.\n");
    return;
  }

  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Output directory is ready at: ./${OUTPUT_DIR}`);

    // Flatten all requests from the inputData object into a single array of promises.
    const synthesisPromises = [];
    let requestIndex = 1;

    for (const language in inputData) {
      if (Object.hasOwnProperty.call(inputData, language)) {
        const requests = inputData[language];
        const voice = voiceConfigs[language];

        if (!voice) {
          console.warn(`⚠️ Warning: No voice configuration found for language "${language}". Skipping ${requests.length} requests.`);
          continue;
        }

        for (const requestData of requests) {
          synthesisPromises.push(synthesizeSpeech(requestData, voice, requestIndex++));
        }
      }
    }

    if (synthesisPromises.length === 0) {
      console.log("No requests to process. Exiting.");
      return;
    }

    console.log(`Found a total of ${synthesisPromises.length} requests to process.`);

    // Execute all promises in parallel.
    await Promise.allSettled(synthesisPromises);

  } catch (error) {
    console.error('\n🛑 An unexpected error occurred:', error);
    return;
  }

  console.log('\n--- Batch processing complete. ---');
}

// Run the main function.
main();