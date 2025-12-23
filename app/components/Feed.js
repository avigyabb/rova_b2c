import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Text, View, FlatList, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, TextInput, TouchableWithoutFeedback, Keyboard, Animated } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get, update, set, push } from "firebase/database";
import { Image } from 'expo-image';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Hyperlink from 'react-native-hyperlink';
import { useFonts } from 'expo-font';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Profile from './Profile';
// import FeedItemTile from './FeedItemTile';
import NormalItemTile from './NormalItemTile';
import { getSpotifyAccessToken } from '../consts';
import axios from 'axios';
import qs from 'qs';
import { Buffer } from 'buffer';
import * as AuthSession from 'expo-auth-session';
import moment from 'moment';

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

const styles = StyleSheet.create({
  timesText: {
    color: 'black',
    fontWeight: 'bold',
  },
  timesButton: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'lightgrey',
    width: 85,
    borderRadius: 5,
  }
});

const useSpotifyAuth = (clientId, redirectUri) => {
  return AuthSession.useAuthRequest({
    redirectUri,
    clientId,
    scopes: ['user-modify-playback-state', 'user-read-playback-state'],
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
    extraParams: {
      show_dialog: 'true',
    },
  }, {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
  });
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

// Score color function
function getScoreColorHSL(score) {
  if (score < 0) {
    return '#A3A3A3'; // Gray color for negative scores
  }
  const cappedScore = Math.max(0, Math.min(score, 10));
  const hue = (cappedScore / 10) * 120;
  const lightness = 50 - score ** 1.3;
  return `hsl(${hue}, 100%, ${lightness}%)`;
}

const Feed = ({ route, navigation, isDarkMode=false, darkTheme=null }) => {

  const [profileInfo, setProfileInfo] = useState({});
  const [listData, setListData] = useState([]);
  const [feedView, setFeedView] = useState(null);
  const [refreshed, setRefreshed] = useState(false);
  const [numFeedItems, setNumFeedItems] = useState(50);
  const { userKey } = route.params;
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
    'Unbounded': require('../../assets/fonts/Unbounded/Unbounded-VariableFont_wght.ttf'),
  });
  const [feedType, setFeedType] = useState('For You');
  const [topPostsTime, setTopPostsTime] = useState('All Time');
  const [itemInfo, setItemInfo] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState(null);
  const [request, response, promptAsync] = useSpotifyAuth('3895cb48f70545b898a65747b63b430d', 'exp://10.0.0.187:8081'); // how do I do this on my actual app
  const [individualSpotifyAccessToken, setIndividualSpotifyAccessToken] = useState(null);
  const [numFollowers, setNumFollowers] = useState(1);
  const [index, setIndex] = useState(0);
  const [focusedItem, setFocusedItem] = useState(null);
  const [focusedItemDescription, setFocusedItemDescription] = useState(null);
  const [profileView, setProfileView] = useState(null);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  const flatListRef = React.useRef(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [currentScrollPosition, setCurrentScrollPosition] = useState(0);
  
  // Animation states
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Past Rankings states
  const [pastRankingsInfo, setPastRankingsInfo] = useState(null);
  const [pastRankingsSlideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [pastRankingsOverlayOpacity] = useState(new Animated.Value(0));

  // Past Rankings Animation Functions
  const showPastRankingsOverlay = (item, profileList, compareUserRating) => {
    setPastRankingsInfo({ item, profileList, compareUserRating });
    Animated.parallel([
      Animated.timing(pastRankingsSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pastRankingsOverlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hidePastRankingsOverlay = () => {
    Animated.parallel([
      Animated.timing(pastRankingsSlideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pastRankingsOverlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPastRankingsInfo(null);
    });
  };

  // Restore scroll position when returning from comments
  useEffect(() => {
    if (itemInfo === null && savedScrollPosition > 0) {
      // Use requestAnimationFrame to ensure the FlatList is ready
      requestAnimationFrame(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({ offset: savedScrollPosition, animated: false });
        }
      });
      // Reset saved position after restoration
      setSavedScrollPosition(0);
    }
  }, [itemInfo]);

  // Fetch comments for a specific post
  const fetchComments = async (postId) => {
    if (!postId) return;
    
    let allComments = [];
    
    // Check new comments location
    const newCommentsRef = ref(database, `comments/${postId}`);
    const newSnapshot = await get(newCommentsRef);
    
    if (newSnapshot.exists()) {
      const newCommentsData = Object.entries(newSnapshot.val()).map(([key, value]) => ({
        id: key,
        ...value
      }));
      allComments = [...allComments, ...newCommentsData];
    }
    
    // Check old comments location
    const oldCommentsRef = ref(database, `items/${postId}/comments`);
    const oldSnapshot = await get(oldCommentsRef);
    
    if (oldSnapshot.exists()) {
      const oldCommentsData = Object.entries(oldSnapshot.val()).map(([key, value]) => ({
        id: key,
        ...value
      }));
      allComments = [...allComments, ...oldCommentsData];
    }
    
    if (allComments.length > 0) {
      // Fetch profile pictures for each commenter
      const commentsWithProfiles = await Promise.all(
        allComments.map(async (comment) => {
          try {
            // Handle both old and new comment formats
            const userId = comment.user_id || comment.userId;
            const commentText = comment.text || comment.comment;
            
            const userRef = ref(database, `users/${userId}`);
            const userSnapshot = await get(userRef);
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              return {
                ...comment,
                user_id: userId, // Normalize to new format
                text: commentText, // Normalize to new format
                profile_pic: userData.profile_pic || null,
                name: userData.name || comment.name,
                username: userData.username || comment.username
              };
            }
            return {
              ...comment,
              user_id: userId,
              text: commentText
            };
          } catch (error) {
            console.error('Error fetching user profile:', error);
            return comment;
          }
        })
      );
      
      console.log('Fetched comments:', commentsWithProfiles);
      setComments(commentsWithProfiles.sort((a, b) => a.timestamp - b.timestamp));
    } else {
      console.log('No comments found for post:', postId);
      setComments([]);
    }
  };

  // Post a new comment
  const postComment = async () => {
    if (!commentText.trim() || !itemInfo?.key) return;
    
    setCommentLoading(true);
    try {
      const commentsRef = ref(database, `comments/${itemInfo.key}`);
      const newCommentRef = push(commentsRef);
      
      const commentData = {
        text: commentText.trim(),
        user_id: userKey,
        username: profileInfo?.username || 'Anonymous',
        name: profileInfo?.name || 'Anonymous',
        timestamp: Date.now()
      };
      
      await set(newCommentRef, commentData);
      setCommentText('');
      
      // Dismiss keyboard
      Keyboard.dismiss();
      
      // Refresh comments
      await fetchComments(itemInfo.key);
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  // Fetch comments when itemInfo changes
  useEffect(() => {
    if (itemInfo?.key) {
      fetchComments(itemInfo.key);
      // Animate comments overlay in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setComments([]);
      setCommentText('');
      // Animate comments overlay out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [itemInfo]);

  const getListData = async () => {
    setRefreshed(true);
    
    try {
      // Make parallel calls instead of sequential
      const [constsSnapshot, itemsSnapshot, userSnapshot] = await Promise.all([
        get(ref(database, 'consts')),
        get(ref(database, 'items')),
        get(ref(database, 'users/' + userKey))
      ]);
      
      // Process items immediately
      if (itemsSnapshot.exists()) {
        const tempListData = Object.entries(itemsSnapshot.val())
          .filter(([key, value]) => {
            if (constsSnapshot.exists() && constsSnapshot.val().feedType === 'customDescription') {
              return value?.custom ?? true;
            }
            return true;
          })
          .map(([key, value]) => ({ key, ...value }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 30);
        
        setListData(tempListData);
      }
      
      // Set user profile
      if (userSnapshot.exists()) {
        setProfileInfo(userSnapshot.val());
      }
      
      setRefreshed(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setRefreshed(false);
    }
  }

  const getFollowingListData = async () => {
    setRefreshed(true);
    
    try {
      // Make parallel calls
      const [followingSnapshot, itemsSnapshot, userSnapshot] = await Promise.all([
        get(ref(database, 'users/' + userKey + '/following')),
        get(ref(database, 'items')),
        get(ref(database, 'users/' + userKey))
      ]);
      
      if (followingSnapshot.exists()) {
        const followingList = Object.keys(followingSnapshot.val());
        
        if (itemsSnapshot.exists()) {
          const tempListData = Object.entries(itemsSnapshot.val())
            .map(([key, value]) => ({ key, ...value }))
            .filter(item => followingList.includes(item.user_id))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 30);
          
          setListData(tempListData);
        }
      } else {
        setNumFollowers(0);
      }
      
      // Set user profile
      if (userSnapshot.exists()) {
        setProfileInfo(userSnapshot.val());
      }
      
      setRefreshed(false);
    } catch (error) {
      console.error("Error fetching following data:", error);
      setRefreshed(false);
    }
  }
  
  const getTopPostsListData = async () => {
    console.log('getTopPostsListData called');
    setRefreshed(true);
    const categoryItemsRef = ref(database, 'items');
    let tempListData = {};
    const oneHourAgo = Date.now() - 3600000;
    const oneDayAgo = Date.now() - 86400000;
    const oneWeekAgo = Date.now() - 604800000;

    try {
      console.log('Fetching items from database...');
      const snapshot = await get(categoryItemsRef);
      console.log('Snapshot exists:', snapshot.exists());
      if (snapshot.exists()) {
        // First, get all items and sort by likes/dislikes/stars (fast)
        const allItems = Object.entries(snapshot.val())
          .filter(([key, value]) => key !== 'undefined')
          .map(([key, value]) => ({ key, ...value }))
          .sort((a, b) => {
            const aLikes = a.likes ? Object.keys(a.likes).length : 0;
            const aDislikes = a.dislikes ? Object.keys(a.dislikes).length : 0;
            const aStars = a.stars ? Object.keys(a.stars).length : 0;
            const aTotal = aLikes + aDislikes + aStars;
            
            const bLikes = b.likes ? Object.keys(b.likes).length : 0;
            const bDislikes = b.dislikes ? Object.keys(b.dislikes).length : 0;
            const bStars = b.stars ? Object.keys(b.stars).length : 0;
            const bTotal = bLikes + bDislikes + bStars;
            
            return bTotal - aTotal; // Sort by interactions (highest first)
          });

        // Create initial data without comment counts (fast)
        const pastHourItems = allItems.filter(item => item.timestamp && item.timestamp > oneHourAgo);
        const pastDayItems = allItems.filter(item => item.timestamp && item.timestamp > oneDayAgo);
        const pastWeekItems = allItems.filter(item => item.timestamp && item.timestamp > oneWeekAgo);
        
        tempListData['Past Hour'] = pastHourItems.slice(0, 30);
        tempListData['Past Day'] = pastDayItems.slice(0, 30);
        tempListData['Past Week'] = pastWeekItems.slice(0, 30);
        tempListData['All Time'] = allItems.slice(0, 30);
        
        console.log('Time filtering results:', {
          totalItems: allItems.length,
          oneHourAgo: new Date(oneHourAgo).toISOString(),
          oneDayAgo: new Date(oneDayAgo).toISOString(),
          oneWeekAgo: new Date(oneWeekAgo).toISOString(),
          pastHourCount: pastHourItems.length,
          pastDayCount: pastDayItems.length,
          pastWeekCount: pastWeekItems.length,
          sampleTimestamps: allItems.slice(0, 3).map(item => ({
            key: item.key,
            timestamp: item.timestamp,
            date: new Date(item.timestamp).toISOString()
          }))
        });
        
        // Set data immediately (fast load)
        console.log('Setting initial Top Posts data:', tempListData);
        setListData(tempListData);
        setRefreshed(false);
        
        // Now fetch comment counts in background and update
        const topItems = allItems.slice(0, 100); // Only fetch for top 100 items
        const itemsWithComments = await Promise.all(
          topItems.map(async (item) => {
            try {
              const commentsRef = ref(database, `comments/${item.key}`);
              const commentsSnapshot = await get(commentsRef);
              const commentCount = commentsSnapshot.exists() ? Object.keys(commentsSnapshot.val()).length : 0;
              
              // Also check old comments location
              const oldCommentsRef = ref(database, `items/${item.key}/comments`);
              const oldCommentsSnapshot = await get(oldCommentsRef);
              const oldCommentCount = oldCommentsSnapshot.exists() ? Object.keys(oldCommentsSnapshot.val()).length : 0;
              
              return { ...item, commentCount: commentCount + oldCommentCount };
            } catch (error) {
              return { ...item, commentCount: 0 };
            }
          })
        );
        
        // Re-sort with comment counts
        const finalSorted = itemsWithComments.sort((a, b) => {
          const aLikes = a.likes ? Object.keys(a.likes).length : 0;
          const aDislikes = a.dislikes ? Object.keys(a.dislikes).length : 0;
          const aComments = a.commentCount || 0;
          const aStars = a.stars ? Object.keys(a.stars).length : 0;
          const aTotal = aLikes + aDislikes + aComments + aStars;
          
          const bLikes = b.likes ? Object.keys(b.likes).length : 0;
          const bDislikes = b.dislikes ? Object.keys(b.dislikes).length : 0;
          const bComments = b.commentCount || 0;
          const bStars = b.stars ? Object.keys(b.stars).length : 0;
          const bTotal = bLikes + bDislikes + bComments + bStars;
          
          return bTotal - aTotal;
        });

        // Update with final sorted data
        const finalPastHour = finalSorted.filter(item => item.timestamp && item.timestamp > oneHourAgo);
        const finalPastDay = finalSorted.filter(item => item.timestamp && item.timestamp > oneDayAgo);
        const finalPastWeek = finalSorted.filter(item => item.timestamp && item.timestamp > oneWeekAgo);
        
        const finalData = {
          'Past Hour': finalPastHour.length > 0 ? finalPastHour.slice(0, 30) : finalSorted.slice(0, 30),
          'Past Day': finalPastDay.length > 0 ? finalPastDay.slice(0, 30) : finalSorted.slice(0, 30),
          'Past Week': finalPastWeek.length > 0 ? finalPastWeek.slice(0, 30) : finalSorted.slice(0, 30),
          'All Time': finalSorted.slice(0, 30)
        };
        
        console.log('Final time filtering results:', {
          totalSortedItems: finalSorted.length,
          finalPastHourCount: finalPastHour.length,
          finalPastDayCount: finalPastDay.length,
          finalPastWeekCount: finalPastWeek.length,
          finalAllTimeCount: finalSorted.length
        });
        
        console.log('Setting final Top Posts data:', finalData);
        setListData(finalData);
        console.log('Top Posts Data Updated:', {
          totalItems: finalSorted.length,
          pastHour: finalData['Past Hour'].length,
          pastDay: finalData['Past Day'].length,
          pastWeek: finalData['Past Week'].length,
          allTime: finalData['All Time'].length,
          currentTime: topPostsTime
        });
      }
    } catch (error) {
      console.error("Error fetching Top Posts data:", error);
      setRefreshed(false);
    }

    const userRef = ref(database, 'users/' + userKey);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setProfileInfo(snapshot.val());
      } else {
        console.log("No user data.");
      }
    }).catch((error) => {
      console.error(error);
    });
  }

  const getNotifications = () => {
    const notificationsRef = ref(database, 'events/' + userKey);
    get(notificationsRef).then((snapshot) => {
      if (snapshot.exists()) {
        setNotifications(snapshot.val() ? 
          Object.keys(snapshot.val()).map(key => ({
            id: key,
            ...snapshot.val()[key]
          }))
          .filter(notification => notification.evokerId !== userKey) // Filter notifications by evokerId
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 50)
          : []
        );
      }
    })

    const userRef = ref(database, 'users/' + userKey);
    update(userRef, {
      unreadNotifications: false
    })
  }

  // replace with function in consts ~
  const getSpotifyAccessToken = async () => {
    const client_id = '3895cb48f70545b898a65747b63b430d';
    const client_secret = '8d70ee092b614f58b488ce149e827ab1';
    const url = 'https://accounts.spotify.com/api/token';
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
    };
    const data = qs.stringify({'grant_type': 'client_credentials'});

    try {
      const response = await axios.post(url, data, {headers});
      setSpotifyAccessToken(response.data.access_token);
    } catch (error) {
      console.error('Error obtaining token:', error);
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      getSpotifyAccessToken()
      if (response?.type === 'success') {
        AuthSession.exchangeCodeAsync({
          clientId: '3895cb48f70545b898a65747b63b430d',
          redirectUri: 'exp://10.0.0.187:8081',
          code: response.params.code,
          extraParams: {
            code_verifier: request.codeVerifier,  // Ensure this is correctly captured
          }
        }, {
          tokenEndpoint: 'https://accounts.spotify.com/api/token',
        })
        .then(result => {
          console.log('Access Token:', result.accessToken);
          setIndividualSpotifyAccessToken(result.accessToken);
        })
        .catch(error => {
          console.error("Failed to exchange token:", error);
        });
      }
      if (feedType === 'For You') {
        await getListData();
      } else if (feedType === 'Following') {
        await getFollowingListData();
      } else if (feedType === 'Top Posts') {
        await getTopPostsListData();
      }
    };
    
    initializeData();
  }, [response]);

  // Handle feed type changes
  useEffect(() => {
    console.log('Feed type changed to:', feedType);
    if (feedType === 'Top Posts' && (!listData || typeof listData === 'object' && Object.keys(listData).length === 0)) {
      console.log('Loading Top Posts data...');
      getTopPostsListData();
    }
  }, [feedType]);

  const NotificationsTile = ({ item, visitingUserId, isDarkMode=false, darkTheme=null }) => {
    const [userInfo, setUserInfo] = useState({});
    const [isFollowingBack, setIsFollowingBack] = useState(false);
    const [isLoadingFollowBack, setIsLoadingFollowBack] = useState(true);

    useEffect(() => {
      const userRef = ref(database, `users/${item.evokerId}`);
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          setUserInfo(snapshot.val());
        }
      })

      const followingRef = ref(database, `users/${visitingUserId}/following/${item.evokerId}`);
      get(followingRef).then((snapshot) => {
        if (snapshot.exists()) {
          setIsFollowingBack(true);
          setIsLoadingFollowBack(false);
        } else {
          setIsFollowingBack(false);
          setIsLoadingFollowBack(false);
        }
      });
    }, [])

    const date = new Date(item.timestamp);
    
    // Function to format timestamp - show relative time for posts less than 1 day old, date for older posts
    const formatTimestamp = (timestamp) => {
      const now = Date.now();
      const postTime = timestamp;
      const diffMs = now - postTime;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 1) {
        // Show date for posts older than 1 day
        return new Date(timestamp).toLocaleDateString("en-US", {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      } else {
        // Show relative time for posts less than 1 day old
        return moment(timestamp).fromNow();
      }
    };
    
    const realDateStr = formatTimestamp(item.timestamp);
    const dateString = date ? date.toLocaleDateString("en-US", {
      year: 'numeric',
      month: '2-digit',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : 'N/A';

    const handleFollowBack = () => {
      const followersRef = ref(database, `users/${item.evokerId}/followers/${visitingUserId}`);
      set(followersRef, { closeFriend: false }).then(() => {
        const followingRef = ref(database, `users/${visitingUserId}/following/${item.evokerId}`);
        set(followingRef, { closeFriend: false }).then(() => {
          setIsFollowingBack(true);
        });
      });
      const eventsRef = push(ref(database, 'events/' + item.evokerId));
      set(eventsRef, {
        evokerId: visitingUserId,
        content: 'followed you back!',
        timestamp: Date.now()
      });
      const userRef = ref(database, 'users/' + item.evokerId);
      update(userRef, {
        unreadNotifications: true
      })
    };

    const onItemPress = (item) => {
      const itemRef = ref(database, `items/${item.postId}`);
      get(itemRef).then((snapshot) => {
        const tempFocusedItem = snapshot.val();
        tempFocusedItem.key = item.postId;
        setFocusedItem(tempFocusedItem);
        setNotifications(null);
      });
    }

    return (
      <View style={{ 
        width: '95%', 
        flexDirection: 'row', 
        padding: 10,
        backgroundColor: isDarkMode ? darkTheme?.background : 'white'
      }}>
        <TouchableOpacity onPress={() => {
          setFeedView({ userKey: item.evokerId, username: userInfo.username });
          setNotifications(null);
        }}>
          <Image
            source={userInfo.profile_pic || 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
            style={{ 
              height: 30, 
              width: 30, 
              borderWidth: 0.5, 
              marginRight: 10, 
              borderRadius: 15, 
              borderColor: isDarkMode ? darkTheme?.border : 'lightgrey' 
            }}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ 
              fontSize: 15, 
              fontWeight: 'bold', 
              marginRight: 20,
              color: isDarkMode ? darkTheme?.textPrimary : 'black'
            }}>{userInfo.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 15, 
              marginTop: 5, 
              flexShrink: 1,
              color: isDarkMode ? darkTheme?.textPrimary : 'black'
            }}>{item.content} <Text style={{ 
              color: isDarkMode ? darkTheme?.textSecondary : 'grey', 
              fontSize: 10 
            }}>{realDateStr}</Text></Text>
            {item.content.includes('follow') ? (
              <>
              {isLoadingFollowBack ? (
                <ActivityIndicator size="medium" color={isDarkMode ? darkTheme?.textPrimary : "black"} style={{ marginTop: 20 }} />
              ) : (
                <TouchableOpacity style={{ 
                  backgroundColor: isFollowingBack ? 'gray' : '#00aced', 
                  paddingVertical: 5, 
                  paddingHorizontal: 10, 
                  borderRadius: 5, 
                  alignSelf: 'flex-end' 
                }} onPress={handleFollowBack} disabled={isFollowingBack}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>
                    {isFollowingBack ? 'Friends' : 'Follow Back'}
                  </Text>
                </TouchableOpacity>
              )}
              </>
            ) : (
              item.image ? (
                <TouchableOpacity onPress={() => onItemPress(item)}>
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: 50, height: 50 }}
                  />
                </TouchableOpacity>
              ) : null
            )}
          </View>
        </View>
      </View>
    );
  }

  if (notifications) {
    return (
      <View style={{ 
        backgroundColor: isDarkMode ? darkTheme?.background : 'white', 
        height: '100%' 
      }}>
        <View style={{ 
          flexDirection: 'row', 
          padding: 10, 
          borderBottomWidth: 1, 
          borderColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: isDarkMode ? darkTheme?.background : 'white' 
        }}>
          <TouchableOpacity onPress={() => {
            setNotifications(null)
            setFeedType('For You')
            getListData();
          }}> 
            <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
          </TouchableOpacity>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold',
            color: isDarkMode ? darkTheme?.textPrimary : 'black'
          }}>Notifications</Text>
        </View>
        <FlatList
          data={notifications}
          renderItem={({ item}) => <NotificationsTile 
            item={item} 
            visitingUserId={userKey}
            isDarkMode={isDarkMode}
            darkTheme={darkTheme}
          />}
        />
      </View>
    )
  }

  if (focusedItem) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: isDarkMode ? darkTheme?.background : 'white' 
      }}>
      <View style={{ 
        flexDirection: 'row', 
        padding: 10, 
        borderBottomWidth: 1, 
        borderColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <TouchableOpacity onPress={() => {
          setFocusedItem(null)
        }}> 
          <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
        </TouchableOpacity>
  
      </View>
      <NormalItemTile 
        item={focusedItem} 
        visitingUserId={userKey} 
        navigation={navigation} 
        showComments={true}
        isDarkMode={isDarkMode}
        darkTheme={darkTheme}
      />
      </View>
    );
  }

  

  if (feedView) {
    return (
      <Profile 
        route={{'params': {
          userKey: feedView.userKey,
          username: feedView.username,
          visitingUserId: userKey,
          setFeedView: setFeedView
        }}}
        navigation={navigation}
      />
    )
  }

  return (
          <View style={{ 
            backgroundColor: isDarkMode ? darkTheme?.background : 'white', 
            height: '100%' 
          }}>
      <View style={{ 
        flexDirection: 'row', 
        marginTop: 10, 
        alignItems: 'center', 
        width: '100%', 
        paddingHorizontal: 20, 
        justifyContent: 'space-between' 
      }}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          {profileInfo && profileInfo.profile_pic ? (
            <Image
              source={{ uri: profileInfo.profile_pic }}
              style={{
                height: 30, 
                width: 30, 
                borderWidth: 0.5, 
                borderRadius: 15, 
                borderColor: isDarkMode ? darkTheme?.border : 'lightgrey' 
              }}
            />
          ) : (
            <Image
              source={'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
              style={{
                height: 30, 
                width: 30, 
                borderWidth: 0.5, 
                borderRadius: 15, 
                borderColor: isDarkMode ? darkTheme?.border : 'lightgrey' 
              }}
            />
          )}
        </TouchableOpacity>
        <Text style={{ 
          color: isDarkMode ? darkTheme?.textPrimary : 'black', 
          fontSize: 24, 
          fontFamily: 'Poppins Regular' 
        }}>ambora\social</Text>
        <TouchableOpacity onPress={() => getNotifications()}>
          {profileInfo.unreadNotifications ? (
            <Ionicons name="notifications-sharp" size={28} color="red"/>
          ) : (
            <Ionicons name="notifications-outline" size={28} color={isDarkMode ? darkTheme?.textSecondary : "grey"}/>
          )}
        </TouchableOpacity>
      </View>

              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                width: '100%', 
                padding: 20, 
                justifyContent: 'space-evenly', 
                borderColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
                borderBottomWidth: 0.5 
              }}>
        <TouchableOpacity onPress={() => {
          console.log('Top Posts button pressed');
          setFeedType('Top Posts');
          // Clear the old array data and set to empty object for Top Posts
          setListData({});
          getTopPostsListData();
        }}>
          <Text style={feedType === 'Top Posts' ? { 
            color: isDarkMode ? darkTheme?.textPrimary : 'black', 
            fontSize: 16, 
            fontWeight: 'bold' 
          } : { 
            color: isDarkMode ? darkTheme?.textSecondary : 'grey', 
            fontSize: 14, 
            fontWeight: 'bold' 
          }}>Top Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setFeedType('For You')
          getListData();
        }}>
          <Text style={feedType === 'For You' ? { 
            color: isDarkMode ? darkTheme?.textPrimary : 'black', 
            fontSize: 16, 
            fontWeight: 'bold' 
          } : { 
            color: isDarkMode ? darkTheme?.textSecondary : 'grey', 
            fontSize: 14, 
            fontWeight: 'bold' 
          }}>For You</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setFeedType('Following')
          getFollowingListData();
        }}>
          <Text style={feedType === 'Following' ? { 
            color: isDarkMode ? darkTheme?.textPrimary : 'black', 
            fontSize: 16, 
            fontWeight: 'bold' 
          } : { 
            color: isDarkMode ? darkTheme?.textSecondary : 'grey', 
            fontSize: 14, 
            fontWeight: 'bold' 
          }}>Following</Text>
        </TouchableOpacity>
      </View>
      
      {feedType === 'Top Posts' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 10, justifyContent: 'space-evenly' }}>
          <TouchableOpacity style={[
            styles.timesButton, 
            { 
              backgroundColor: topPostsTime === 'Past Hour' ? 
                (isDarkMode ? darkTheme?.textPrimary : 'black') : 
                (isDarkMode ? darkTheme?.buttonSecondary : 'lightgrey')
            }
          ]} onPress={() => {
            console.log('Setting topPostsTime to Past Hour');
            setTopPostsTime('Past Hour');
          }}>
            <Text style={[
              styles.timesText, 
              { 
                color: topPostsTime === 'Past Hour' ? 
                  (isDarkMode ? darkTheme?.background : 'white') : 
                  (isDarkMode ? darkTheme?.textPrimary : 'black')
              }
            ]}>Past Hour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[
            styles.timesButton, 
            { 
              backgroundColor: topPostsTime === 'Past Day' ? 
                (isDarkMode ? darkTheme?.textPrimary : 'black') : 
                (isDarkMode ? darkTheme?.buttonSecondary : 'lightgrey')
            }
          ]} onPress={() => {
            console.log('Setting topPostsTime to Past Day');
            setTopPostsTime('Past Day');
          }}>
            <Text style={[
              styles.timesText, 
              { 
                color: topPostsTime === 'Past Day' ? 
                  (isDarkMode ? darkTheme?.background : 'white') : 
                  (isDarkMode ? darkTheme?.textPrimary : 'black')
              }
            ]}>Past Day</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[
            styles.timesButton, 
            { 
              backgroundColor: topPostsTime === 'Past Week' ? 
                (isDarkMode ? darkTheme?.textPrimary : 'black') : 
                (isDarkMode ? darkTheme?.buttonSecondary : 'lightgrey')
            }
          ]} onPress={() => {
            console.log('Setting topPostsTime to Past Week');
            setTopPostsTime('Past Week');
          }}>
            <Text style={[
              styles.timesText, 
              { 
                color: topPostsTime === 'Past Week' ? 
                  (isDarkMode ? darkTheme?.background : 'white') : 
                  (isDarkMode ? darkTheme?.textPrimary : 'black')
              }
            ]}>Past Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[
            styles.timesButton, 
            { 
              backgroundColor: topPostsTime === 'All Time' ? 
                (isDarkMode ? darkTheme?.textPrimary : 'black') : 
                (isDarkMode ? darkTheme?.buttonSecondary : 'lightgrey')
            }
          ]} onPress={() => {
            console.log('Setting topPostsTime to All Time');
            setTopPostsTime('All Time');
          }}>
            <Text style={[
              styles.timesText, 
              { 
                color: topPostsTime === 'All Time' ? 
                  (isDarkMode ? darkTheme?.background : 'white') : 
                  (isDarkMode ? darkTheme?.textPrimary : 'black')
              }
            ]}>All Time</Text>
          </TouchableOpacity>
        </View>
      )}

      {refreshed ? (
        <>
        {numFollowers === 0 && feedType === 'Following' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 20, 
              fontStyle: 'italic',
              color: isDarkMode ? darkTheme?.textSecondary : 'black'
            }}>Follow Your Friends to See Posts</Text>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={isDarkMode ? darkTheme?.textPrimary : "black"} style={{ marginTop: 20 }} />
          </View>
        )}
        </>
      ) : (
        <>
        {/*{listData.length > 0 && (
          <FeedItemTile item={listData[index]} userKey={userKey} setFeedView={setFeedView} navigation={navigation} visitingUserId={userKey} topPostsTime={topPostsTime} setItemInfo={setItemInfo} individualSpotifyAccessToken={individualSpotifyAccessToken} promptAsync={promptAsync} setIndex={setIndex}/>
        )} uncomment this for swiping*/}
        <FlatList
          ref={flatListRef}
          key={`${feedType}-${topPostsTime}`}
          data={(() => {
            let data;
            if (feedType === 'Top Posts' && listData && typeof listData === 'object' && !Array.isArray(listData) && listData[topPostsTime]) {
              data = listData[topPostsTime].slice(0, numFeedItems);
            } else if (Array.isArray(listData)) {
              data = listData.slice(0, numFeedItems);
            } else {
              data = [];
            }
            console.log('FlatList data:', {
              feedType,
              topPostsTime,
              hasListData: !!listData,
              listDataType: typeof listData,
              isArray: Array.isArray(listData),
              hasTopPostsData: !!(listData && typeof listData === 'object' && !Array.isArray(listData) && listData[topPostsTime]),
              dataLength: data.length,
              listDataKeys: listData && typeof listData === 'object' && !Array.isArray(listData) ? Object.keys(listData) : []
            });
            return data;
          })()}
          renderItem={({ item }) => <NormalItemTile 
            item={item} 
            userKey={userKey} 
            setFeedView={setFeedView} 
            navigation={navigation} 
            visitingUserId={userKey} 
            topPostsTime={topPostsTime} 
            setItemInfo={setItemInfo} 
            individualSpotifyAccessToken={individualSpotifyAccessToken} 
            promptAsync={promptAsync}
            isDarkMode={isDarkMode}
            darkTheme={darkTheme}
            onShowPastRankings={showPastRankingsOverlay}
          />}
          keyExtractor={(item, index) => index.toString()}
          numColumns={1}
          onScroll={async (event) => {
            const scrollY = event.nativeEvent.contentOffset.y;
            // Always track current scroll position
            setCurrentScrollPosition(scrollY);
            // Save scroll position for restoration, but only when comments overlay is not active
            if (scrollY > 0 && itemInfo === null) {
              setSavedScrollPosition(scrollY);
            }
            if (scrollY < -110 && !refreshed) {
              setRefreshed(true);
              if (feedType === 'For You') {
                await getListData();
              } else if (feedType === 'Following') {
                await getFollowingListData();
              } else if (feedType === 'Top Posts') {
                await getTopPostsListData();
              }
            }
          }}
          scrollEventThrottle={1} // Define how often to update the scroll position
          style={{ zIndex: 1 }}
          showsVerticalScrollIndicator={false}
        />
        <View style={{ position: 'absolute', width: '100%', justifyContent: 'center', alignItems: 'center', marginTop: 170 }}>
          <Ionicons name='reload' size={40} color={isDarkMode ? darkTheme?.textTertiary : 'lightgray'} />
        </View>
        </>
      )}

      {/* Comments overlay */}
      {itemInfo && (
        <>
          {/* Semi-transparent overlay */}
          <Animated.View 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              zIndex: 10,
              opacity: overlayOpacity
            }}
          >
            <TouchableOpacity 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onPress={() => {
                // Save current scroll position before closing comments
                setSavedScrollPosition(currentScrollPosition);
                setItemInfo(null)
              }}
            />
          </Animated.View>
          
          {/* Bottom sheet */}
          <Animated.View 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: isDarkMode ? darkTheme?.background : 'white',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              height: '66%',
              zIndex: 11,
              transform: [{
                translateY: slideAnim
              }]
            }}
            onTouchStart={() => Keyboard.dismiss()}
          >
              {/* Handle bar */}
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: isDarkMode ? darkTheme?.border : '#ddd',
                borderRadius: 2,
                alignSelf: 'center',
                marginTop: 10,
                marginBottom: 10
              }} />
              
              {/* Comments header */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingBottom: 15,
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? darkTheme?.border : '#eee'
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: isDarkMode ? darkTheme?.textPrimary : 'black'
                }}>
                  Comments
                </Text>
                <TouchableOpacity onPress={() => {
                  // Save current scroll position before closing comments
                  setSavedScrollPosition(currentScrollPosition);
                  setItemInfo(null)
                }}>
                  <Ionicons name="close" size={24} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
                </TouchableOpacity>
              </View>
              
              {/* Comments list */}
              <View style={{ flex: 1, paddingHorizontal: 20 }}>
                {comments.length === 0 ? (
                  <Text style={{
                    fontSize: 16,
                    color: isDarkMode ? darkTheme?.textSecondary : '#666',
                    textAlign: 'center',
                    marginTop: 50,
                    fontStyle: 'italic'
                  }}>
                    Be the first to comment
                  </Text>
                ) : (
                  <FlatList
                    data={comments}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={{
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: isDarkMode ? darkTheme?.border : '#eee'
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                          <Image
                            source={item.profile_pic ? { uri: item.profile_pic } : require('../../assets/images/emptyProfilePic3.png')}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              marginRight: 12
                            }}
                          />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{
                                fontSize: 14,
                                fontWeight: 'bold',
                                color: isDarkMode ? darkTheme?.textPrimary : '#333',
                                marginRight: 8
                              }}>
                                {item.name || 'Anonymous'}
                              </Text>
                              <Text style={{
                                fontSize: 12,
                                color: isDarkMode ? darkTheme?.textSecondary : '#666'
                              }}>
                                {(() => {
                                  const now = Date.now();
                                  const commentTime = item.timestamp;
                                  const diffMs = now - commentTime;
                                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                  
                                  if (diffDays >= 1) {
                                    // Show date for comments older than 1 day
                                    return new Date(commentTime).toLocaleDateString("en-US", {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                    });
                                  } else {
                                    // Show relative time for comments less than 1 day old
                                    const diffSeconds = Math.floor(diffMs / 1000);
                                    const diffMinutes = Math.floor(diffSeconds / 60);
                                    
                                    if (diffHours > 0) {
                                      return `${diffHours}h ago`;
                                    } else if (diffMinutes > 0) {
                                      return `${diffMinutes}m ago`;
                                    } else if (diffSeconds > 0) {
                                      return `${diffSeconds}s ago`;
                                    } else {
                                      return 'now';
                                    }
                                  }
                                })()}
                              </Text>
                            </View>
                            <Text style={{
                              fontSize: 14,
                              color: isDarkMode ? darkTheme?.textPrimary : '#333',
                              lineHeight: 20
                            }}>
                              {item.text}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                    showsVerticalScrollIndicator={true}
                    scrollEnabled={true}
                    nestedScrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    style={{ flex: 1 }}
                    bounces={true}
                    alwaysBounceVertical={false}
                    scrollEventThrottle={16}
                    removeClippedSubviews={false}
                    onScrollBeginDrag={() => Keyboard.dismiss()}
                  />
                )}
              </View>
              
              {/* Add comment section - moved to bottom */}
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 15,
                borderTopWidth: 1,
                borderTopColor: isDarkMode ? darkTheme?.border : '#eee',
                backgroundColor: isDarkMode ? darkTheme?.background : 'white'
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDarkMode ? darkTheme?.inputBackground : '#f5f5f5',
                  borderRadius: 20,
                  paddingHorizontal: 15,
                  paddingVertical: 7.5,
                }}>
                  <TextInput
                    placeholder="Add a comment..."
                    placeholderTextColor={isDarkMode ? darkTheme?.placeholder : "#999"}
                    value={commentText}
                    onChangeText={setCommentText}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: isDarkMode ? darkTheme?.textPrimary : 'black'
                    }}
                    multiline={false}
                    onSubmitEditing={postComment}
                  />
                  <TouchableOpacity 
                    style={{
                      backgroundColor: commentText.trim() ? (isDarkMode ? darkTheme?.textPrimary : '#000') : (isDarkMode ? darkTheme?.border : '#ccc'),
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginLeft: 10
                    }}
                    onPress={postComment}
                    disabled={!commentText.trim() || commentLoading}
                  >
                    {commentLoading ? (
                      <ActivityIndicator size="small" color={isDarkMode ? darkTheme?.background : 'white'} />
                    ) : (
                      <Ionicons 
                        name="arrow-up" 
                        size={16} 
                        color={isDarkMode ? darkTheme?.background : 'white'} 
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
        </>
      )}

      {/* Past Rankings overlay */}
      {pastRankingsInfo && (
        <>
          {/* Semi-transparent overlay */}
          <Animated.View 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              zIndex: 10,
              opacity: pastRankingsOverlayOpacity
            }}
          >
            <TouchableOpacity 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onPress={hidePastRankingsOverlay}
            />
          </Animated.View>
          
          {/* Bottom sheet */}
          <Animated.View 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: isDarkMode ? darkTheme?.background : 'white',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              height: '66%',
              zIndex: 11,
              transform: [{
                translateY: pastRankingsSlideAnim
              }]
            }}
            onTouchStart={() => Keyboard.dismiss()}
          >
              {/* Handle bar */}
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: isDarkMode ? darkTheme?.border : '#ddd',
                borderRadius: 2,
                alignSelf: 'center',
                marginTop: 10,
                marginBottom: 10
              }} />
              
              {/* Past Rankings header */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingBottom: 15,
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? darkTheme?.border : '#eee'
              }}>
                                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: isDarkMode ? darkTheme?.textPrimary : 'black'
                  }}>
                    Ranked by
                  </Text>
                <TouchableOpacity onPress={hidePastRankingsOverlay}>
                  <Ionicons name="close" size={24} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
                </TouchableOpacity>
              </View>
              
              {/* Past Rankings list */}
              <View style={{ flex: 1, paddingHorizontal: 20 }}>
                {pastRankingsInfo.profileList.length === 0 ? (
                  <Text style={{
                    fontSize: 16,
                    color: isDarkMode ? darkTheme?.textSecondary : '#666',
                    textAlign: 'center',
                    marginTop: 50,
                    fontStyle: 'italic'
                  }}>
                    No past rankings found
                  </Text>
                ) : (
                                      <FlatList
                      data={pastRankingsInfo.profileList.sort((a, b) => (b.postTimestamp || 0) - (a.postTimestamp || 0))}
                      keyExtractor={(item, index) => item.key ? item.key.toString() : index.toString()}
                    renderItem={({ item, index }) => {
                      const score = pastRankingsInfo.compareUserRating[index];
                      if (!score) return null;
                      const roundedScore = score.toFixed(1);
                      const backgroundColor = getScoreColorHSL(parseFloat(roundedScore));
                      
                      return (
                        <View style={{
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: isDarkMode ? darkTheme?.border : '#eee'
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ position: 'relative' }}>
                              <Image
                                source={item.profile_pic ? { uri: item.profile_pic } : require('../../assets/images/emptyProfilePic3.png')}
                                style={{
                                  width: 50,
                                  height: 50,
                                  borderRadius: 25,
                                  marginRight: 12
                                }}
                              />
                                                              <View style={{
                                  position: 'absolute',
                                  right: 10,
                                  top: -5,
                                  backgroundColor,
                                  borderRadius: 12,
                                  width: 24,
                                  height: 24,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  borderWidth: 1,
                                  borderColor: 'white'
                                }}>
                                <Text style={{
                                  color: 'white',
                                  fontSize: 10,
                                  fontWeight: 'bold'
                                }}>
                                  {roundedScore}
                                </Text>
                              </View>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={{
                                  fontSize: 14,
                                  fontWeight: 'bold',
                                  color: isDarkMode ? darkTheme?.textPrimary : '#333',
                                  marginRight: 8
                                }}>
                                  {item.name || 'Anonymous'}
                                </Text>
                                                                  <Text style={{
                                    fontSize: 12,
                                    color: isDarkMode ? darkTheme?.textSecondary : '#666'
                                  }}>
                                    {(() => {
                                      const now = Date.now();
                                      const rankingTime = item.postTimestamp || now;
                                      const diffMs = now - rankingTime;
                                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                      
                                      if (diffDays >= 1) {
                                        return new Date(rankingTime).toLocaleDateString("en-US", {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit',
                                        });
                                      } else {
                                        const diffSeconds = Math.floor(diffMs / 1000);
                                        const diffMinutes = Math.floor(diffSeconds / 60);
                                        
                                        if (diffHours > 0) {
                                          return `${diffHours}h ago`;
                                        } else if (diffMinutes > 0) {
                                          return `${diffMinutes}m ago`;
                                        } else if (diffSeconds > 0) {
                                          return `${diffSeconds}s ago`;
                                        } else {
                                          return 'now';
                                        }
                                      }
                                    })()}
                                  </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    }}
                    showsVerticalScrollIndicator={true}
                    scrollEnabled={true}
                    nestedScrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    style={{ flex: 1 }}
                    bounces={true}
                    alwaysBounceVertical={false}
                    scrollEventThrottle={16}
                    removeClippedSubviews={false}
                    onScrollBeginDrag={() => Keyboard.dismiss()}
                  />
                )}
              </View>
            </Animated.View>
        </>
      )}
    </View>
  )
};

export default Feed;