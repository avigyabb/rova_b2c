import qs from 'qs';
import { Buffer } from 'buffer';
import axios from 'axios';

export const presetTypesList = [
  'Movies', 'Albums', 'Locations', 'Songs', 'Artists', 'Shows'
]

export const emailSchoolMap = {
  'student.ghctk12.com': {
    name: 'Granada Hills Charter School',
    schools: [
      {name: 'Grades TK-8', image: '', id: 1},
      {name: 'Grades 9-12', image: '', id: 2},
    ]
  },
  'esusdstudents.org': {},
  'stanford.edu': {
    name: 'Stanford University',
    schools: [
      {name: 'Stanford University', image: '', id: 3},
    ]
  },
  'usc.edu': {},
}

export const schoolIdMap = {
  1: {name: 'Grades TK-8', district: 'Granada Hills Charter School' },
  2: {name: 'Granada Hills Charter School', district: 'Grades 9-12' },
  3: {name: 'Stanford University', district: '' },
}

export const largerCategories = {
  'places': 'Locations',
  'General Locations': 'Locations',
  'Destinations': 'Locations',
  'Places': 'Locations',
  'Urbex spots': 'Locations',
  'Best Countries': 'Locations',
  'Cities': 'Locations',
  'artists': 'Artists',
  'GHC Freaks': 'People',
  'unc wylin': 'People',
  'HopSkipDriver Uncs': 'People',
  'Boxers': 'People',
  'The Bhaddest': 'People',
  'Best Africans': 'People',
  'Best Armenian Thugs': 'People',
  'People/characters': 'People',
  'IB Warriors': 'People',
  'Street Taco Rankings': 'Restaurants',
  'Food Spots': 'Restaurants',
  'Homecooked Meals': 'Food',
  'Bevs': 'Food',
  'Meals': 'Food',
  'Chocolate': 'Food',
  'fit checks': 'Fashion',
  // 'Hewwo': 'Random',
  // 'hi jason': 'Random',
  // 'Random stuff': 'Random',
  // 'New Test': 'Random',
  // 'New1': 'Random',
  // 'When the': 'Random',
  // 'Doering T'
  'On Repeat': 'Songs',
  'sneakers/shoes': 'Shoes',
  'running shoes': 'Shoes',
}

// export const getSpotifyAccessToken = async (setSpotifyAccessToken) => {
//   const client_id = '3895cb48f70545b898a65747b63b430d';
//   const client_secret = '8d70ee092b614f58b488ce149e827ab1';
//   const url = 'https://accounts.spotify.com/api/token';
//   const headers = {
//     'Content-Type': 'application/x-www-form-urlencoded',
//     'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
//   };
//   const data = qs.stringify({'grant_type': 'client_credentials'});

//   try {
//     const response = await axios.post(url, data, {headers});
//     setSpotifyAccessToken(response.data.access_token);
//   } catch (error) {
//     console.error('Error obtaining token:', error);
//   }
// }

export const spotifyAuthConfig = {
  clientId: '3895cb48f70545b898a65747b63b430d',
  clientSecret: '8d70ee092b614f58b488ce149e827ab1', // Be cautious with your client secret
  redirectUrl: 'YOUR_REDIRECT_URI', // This must match the configuration in your Spotify dashboard
  scopes: ['user-modify-playback-state', 'user-read-playback-state'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
  }
};