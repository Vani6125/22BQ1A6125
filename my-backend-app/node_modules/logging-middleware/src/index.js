// logging-middleware/src/index.js
const axios = require('axios');

// The correct URL from your image
const LOG_API_URL = 'http://20.244.56.144/evaluation-service/logs';

async function Log(stack, level, packageName, message) {
  try {
    const logPayload = {
      stack,
      level,
      package: packageName,
      message,
    };

    // Make the POST request to the Log API
    await axios.post(LOG_API_URL, logPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    // Log to console if the API call itself fails
    console.error('Failed to send log to API:', error);
  }
}

module.exports = {
  Log
};