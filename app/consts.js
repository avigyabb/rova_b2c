import qs from 'qs';
import { Buffer } from 'buffer';
import axios from 'axios';

// &&&
export const presetTypesList = [
  'Movies', 'Albums', 'Locations', 'Songs', 'Artists', 'Shows'
]

export const emailSchoolMap = {
  'student.ghctk12.com': {
    schools: [
      {name: 'Granada Hills Charter School TK-8', image: 'https://image.maxpreps.io/school-mascot/1/f/d/1fd5ff77-0482-4f19-a9c2-e03a6ef04ce8.gif?version=636230341800000000&width=1024&height=1024', id: 1},
      {name: 'Granada Hills Charter School 9-12', image: 'https://image.maxpreps.io/school-mascot/1/f/d/1fd5ff77-0482-4f19-a9c2-e03a6ef04ce8.gif?version=636230341800000000&width=1024&height=1024', id: 2},
    ]
  },
  'stanford.edu': {
    schools: [
      {name: 'Stanford University', image: 'https://identity.stanford.edu/wp-content/uploads/sites/3/2020/07/block-s-right.png', id: 3},
    ]
  },
  'usc.edu': {
    schools: [
      {name: 'University of Southern California', image: 'https://1000logos.net/wp-content/uploads/2022/02/Southern-California-Trojans-logo.png', id: 4},
    ]
  },
  'esusdstudents.org': {
    schools: [
      {name: 'El Segundo High School', image: 'https://assets.scorebooklive.com/uploads/production/school/10825/image/El_Segundo__CA__Eagles_Logo.png', id: 5},
    ]
  },
  'columbia.edu': {
    schools: [
      {name: 'Columbia University', image: 'https://m.media-amazon.com/images/I/61Fa-pNEFXL.jpg', id: 6},
    ]
  },
  'ucsd.edu': {
    schools: [
      {name: 'University of California San Diego', image: '', id: 7},
    ]
  },
  'my.hartdistrict.org': {
    schools: [
      {name: 'Valencia High School', image: 'https://signalscv.s3.us-west-1.amazonaws.com/wp-content/uploads/2016/10/13162335/Valencia-e1478908464131.jpg', id: 8},
    ]
  }
}

export const schoolIdMap = {
  1: {name: 'GHCHS TK-8', image: 'https://image.maxpreps.io/school-mascot/1/f/d/1fd5ff77-0482-4f19-a9c2-e03a6ef04ce8.gif?version=636230341800000000&width=1024&height=1024' },
  2: {name: 'GHCHS 9-12', image: 'https://image.maxpreps.io/school-mascot/1/f/d/1fd5ff77-0482-4f19-a9c2-e03a6ef04ce8.gif?version=636230341800000000&width=1024&height=1024' },
  3: {name: 'Stanford University', image: 'https://identity.stanford.edu/wp-content/uploads/sites/3/2020/07/block-s-right.png' },
  4: {name: 'University of Southern California', image: 'https://1000logos.net/wp-content/uploads/2022/02/Southern-California-Trojans-logo.png' },
  5: {name: 'El Segundo High School', image: 'https://assets.scorebooklive.com/uploads/production/school/10825/image/El_Segundo__CA__Eagles_Logo.png' },
  6: {name: 'Columbia University', image: 'https://m.media-amazon.com/images/I/61Fa-pNEFXL.jpg' },
  7: {name: 'University of California San Diego', image: '' },
  8: {name: 'Valencia High School', image: 'https://signalscv.s3.us-west-1.amazonaws.com/wp-content/uploads/2016/10/13162335/Valencia-e1478908464131.jpg' },
}

export const notIncludedCategories = [
  'Test',
  'Test3',
  'When the',
  'New2',
  'New test',
  'Random stuff',
  'Shows Test',
  'The',
  'New Test',
  'Random items',
]

export const largerCategories = {
  'anime': 'Anime',
  'Shows/Anime': 'Anime',

  'artists': 'Artists',

  'carry brawlers': 'Brawl Stars',
  'Top 10 Brawlers': 'Brawl Stars',
  'My favorite Brawlers': 'Brawl Stars',

  'Bevs': 'Food',
  'Meals': 'Food',
  'Chocolate': 'Food',
  'Homecooked Meals': 'Food',
  'starbucks orders': 'Food',

  'fit checks': 'Fashion',
  'Jeans/tops': 'Fashion',

  'places': 'Locations',
  'General Locations': 'Locations',
  'Destinations': 'Locations',
  'Places': 'Locations',
  'Best Countries': 'Locations',
  'Cities': 'Locations',
  'Places i\'ve been too/restaurants': 'Locations',
  'Cities/Locations': 'Locations',
  'Regions': 'Locations',

  'GHC Freaks': 'People',
  'unc wylin': 'People',
  'HopSkipDriver Uncs': 'People',
  'Boxers': 'People',
  'The Bhaddest': 'People',
  'Best Africans': 'People',
  'Best Armenian Thugs': 'People',
  'People/characters': 'People',
  'IB Warriors': 'People',
  'Top Melkonian Marauders': 'People',
  'GHC Big Backs': 'People',
  'Ghc Teachers': 'People',
  'People who need to go to sleep': 'People',
  'El segundo freaks': 'People',
  'Freaky ah': 'People',
  'Dylans': 'People',
  'hi jason': 'People',
  'Yahdel': 'People',

  'best starter(all gens)': 'Pokemon',
  'pokemon regions': 'Pokemon',

  'Street Taco Rankings': 'Restaurants',
  'Food Spots': 'Restaurants',
  'Restaurants/Food': 'Restaurants',
  'Fast Food': 'Restaurants',
  'Street Food': 'Restaurants',
  'Eats': 'Restaurants',
  'Street Tacos': 'Restaurants',

  'On Repeat': 'Songs',
  'top 5 songs of all time': 'Songs',

  'sneakers/shoes': 'Shoes',
  'running shoes': 'Shoes',

  'shows/movies': 'Shows',
  'shows': 'Shows',
  'TV Shows': 'Shows',

  'Valorant Maps': 'Valorant',
  'Val Maps': 'Valorant',

  'Urbex spots': 'Urbex',
  'Urbex destinations': 'Urbex',
}

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

export const signInCategories = [
  {
    category_name: 'Movies',
    imageUri: 'https://m.media-amazon.com/images/I/61zqYFf0GAL._AC_UF894,1000_QL80_.jpg',
    category_type: 'Movies',
  },
  {
    category_name: 'Albums',
    imageUri: 'https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg',
    category_type: 'Albums',
  },
  {
    category_name: 'Artists',
    imageUri: 'https://hls.harvard.edu/wp-content/uploads/2024/04/Taylor-Swift-concert-yellow-dress-GettyImages-2015112497-2400x1600-1-1500x1000.jpg',
    category_type: 'Artists',
  },
  {
    category_name: 'Songs',
    imageUri: 'https://i.scdn.co/image/ab67616d00001e021ea0c62b2339cbf493a999ad',
    category_type: 'Songs',
  },
  {
    category_name: 'Restaurants',
    imageUri: 'https://www.eatthis.com/wp-content/uploads/sites/4/2021/11/in-n-out-exterior.jpg?quality=82&strip=1',
    category_type: 'Locations',
  },
  {
    category_name: 'Locations',
    imageUri: 'https://a.cdn-hotels.com/gdcs/production121/d270/d3762c30-d506-4181-9586-a5d36d3f152e.jpg',
    category_type: 'Locations',
  },
  {
    category_name: 'Shows',
    imageUri: 'https://cloudfront-us-east-1.images.arcpublishing.com/baltimorebanner/2O4JCR6X2NADXDRO6KTFDFKR7A.jpg',
    category_type: 'Shows',
  },
  {
    category_name: 'Anime',
    imageUri: 'https://static.wikia.nocookie.net/naruto/images/d/d6/Naruto_Part_I.png/revision/latest/scale-to-width-down/1200?cb=20210223094656',
    category_type: 'Shows',
  },
  {
    category_name: 'Other...',
  }
]