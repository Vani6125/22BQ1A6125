// my-backend-app/server.js
const express = require('express');
const { Log } = require('logging-middleware');

const app = express();
app.use(express.json());

// In-memory data store for shortened URLs
const urlDatabase = {};

// Function to generate a simple, random shortcode
const generateShortcode = () => {
  return Math.random().toString(36).substring(2, 8);
};

// Middleware to log every incoming request
app.use((req, res, next) => {
  // Log the incoming request with 'middleware' as the package
  Log('backend', 'info', 'middleware', `Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

// Endpoint to create a new shortened URL
app.post('/shorturls', (req, res) => {
  try {
    const { url, validity, shortcode } = req.body;

    // 1. Basic validation for the URL
    if (!url) {
      Log('backend', 'error', 'controller', 'Validation failed: URL is required.');
      return res.status(400).json({ message: 'URL is required.' });
    }

    // 2. Handle custom shortcode
    let finalShortcode = shortcode;
    if (finalShortcode) {
      // Check for shortcode uniqueness
      if (urlDatabase[finalShortcode]) {
        Log('backend', 'error', 'controller', `Shortcode collision detected: ${finalShortcode}`);
        return res.status(409).json({ message: `Shortcode '${finalShortcode}' already exists.` });
      }
    } else {
      // Generate a new unique shortcode
      finalShortcode = generateShortcode();
      while (urlDatabase[finalShortcode]) {
        finalShortcode = generateShortcode();
      }
    }

    // 3. Calculate expiry date
    const validityMinutes = validity || 30; // Default validity is 30 minutes
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + validityMinutes);

    // 4. Store the data in the in-memory database
    const shortlink = `http://localhost:3000/shorturls/${finalShortcode}`;
    urlDatabase[finalShortcode] = {
      originalUrl: url,
      shortlink,
      expiry: expiryDate.toISOString(),
      creationDate: new Date().toISOString()
    };

    // Log the successful creation
    Log('backend', 'info', 'controller', `Short URL created: ${shortlink}`);

    // 5. Send the success response
    res.status(201).json({
      shortlink,
      expiry: expiryDate.toISOString()
    });

  } catch (error) {
    // Log any unexpected errors
    Log('backend', 'fatal', 'handler', `An unhandled error occurred: ${error.message}`);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Endpoint to handle redirection and retrieve statistics
app.get('/shorturls/:shortcode', (req, res) => {
  try {
    const { shortcode } = req.params;
    const urlEntry = urlDatabase[shortcode];

    // Check if shortcode exists
    if (!urlEntry) {
      Log('backend', 'error', 'controller', `Shortcode not found: ${shortcode}`);
      return res.status(404).json({ message: 'Shortcode not found.' });
    }

    // Check if the short link has expired
    if (new Date() > new Date(urlEntry.expiry)) {
      Log('backend', 'warn', 'controller', `Expired shortcode accessed: ${shortcode}`);
      return res.status(410).json({ message: 'Short link has expired.' });
    }

    // Redirect the user to the original URL
    Log('backend', 'info', 'controller', `Redirecting shortcode ${shortcode} to ${urlEntry.originalUrl}`);
    res.redirect(301, urlEntry.originalUrl);

  } catch (error) {
    Log('backend', 'fatal', 'handler', `An unhandled error occurred: ${error.message}`);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // Log the server start with 'server' as the package
  Log('backend', 'info', 'server', `Server is running on port ${PORT}`);
});