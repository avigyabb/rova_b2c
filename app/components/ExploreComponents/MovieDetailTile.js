import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { database } from '../../../firebaseConfig';
import { ref, get, query, orderByChild, equalTo } from "firebase/database";
import { getScoreColorHSL } from '../../consts';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dark mode theme colors
const darkTheme = {
  background: '#121212',
  surface: '#121212',
  textPrimary: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textTertiary: '#999999',
  border: '#333333',
  borderLight: '#1e1e1e',
  accent: '#00aced',
  cardBackground: '#121212',
  tabBarBackground: '#121212',
  tabBarBorder: '#333333',
  tabBarActive: '#FFFFFF',
  tabBarInactive: '#999999',
  buttonPrimary: '#FFFFFF',
  buttonPrimaryText: '#121212',
  buttonSecondary: '#333333',
  buttonSecondaryText: '#FFFFFF',
  inputBackground: '#333333',
  inputBorder: '#444444',
  placeholder: '#999999',
  profileCardBackground: '#121212',
  profileBorder: '#333333',
  feedItemBackground: '#121212',
  feedItemBorder: '#1e1e1e',
  exploreCardBackground: '#121212',
  exploreCardBorder: '#333333',
  moviePosterBorder: '#333333',
  ratingCircleBorder: '#333333',
  shadow: '#121212',
  overlay: 'rgba(18, 18, 18, 0.7)',
};

const MovieDetailTile = ({ movie, onBackPress, navigation, isDarkMode=false, darkTheme=null }) => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageScore, setAverageScore] = useState(0);
  const [userKey, setUserKey] = useState(null);

  useEffect(() => {
    getUserKey();
  }, []);

  const getUserKey = async () => {
    try {
      const key = await AsyncStorage.getItem('userKey');
      setUserKey(key);
    } catch (error) {
      console.error('Error getting user key:', error);
    }
  };

  const onAddRatingPress = () => {
    if (!userKey) {
      console.error('User key not available');
      return;
    }
    
    navigation.navigate('Add', {
      itemName: movie.name,
      itemDescription: movie.name, // Using movie name as description since we don't have a separate description
      itemImage: [movie.image],
      itemCategory: null,
      itemCategoryName: '',
      taggedUser: null, // No tagged user since this is from the movie detail view
      taggedUserId: null,
      itemId: movie.name // Using movie name as ID
    });
  };

  useEffect(() => {
    fetchMovieRatings();
  }, [movie]);

  const fetchMovieRatings = async () => {
    try {
      setLoading(true);
      const itemsRef = ref(database, 'items');
      const snapshot = await get(itemsRef);
      
      if (snapshot.exists()) {
        const movieRatings = [];
        snapshot.forEach((childSnapshot) => {
          const item = childSnapshot.val();
          if (item.content === movie.name && item.image === movie.image) {
            movieRatings.push({
              key: childSnapshot.key,
              ...item
            });
          }
        });
        
        // Sort by timestamp (most recent first)
        movieRatings.sort((a, b) => b.timestamp - a.timestamp);
        setRatings(movieRatings);
        
        // Calculate average score
        if (movieRatings.length > 0) {
          const totalScore = movieRatings.reduce((sum, rating) => sum + rating.score, 0);
          setAverageScore(totalScore / movieRatings.length);
        }
      }
    } catch (error) {
      console.error('Error fetching movie ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProfile = async (userID) => {
    try {
      const userRef = ref(database, 'users/' + userID);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  };

  const [userDataMap, setUserDataMap] = useState({});

  useEffect(() => {
    // Fetch user data for all ratings
    const fetchUserData = async () => {
      const userDataPromises = ratings.map(async (rating) => {
        const userData = await getProfile(rating.user_id);
        return { userId: rating.user_id, userData };
      });
      
      const userDataResults = await Promise.all(userDataPromises);
      const userDataObject = {};
      userDataResults.forEach(({ userId, userData }) => {
        userDataObject[userId] = userData;
      });
      setUserDataMap(userDataObject);
    };

    if (ratings.length > 0) {
      fetchUserData();
    }
  }, [ratings]);

  const renderRatingItem = ({ item }) => {
    const userData = userDataMap[item.user_id];
    const scoreColor = getScoreColorHSL(item.score);

    return (
      <View style={[
        styles.ratingItem,
        { borderBottomColor: isDarkMode ? darkTheme?.border : '#f0f0f0' }
      ]}>
        <View style={styles.userInfo}>
          <Image
            source={userData?.profile_pic ? { uri: userData.profile_pic } : require('../../../assets/images/emptyProfilePic3.png')}
            style={styles.profilePic}
          />
          <View style={styles.userDetails}>
            <Text style={[
              styles.username,
              { color: isDarkMode ? darkTheme?.textPrimary : 'black' }
            ]}>{userData?.username || 'Unknown'}</Text>
            <Text style={[
              styles.timestamp,
              { color: isDarkMode ? darkTheme?.textSecondary : 'grey' }
            ]}>
              {new Date(item.timestamp).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={[
          styles.scoreCircle, 
          { 
            borderColor: scoreColor,
            backgroundColor: isDarkMode ? darkTheme?.background : 'white'
          }
        ]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {item.score.toFixed(1)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[
        styles.loadingContainer,
        { backgroundColor: isDarkMode ? darkTheme?.background : 'white' }
      ]}>
        <ActivityIndicator size="large" color={isDarkMode ? darkTheme?.textPrimary : "black"} />
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDarkMode ? darkTheme?.background : 'white' }
    ]}>
      {/* Header */}
      <View style={[
        styles.header,
        { 
          borderBottomColor: isDarkMode ? darkTheme?.border : 'lightgrey',
          backgroundColor: isDarkMode ? darkTheme?.background : 'white'
        }
      ]}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
        </TouchableOpacity>
        <Text style={[
          styles.headerTitle,
          { color: isDarkMode ? darkTheme?.textPrimary : 'black' }
        ]}>Movie Details</Text>
      </View>

      {/* Movie Info */}
      <View style={[
        styles.movieInfo,
        { borderBottomColor: isDarkMode ? darkTheme?.border : 'lightgrey' }
      ]}>
        <Image
          source={{ uri: movie.image }}
          style={[
            styles.moviePoster,
            { borderColor: isDarkMode ? darkTheme?.border : 'transparent' }
          ]}
        />
        <View style={styles.movieDetails}>
          <Text style={[
            styles.movieTitle,
            { color: isDarkMode ? darkTheme?.textPrimary : 'black' }
          ]}>{movie.name}</Text>
          <Text style={[
            styles.movieStats,
            { color: isDarkMode ? darkTheme?.textSecondary : 'grey' }
          ]}>
            {ratings.length} ratings • Overall: {movie.weightedRating ? movie.weightedRating.toFixed(1) : averageScore.toFixed(1)}
          </Text>
          <TouchableOpacity style={[
            styles.addButton,
            { backgroundColor: isDarkMode ? darkTheme?.textPrimary : 'black' }
          ]} onPress={onAddRatingPress}>
            <Ionicons name="add-circle" size={20} color={isDarkMode ? darkTheme?.background : "white"} />
            <Text style={[
              styles.addButtonText,
              { color: isDarkMode ? darkTheme?.background : 'white' }
            ]}>Add Rating</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ratings Section */}
      <View style={styles.ratingsSection}>
        <Text style={[
          styles.ratingsTitle,
          { color: isDarkMode ? darkTheme?.textPrimary : 'black' }
        ]}>Past Ratings</Text>
        <FlatList
          data={ratings}
          renderItem={renderRatingItem}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          style={styles.ratingsList}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'lightgrey',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  movieInfo: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'lightgrey',
  },
  moviePoster: {
    width: 120,
    height: 180,
    borderRadius: 10,
    marginRight: 15,
  },
  movieDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  movieTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 10,
  },
  movieStats: {
    fontSize: 16,
    color: 'grey',
  },
  ratingsSection: {
    flex: 1,
    padding: 20,
  },
  ratingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 15,
  },
  ratingsList: {
    flex: 1,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
  },
  timestamp: {
    fontSize: 14,
    color: 'grey',
    marginTop: 2,
  },
  scoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginTop: 15,
    width: 120,
    backgroundColor: 'black',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
});

export default MovieDetailTile; 