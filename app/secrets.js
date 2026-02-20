// DO NOT COMMIT ACTUAL VALUES
// Copy this file to secrets.local.js with real values and import from there instead
// Or use environment variables in production

export const spotifyConfig = {
  clientId: '3895cb48f70545b898a65747b63b430d',
  clientSecret: '', // TODO: Fill in via environment variable or secrets.local.js
  redirectUrl: 'exp://localhost:8081',
};

export const googleVisionApiKey = ''; // TODO: Fill in via environment variable or secrets.local.js

// Default exports to prevent import errors - replace with real values
export default {
  spotifyConfig,
  googleVisionApiKey,
};
