// deezerService.js
import axios from 'axios';

export async function getDeezerPreviewUrl(trackName, artistName) {
  try {
    const response = await axios.get('https://api.deezer.com/search', {
      params: {
        q: `track:"${trackName}" artist:"${artistName}"`,
      },
    });

    const track = response.data.data[0];
    if (track && track.preview) {
      return track.preview;
    } else {
      throw new Error('Track preview not found.');
    }
  } catch (error) {
    console.error('Error fetching Deezer preview URL:', error);
    throw error;
  }
}
