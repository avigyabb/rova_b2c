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
  if (newItemCategoryType === 'Movies') {
    const API_KEY = '0259695ad57c17e0c504fae2bf270bc4';
    const BASE_URL = 'https://api.themoviedb.org/3';
    const imgBaseURL = "https://image.tmdb.org/t/p/";
    const imgSize = "original";
  
    axios.get(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(text)}`)
      .then(response => {
        setSearchResults(response.data.results.slice(0, 10).map(movie => ({
          content: movie.title,
          description: movie.release_date,
          image: `${imgBaseURL}${imgSize}${movie.poster_path}`,
        })));
      })
      .catch(error => {
        console.error('Error:', error);
      });
  } else if (text && (newItemCategoryType === 'Songs' || newItemCategoryType === 'Albums')) {
    const token = spotifyAccessToken; // Your Spotify API token
    const url = 'https://api.spotify.com/v1/search';
    const query = encodeURIComponent(text);
    const type = newItemCategoryType === 'Songs' ? 'track' : 'album';

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
          image: album.images.length > 0 ? album.images[0].url : undefined,
        })));
      } else if (newItemCategoryType === 'Songs') { 
        setSearchResults(response.data.tracks.items.map(track => ({
          content: track.name,
          description: track.artists.map(artist => artist.name).join(', '),
          image: track.album.images.length > 0 ? track.album.images[0].url : undefined,
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
        const places = response.data.results.map(place => ({
          content: place.name,
          description: place.formatted_address,
          image: place.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${API_KEY}` : undefined,
        }));
        setSearchResults(places.slice(0, 10));
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }
}