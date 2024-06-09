import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, TouchableWithoutFeedback, Keyboard, ActivityIndicator, FlatList } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { MaterialIcons } from '@expo/vector-icons';
import { ref, set, onValue, off, query, orderByChild, push, equalTo, get, update, runTransaction } from "firebase/database";
import { database, storage } from '../../firebaseConfig';
import { useFonts } from 'expo-font';
import profilePic from '../../assets/images/lebron_profile_pic.webp';
import AddPost from './AddPost';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage
import axios from 'axios';
import qs from 'qs';
import { Buffer } from 'buffer';
import { useIsFocused } from '@react-navigation/native';

export const search = async (spotifyAccessToken, newItemCategoryType, setSearchResults, text) => {
  if (newItemCategoryType === 'Movies' || newItemCategoryType === 'Shows') {
    const API_KEY = '0259695ad57c17e0c504fae2bf270bc4';
    const BASE_URL = 'https://api.themoviedb.org/3';
    const imgBaseURL = "https://image.tmdb.org/t/p/";
    const imgSize = "original";

    const type = newItemCategoryType === 'Movies' ? 'movie' : 'tv';
  
    axios.get(`${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(text)}`)
      .then(response => {
        console.log(response.data.results);
        setSearchResults(response.data.results.slice(0, 4).map(movie => ({
          content: newItemCategoryType === 'Movies' ? movie.title : movie.name,
          description: newItemCategoryType === 'Movies' ? movie.release_date : movie.first_air_date,
          id: newItemCategoryType + movie.id,
          content_description: newItemCategoryType === 'Movies' ? movie.title : movie.name + newItemCategoryType === 'Movies' ? movie.release_date : movie.first_air_date,
          info: movie,
          image: `${imgBaseURL}${imgSize}${movie.poster_path}`,
        })));
      })
      .catch(error => {
        console.error('Error:', error);
      });
  } else if (text && (newItemCategoryType === 'Songs' || newItemCategoryType === 'Albums' || newItemCategoryType === 'Artists')) { //text is used in the if statements to check if the value is not null
    const token = spotifyAccessToken; // Your Spotify API token
    const url = 'https://api.spotify.com/v1/search';
    const query = encodeURIComponent(text);
    const type = newItemCategoryType === 'Songs' ? 'track' :
             newItemCategoryType === 'Albums' ? 'album' : 'artist';

    axios.get(`${url}?q=${query}&type=${type}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (newItemCategoryType === 'Albums') {
        setSearchResults(response.data.albums.items.map(album => ({
          content: album.name,
          description: album.artists.map(artist => artist.name).join(', '),
          id: newItemCategoryType + album.id,
          content_description: album.name + album.artists.map(artist => artist.name).join(', '),
          image: album.images.length > 0 ? album.images[0].url : undefined,
        })));
      } else if (newItemCategoryType === 'Songs') { 
        console.log(response.data.tracks.items);
        setSearchResults(response.data.tracks.items.map(track => ({
          content: track.name,
          description: track.artists.map(artist => artist.name).join(', '),
          id: newItemCategoryType + track.id,
          content_description: track.name + track.artists.map(artist => artist.name).join(', '),
          image: track.album.images.length > 0 ? track.album.images[0].url : undefined,
          uri: track.uri
        })));
      } else if (newItemCategoryType === 'Artists') { 
        setSearchResults(response.data.artists.items.map(artist => ({
          content: artist.name,
          description: artist.genres.join(', '), // Assuming you might want to show artist genres as a description
          content_description: artist.name + artist.genres.join(', '),
          id: newItemCategoryType + artist.id,
          image: artist.images.length > 0 ? artist.images[0].url : undefined,
        })));
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
  } else if (text && newItemCategoryType === 'Locations') {
    const API_KEY = 'AIzaSyDln_j0XWKTwl9tJHdrh-R9ELSoge7mCW0';
    const searchText = encodeURIComponent(text);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchText}&key=${API_KEY}`;

    axios.get(url)
      .then(response => {
        console.log(response.data.results[0]);
        const places = response.data.results.map(place => ({
          content: place.name,
          description: place.formatted_address,
          content_description: place.name + place.formatted_address,
          id: place.place_id,
          image: place.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${API_KEY}` : undefined,
        }));
        setSearchResults(places.slice(0, 4));
      })
      .catch(error => {
        console.error('Error:', error);
      });
  } else {
    // const API_KEY = '43545255-2ce8252df331f629bb4ae8719';
    // const URL = `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(text)}&image_type=photo`;
    
    // axios.get(URL).then((res) => {
    // if (res.data.hits){
    //   setSearchResults(res.data.hits.map(item => ({
    //     content: item.user,
    //     description: item.tags,
    //     image: item.previewURL,
    //   })));
    // }
    //  }).catch(error => {
    //   console.error('Error: ', error);
    // }); 
  }
}