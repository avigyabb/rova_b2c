import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Text, View, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, ScrollView, Pressable, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get, set, remove, push, update, child } from "firebase/database";
import { Image } from 'expo-image';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Hyperlink from 'react-native-hyperlink';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Profile from './Profile';
import axios from 'axios';
import { generateRandom, deriveChallenge } from 'expo-auth-session';
import { Video } from 'expo-av';
import moment from 'moment';
import { formatDistanceToNow } from 'date-fns';
import { Audio } from 'expo-av';
import { artistName } from './Search';
 
async function getDeezerPreviewUrl(trackName, artistName) {
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
      alert("Sorry, this snippet is unavailable. Try a different song!")
      throw new Error('Track preview not found.');
    }
  } catch (error) {
    console.error('Error fetching Deezer preview URL:', error);
    throw error;
  }
}


// this function is repeated many times -> condense into one file ~
function getScoreColorHSL(score) {
  if (score < 0) {
    return '#A3A3A3'; // Gray color for negative scores
  }
  const cappedScore = Math.max(0, Math.min(score, 10));
  const hue = (cappedScore / 10) * 120;
  const lightness = 50 - score ** 1.3;
  return `hsl(${hue}, 100%, ${lightness}%)`;
}

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 60,
    position: 'relative',
  },
  icon: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  badgeContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'red',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});


const NormalItemTile = React.memo(({ item, showButtons=true, userKey, setFeedView, navigation, visitingUserId, editMode=false, setFocusedItemDescription, topPostsTime, setItemInfo, showComments=false, individualSpotifyAccessToken, promptAsync, setIndex, isDarkMode=false, darkTheme=null, onShowPastRankings=null, currentProfileUserKey=null }) => {
  const userRef = ref(database, `users/${item.user_id}`);
  const [username, setUsername] = useState('');
  const [userImage, setUserImage] = useState('https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png');
  const [dimensions, setDimensions] = useState({ width: undefined, height: undefined });
  const [itemDescription, setItemDescription] = useState(item.description);
  const [likes, setLikes] = useState({});
  const [dislikes, setDislikes] = useState({});
  const [stars, setStars] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentTypingMode, setCommentTypingMode] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState('')
  const [accessToken, setAccessToken] = useState(null);
  const [devices, setDevices] = useState([]);
  const [trackUri, setTrackUri] = useState('')
  const [artistNames, setArtistNames] = useState(null)
  const [songState, setSongState] = useState(0)
  const [didFinish, setDidFinish] = useState(false)
  const [compareUserID, setCompareUserID] = useState([])
  const [compareUserRating, setCompareUserRating] = useState([])
  const [profileList, setProfileList] = useState([])
  const [loading, setLoading] = useState(false);



  const onImageLoad = (event) => {
    // Safe image load handler - only set dimensions if they haven't been set yet
    if (!dimensions.width || !dimensions.height) {
      const { width, height } = event.source;
      if (width && height && width > 0 && height > 0) {
        setDimensions({ width: 260, height: 260 * height / width });
      }
    }
  };

  const getProfile = (userID) => {
    const userRef = ref(database, 'users/' + userID);
    return get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        return userData; 
      } else {
        console.log("Error fetching user");
        return null;
      }
    });
  }
  
  const getProfileList = async (userIDList, timestamps) => {
    // Clear the profileList first to prevent duplicates
    setProfileList([]);
    
    console.log('Processing profiles with timestamps:', timestamps);
    
    const profilesWithTimestamps = [];
    for (let i = 0; i < userIDList.length; i++) {
      try {
        const addition = await getProfile(userIDList[i]);
        if (addition) {
          // Add timestamp to the profile data, only if timestamp exists
          if (timestamps[i] && timestamps[i] > 0) {
            addition.postTimestamp = timestamps[i];
            console.log(`Added timestamp ${timestamps[i]} to user ${addition.name}`);
          } else {
            // Skip this profile if no valid timestamp
            console.log(`Skipping user ${addition.name} - no valid timestamp`);
            continue;
          }
          profilesWithTimestamps.push(addition);
        }
      } catch (error) {
        console.log(error);
      }
    }
    console.log('Final profiles with timestamps:', profilesWithTimestamps);
    
    // Sort by most recent first
    const sortedProfiles = profilesWithTimestamps.sort((a, b) => (b.postTimestamp || 0) - (a.postTimestamp || 0));
    console.log('Sorted profiles (most recent first):', sortedProfiles);
    
    setProfileList(sortedProfiles);
    setLoading(false);
    return sortedProfiles;
  }
  
  // Fetch comments for this post
  const fetchComments = async () => {
    if (!item.key) return;
    
    let allComments = [];
    
    // Check new comments location
    const newCommentsRef = ref(database, `comments/${item.key}`);
    const newSnapshot = await get(newCommentsRef);
    
    if (newSnapshot.exists()) {
      const newCommentsData = Object.entries(newSnapshot.val()).map(([key, value]) => ({
        id: key,
        userId: value.user_id,
        comment: value.text,
        timestamp: value.timestamp
      }));
      allComments = [...allComments, ...newCommentsData];
    }
    
    // Check old comments location
    const oldCommentsRef = ref(database, `items/${item.key}/comments`);
    const oldSnapshot = await get(oldCommentsRef);
    
    if (oldSnapshot.exists()) {
      const oldCommentsData = Object.entries(oldSnapshot.val()).map(([key, value]) => ({
        id: key,
        userId: value.userId,
        comment: value.comment,
        timestamp: value.timestamp
      }));
      allComments = [...allComments, ...oldCommentsData];
    }
    
    setComments(allComments);
  };

  // Fetch comments when component mounts
  useEffect(() => {
    fetchComments();
  }, [item.key]);

  useEffect(() => {
    
  if (item.image){
    setLoading(true);
    // Define your Firebase database reference
    const itemsRef = ref(database, 'items');
    
    // Create a query to fetch items with the specified image
    itemsQuery = query(itemsRef, orderByChild('image'), equalTo(item.image));
    
    // Use the `get` function to fetch the data once
    get(itemsQuery).then((snapshot) => {
      if (snapshot.exists()) {
        const unfilteredData = snapshot.val();
        const data = [];
    
        // Filter the data based on the content
        for (let itemId in unfilteredData) {
          console.log(itemId);
          if (unfilteredData[itemId].content === item.content) {
            data.push(unfilteredData[itemId]);
          }
        }
    
        console.log("data: ", data);
    
        // Extract user IDs, scores, and timestamps from the filtered data
        var same_user = false;
        const postTimestamps = []; // Array to store timestamps of the posts
        const compareUserID = []; // Clear and rebuild these arrays
        const compareUserRating = [];

        for (let i = 0; i < data.length; i++) {
          const post = data[i];
          const userId = post.user_id;

          // Check if the current user ID matches item.userId
          if (userId === item.user_id) {
            continue; // Skip this iteration
          }

          if (post.score === -1) {
            continue; // Skip the entire iteration if score is -1
          }

          // Add user ID, score, and timestamp
          compareUserID.push(userId);
          compareUserRating.push(post.score);
          postTimestamps.push(post.timestamp);
        }


        console.log('User IDs:', compareUserID);
        console.log('Scores:', compareUserRating);
        console.log('Timestamps:', postTimestamps);
    
        // Call a function to process the user IDs with timestamps
        setCompareUserRating(compareUserRating); // Update the state with new data
        getProfileList(compareUserID, postTimestamps);

        
      } else {
        console.log("No data available");
      }
    }).catch((error) => {
      console.error('Error Fetching Data: ', error);
    });
  }

    getSpotifyAccessToken();
    const userRef = ref(database, `users/${item.user_id}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setUsername(snapshot.val().name)
        setUserImage(snapshot.val().profile_pic || 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png');
        setIsVerified(snapshot.val().user_type === 'verified');
      }
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });

    setLikes(item.likes || {});
    setDislikes(item.dislikes || {});
    setStars(item.stars || {});
    setComments( item.comments ? 
      Object.keys(item.comments).map(key => ({
        id: key,
        ...item.comments[key]
      })).sort((a, b) => a.timestamp - b.timestamp) : []
    );    
    setItemDescription(item.description);
  }, [topPostsTime, item])

  let scoreColor = getScoreColorHSL(Number(item.score));
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
  const dateString = date.toLocaleDateString("en-US", {
    year: 'numeric',
    month: '2-digit',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
      console.log(response)
      setSpotifyAccessToken(response.data.access_token);
    } catch (error) {
      console.error('Error obtaining token:', error);
    }
  }

  const onLikePress = (item) => {
    console.log(item.key)
    const itemLikeRef = ref(database, 'items/' + item.key + '/likes/' + visitingUserId);
    const eventsRef = push(ref(database, 'events/' + item.user_id));
    const userRef = ref(database, 'users/' + item.user_id);
    console.log(itemLikeRef)

    if (visitingUserId in likes) {
      remove(itemLikeRef);
      setLikes(prevLikes => {
        const {[visitingUserId]: _, ...newLikes} = prevLikes;  // Use destructuring to exclude the `userId` key
        return newLikes;
      });
    } else if (!(visitingUserId in dislikes)) {
      console.log("ran2")
      set(itemLikeRef, {
        userId: visitingUserId
      })
      setLikes(prevLikes => ({
        ...prevLikes,
        [visitingUserId]: visitingUserId
      }));
      set(eventsRef, {
        evokerId: visitingUserId,
        content: 'liked your post: ' + item.content + '!',
        timestamp: Date.now(),
        image: item.image, //added to make the image appear in the notifcation center
        postId: item.key
      })
      update(userRef, {
        unreadNotifications: true
      })
    }
    //setIndex((prevIndex) => prevIndex + 1); uncomment for swiping
  }

  const onDislikePress = (item) => {
    const itemDislikeRef = ref(database, 'items/' + item.key + '/dislikes/' + visitingUserId);
    const eventsRef = push(ref(database, 'events/' + item.user_id));
    const userRef = ref(database, 'users/' + item.user_id);

    if (visitingUserId in dislikes) {
      remove(itemDislikeRef);
      setDislikes(prevDislikes => {
        const {[visitingUserId]: _, ...newDislikes} = prevDislikes;  // Use destructuring to exclude the `userId` key
        return newDislikes;
      });
    } else if (!(visitingUserId in likes)) {
      set(itemDislikeRef, {
        userId: visitingUserId
      })
      setDislikes(prevDislikes => ({
        ...prevDislikes,
        [visitingUserId]: visitingUserId
      }));
      set(eventsRef, {
        evokerId: visitingUserId,
        content: 'disliked your post: ' + item.content + '!',
        timestamp: Date.now(),
        image: item.image, //added to make the image appear in the notifcation center
        postId: item.key
      })
      update(userRef, {
        unreadNotifications: true
      })
    }
    //setIndex((prevIndex) => prevIndex + 1); uncomment for swiping
  }

  const onStarPress = (item) => {
    const itemStarRef = ref(database, 'items/' + item.key + '/stars/' + visitingUserId);
    const eventsRef = push(ref(database, 'events/' + item.user_id));
    const userRef = ref(database, 'users/' + item.user_id);

    console.log(stars)
    if (visitingUserId in stars) {
      console.log("ran3")
      remove(itemStarRef);
      setStars(prevStars => {
        const {[visitingUserId]: _, ...newStars} = prevStars;  // Use destructuring to exclude the `userId` key
        return newStars;
      });
    } else {
      console.log("ran")
      set(itemStarRef, {
        userId: visitingUserId
      })
      setStars(prevStars => ({
        ...prevStars,
        [visitingUserId]: visitingUserId
      }));
      set(eventsRef, {
        evokerId: visitingUserId,
        content: 'spotlighted your post: ' + item.content + '!',
        timestamp: Date.now()
      })
      if (item.user_id !== visitingUserId) {
        update(userRef, {
          unreadNotifications: true
        }) 
      }
    }
  }

  const onNewCommentSubmit = (item) => {
    console.log(item)
    const itemCommentRef = push(ref(database, 'comments/' + item.key));
    set(itemCommentRef, {
      user_id: visitingUserId,
      text: newComment,
      timestamp: Date.now()
    })
    setComments([{
      userId: visitingUserId,
      comment: newComment,
      timestamp: Date.now()
    }, ...comments]);
    setNewComment(''); // Clear the input after submission

    const eventsRef = push(ref(database, 'events/' + item.user_id));
    const userRef = ref(database, 'users/' + item.user_id);
    set(eventsRef, {
      evokerId: visitingUserId,
      content: 'commented on your post: ' + item.content + '!',
      timestamp: Date.now(),
      image: item.image, //added to make the image appear in the notifcation center
      postId: item.key
    })
    update(userRef, {
      unreadNotifications: true
    })
  }

  const onCommentPress = (item) => {
    console.log('onCommentPress called with item:', item);
    console.log('setItemInfo function:', setItemInfo);
    console.log('item.key:', item.key);
    console.log('item.image:', item.image);
    console.log('About to call setItemInfo with:', item);
    setItemInfo(item);
    console.log('setItemInfo called successfully');
  }  

  const CommentTile = ({ item }) => {
    const [userInfo, setUserInfo] = useState({});

    useEffect(() => {
      const userRef = ref(database, `users/${item.userId}`);
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          setUserInfo(snapshot.val());
        }
      })
    }, [])

    const date = new Date(item.timestamp);
    const realDateStr = formatTimestamp(item.timestamp);
    const dateString = date ? date.toLocaleDateString("en-US", {
      year: 'numeric',
      month: '2-digit',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : 'N/A';

    return (
        <View style={{ flexDirection: 'row', paddingVertical: 10 }}>
          <TouchableOpacity onPress={() => visitingUserId === item.userId ? navigation.navigate('Profile') : setFeedView({userKey: item.userId, username: userInfo.username})}>
            <Image
              source={userInfo.profile_pic || 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
              style={{height: 30, width: 30, borderWidth: 0.5, marginRight: 10, borderRadius: 15, borderColor: 'lightgrey' }}
            />
          </TouchableOpacity>
          <View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', marginRight: 5 }}>{userInfo.name}</Text>
              <Text style={{ color: 'grey', fontSize: 10 }}>{realDateStr}</Text>
            </View>
            <Text style={{ marginTop: 5, width: 320 }}>{item.comment}</Text>
            {/*<TouchableOpacity onPress={() => console.log('Reply pressed')}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: 'grey', marginTop: 5 }}>Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => console.log('')}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: 'grey', marginTop: 5 }}> ——— View 1 more replies</Text>
            </TouchableOpacity>*/}
          </View>
        </View>
    );
  }

  const fetchDevices = async () => {
    const devicesUrl = 'https://api.spotify.com/v1/me/player/devices';
    try {
      const response = await axios.get(devicesUrl, {
        headers: {
          'Authorization': `Bearer ${individualSpotifyAccessToken}`
        }
      });
      console.log("Available devices: ", response.data.devices);
    } catch (error) {
      console.error("Error fetching devices: ", error.response);
    }
  };


  const [previewUrl, setPreviewUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);
  const soundRef = useRef(new Audio.Sound());
  const [urlFetched, setUrlFetched] = useState(false)
  const [currentSound, setCurrentSound] = useState(null);




  const playSound = async (soundUri, playState) => {
    const { sound } = await Audio.Sound.createAsync({ uri: soundUri });
    if (playState ===1) {
      if (currentSound) {
        await currentSound.unloadAsync();
      }
  
     
      setCurrentSound(sound);
      await sound.playAsync();
    }
    if (playState === 2){
      currentSound.pauseAsync();
    }
  };


  const urlFetching = () => {
    if (previewUrl === null){
      urlFetching();
    }else{
      setUrlFetched(true)
    }
  }

  const handleFetchTrack = async (item) => {
    try {
      
      setError(null);
      let url = await getDeezerPreviewUrl(item.content, item.artist);
      setPreviewUrl(url)
      
      
      
    } catch (error) {
      setError('Error fetching track');
      console.error('Error fetching track:', error);
    }
    

  };

  const handlePlayTrack = async (item) => {
    console.log(previewUrl)
   

    if (previewUrl) {
      try {
        if (playing) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          setPlaying(false);
        } else {
          if (didFinish){

          setDidFinish(false)
          await soundRef.current.playAsync()
          .then(() => {setPlaying(true);})}

          else{

            await soundRef.current.loadAsync({ uri: previewUrl })
          .then( async () => {
          await soundRef.current.playAsync()
          }
          )
          .then(() => {setPlaying(true);})
          }
        }
      } catch (error) {
        setError('Error playing track');
        console.error('Error playing track:', error);
      }
    } 
  };
  soundRef.current.setOnPlaybackStatusUpdate((status) => {
    if (status.didJustFinish) {
      setSongState(3)
    }
  });


  const onSongImagePress = (item) => {
     if (item.content != null){

        handleFetchTrack(item)
        handlePlayTrack(item);
       
    }
  }

  

  const onItemImagePress = async (item) => {
    if (!individualSpotifyAccessToken) {
      promptAsync();
      return;
    }
    const playUrl = 'https://api.spotify.com/v1/me/player/play';
    
    try {
      await axios.put(playUrl, {
        uris: [item.trackUri],
      }, {
        headers: {
          'Authorization': `Bearer ${individualSpotifyAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
        console.log("error: ", error.response);
        if (error.response && error.response.data && error.response.data.error && error.response.data.error.reason === "NO_ACTIVE_DEVICE") {
          alert("No active Spotify devices found. Please open Spotify and start playback, or select a device.");
          fetchDevices(); // Optional: Implement device selection here
        }
    }
  }

  const memoizedComments = useMemo(() => comments.map((item, index) => <CommentTile item={item} key={index} />), [comments]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ backgroundColor: isDarkMode ? darkTheme?.background : 'white' }}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View>
    {!commentTypingMode && (
    <View style={{ padding: 10, borderBottomColor: isDarkMode ? darkTheme?.border : 'lightgrey', borderBottomWidth: 1, backgroundColor: isDarkMode ? darkTheme?.background : 'white' }}>
      <>
      <View style={{ flexDirection: 'row' }}>
        {currentProfileUserKey && currentProfileUserKey !== userKey ? (
          // When viewing another user's profile, don't make the profile image clickable
          <Image
            source={userImage}
            style={{height: 50, width: 50, borderWidth: 0.5, marginRight: 10, borderRadius: 25, borderColor: 'lightgrey' }}
          />
        ) : (
          <TouchableOpacity onPress={() => userKey === item.user_id ? navigation.navigate('Profile') : setFeedView({userKey: item.user_id, username: username})}>
            <Image
              source={userImage}
              style={{height: 50, width: 50, borderWidth: 0.5, marginRight: 10, borderRadius: 25, borderColor: 'lightgrey' }}
            />
          </TouchableOpacity>
        )}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDarkMode ? darkTheme?.textPrimary : 'black' }}>{username}</Text>
            {isVerified && <MaterialIcons name="verified" size={16} color="#00aced" style={{ marginLeft: 5 }}/>}
            <Text style={{ color: isDarkMode ? darkTheme?.textSecondary : 'grey', fontSize: 12, marginLeft: 5 }}>{realDateStr}</Text>
          </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, width: 260 }}>
            <Text style={{ color: isDarkMode ? darkTheme?.textSecondary : 'gray', fontWeight: 'bold', fontSize: 13, fontStyle: 'italic' }}>
              {item.category_name ? (item.score < 0 ? `${item.category_name}/Later/ ` : `${item.category_name}/ `) : null}
              <Text style={{ fontWeight: 'bold', fontSize: 16, fontStyle: 'italic', color: isDarkMode ? darkTheme?.textPrimary : 'black' }}>{item.content}</Text>
            </Text>
          </View>
        </View>
        <View style={{ 
          borderColor: scoreColor, 
          marginLeft: 'auto',
          width: 44,
          height: 44,
          borderRadius: 22,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 4,
          borderWidth: 3,
          backgroundColor: isDarkMode ? darkTheme?.background : 'white',
          shadowColor: isDarkMode ? '#000' : scoreColor,
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: isDarkMode ? 0.3 : 0.2,
          shadowRadius: 4,
          elevation: isDarkMode ? 4 : 2,
        }}>
          <Text style={{ 
            color: scoreColor, 
            fontWeight: 'bold',
            fontSize: 14,
            textShadowColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}>{item.score > 0 ? item.score.toFixed(1) : '...'}</Text>
        </View>
      </View>
          
      <View style={{ marginLeft: 60, width: 300, marginTop: 10 }}>
        {editMode ? (
          <TextInput
            value={itemDescription}
            onChangeText={(text) => {
              setItemDescription(text)
              setFocusedItemDescription(text)
            }}
            multiline
            style={{ 
              fontSize: 15, 
              borderColor: 'lightgrey',
              borderBottomWidth: 1,
              paddingBottom: 5
            }}
          />
        ) : (
          <>
          {item.description && item.description.length > 0 && (
            <Hyperlink
              linkDefault={ true }
              linkStyle={ { color: '#2980b9', textDecorationLine: 'underline' } }
              onPress={ (url, text) => Linking.openURL(url) }
            >
              <Text style={{ fontSize: 15, marginTop: 5, lineHeight: 20, color: isDarkMode ? darkTheme?.textPrimary : 'black' }}>
                {itemDescription}
              </Text>
            </Hyperlink>
          )}
          </>
        )}
        {item.image && ( 
          <>
          {item.imageType && item.imageType === 'video' ? (
            <Video
              source={{ uri: item.image }}        // Can be a URL or a local file.
              rate={0}                            // 0 is paused, 1 is normal.
              volume={1.0}                        // 0 is muted, 1 is normal.
              isMuted={false}                     // Mutes the audio.
              resizeMode="cover"                  // Cover, contain, stretch, etc.
              shouldPlay                          // Can be set to true to play automatically.
              isLooping                           // Repeat the video when it ends.
              useNativeControls                   // Show the native controls.
              style={{ width: 300, height: 300 }} // You can adjust the size.
            />
          ) : (
            <>
            {/* <TouchableOpacity onPress={() => onItemImagePress(item)}> */}
              
              <Image
                source={{ uri: item.image }}
                style={{
                  height: dimensions.height, 
                  width: dimensions.width, 
                  borderWidth: 0.5, 
                  marginRight: 10, 
                  borderRadius: 5, 
                  borderColor: 'lightgrey' ,
                  marginTop: 10
                }}
                onLoad={onImageLoad}
              />
              
            {/* </TouchableOpacity> */}
            </>
          )}
          </>
        )}
      </View>
      

      
      {/* {visitingUserId !== item.user_id && ( */}
      <View style={{ flexDirection: 'row', marginTop: 20 }}>
        <TouchableOpacity style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }} onPress={() => onLikePress(item)}>
          <MaterialIcons name="thumb-up" size={25} color={visitingUserId in likes ? (isDarkMode ? darkTheme?.textPrimary : "black") : (isDarkMode ? darkTheme?.textSecondary : "grey")} />
          <Text style={{ color: isDarkMode ? darkTheme?.textSecondary : 'grey', fontSize: 12 }}>{Object.keys(likes).length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }} onPress={() => onDislikePress(item)}>
          <MaterialIcons name="thumb-down" size={25} color={visitingUserId in dislikes ? (isDarkMode ? darkTheme?.textPrimary : "black") : (isDarkMode ? darkTheme?.textSecondary : "grey")} />
          <Text style={{ color: isDarkMode ? darkTheme?.textSecondary : 'grey', fontSize: 12 }}>{Object.keys(dislikes).length}</Text>
        </TouchableOpacity>
        
        {!showComments && (
          <TouchableOpacity 
            style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }} 
            onPress={() => {
              console.log('Comment button pressed!');
              onCommentPress(item);
            }}
          >
            <Ionicons name="chatbubble-sharp" size={25} color="grey" />
            <Text style={{ color: 'grey', fontSize: 12 }}>{comments.length}</Text>
          </TouchableOpacity>
        )}

        {/* Past Rankings Circles */}
        {profileList.length > 0 && !showComments && (
          <TouchableOpacity 
            style={{ marginRight: 10 }}
            onPress={() => onShowPastRankings && onShowPastRankings(item, profileList, compareUserRating)}
            activeOpacity={0.7}
          >
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                paddingRight: 10
              }}
            >
              {profileList.length <= 3 ? (
                // Show individual profiles for 3 or fewer
                profileList.map((item, index) => {
                  const score = compareUserRating[index];
                  if (!score) return null;
                  const roundedScore = score.toFixed(1);
                  const backgroundColor = getScoreColorHSL(parseFloat(roundedScore));
                  
                  return (
                    <View key={index} style={{ alignItems: 'center', marginRight: 8, paddingTop: 4 }}>
                      <View style={{ position: 'relative' }}>
                        <Image
                          source={item.profile_pic ? { uri: item.profile_pic } : { uri: 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png' }} 
                          style={{ height: 28, width: 28, borderWidth: 0.5, borderRadius: 14, borderColor: 'lightgrey' }}
                        />
                        <View style={{ 
                          position: 'absolute', 
                          right: -2, 
                          top: -2, 
                          backgroundColor, 
                          borderRadius: 8, 
                          width: 16, 
                          height: 16, 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          borderWidth: 1, 
                          borderColor: 'white',
                          zIndex: 1000,
                          elevation: 5
                        }}>
                          <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>{roundedScore}</Text>
                        </View>
                      </View>
                      <Text 
                        style={{ 
                          marginTop: 3, 
                          textAlign: 'center', 
                          maxWidth: 50,
                          fontSize: 10,
                          color: isDarkMode ? darkTheme?.textSecondary : '#666'
                        }}
                        numberOfLines={1} 
                        ellipsizeMode="tail"
                      >
                        {item.name}
                      </Text>
                    </View>
                  );
                })
              ) : (
                // Show grouped display for more than 3
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 4 }}>
                  {/* First 2 profiles with overlap */}
                  {profileList.slice(0, 2).map((item, index) => {
                    const score = compareUserRating[index];
                    if (!score) return null;
                    const roundedScore = score.toFixed(1);
                    const backgroundColor = getScoreColorHSL(parseFloat(roundedScore));
                    
                    return (
                      <View key={index} style={{ 
                        alignItems: 'center', 
                        marginLeft: index === 0 ? 0 : -8,
                        zIndex: 2 - index
                      }}>
                        <View style={{ position: 'relative' }}>
                          <Image
                            source={item.profile_pic ? { uri: item.profile_pic } : { uri: 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png' }} 
                            style={{ 
                              height: 28, 
                              width: 28, 
                              borderWidth: 1.5, 
                              borderRadius: 14, 
                              borderColor: isDarkMode ? darkTheme?.background : 'white'
                            }}
                          />
                          <View style={{ 
                            position: 'absolute', 
                            right: -2, 
                            top: -2, 
                            backgroundColor, 
                            borderRadius: 8, 
                            width: 16, 
                            height: 16, 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            borderWidth: 1, 
                            borderColor: 'white',
                            zIndex: 1000,
                            elevation: 5
                          }}>
                            <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>{roundedScore}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                  
                  {/* Third profile with actual ranking */}
                  <View style={{ alignItems: 'center', marginLeft: -8, zIndex: 1 }}>
                    <View style={{ position: 'relative' }}>
                      <Image
                        source={profileList[2].profile_pic ? { uri: profileList[2].profile_pic } : { uri: 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png' }} 
                        style={{ 
                          height: 28, 
                          width: 28, 
                          borderWidth: 1.5, 
                          borderRadius: 14, 
                          borderColor: isDarkMode ? darkTheme?.background : 'white'
                        }}
                      />
                      <View style={{ 
                        position: 'absolute', 
                        right: -2, 
                        top: -2, 
                        backgroundColor: getScoreColorHSL(parseFloat(compareUserRating[2]?.toFixed(1) || 0)), 
                        borderRadius: 8, 
                        width: 16, 
                        height: 16, 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        borderWidth: 1, 
                        borderColor: 'white',
                        zIndex: 1000,
                        elevation: 5
                      }}>
                        <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>
                          {compareUserRating[2] ? compareUserRating[2].toFixed(1) : '0.0'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Text showing simplified format */}
                  <Text 
                    style={{ 
                      marginLeft: 8,
                      fontSize: 12,
                      color: isDarkMode ? darkTheme?.textSecondary : '#666',
                      fontWeight: '500'
                    }}
                  >
                    {profileList[0]?.name || 'Unknown'} and others
                  </Text>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        )}
  
        {/*<TouchableOpacity style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }} onPress={() => onStarPress(item)}>
          <Ionicons name="star" size={30} color={visitingUserId in stars ? "black" : "grey"} />
          <Text style={{ color: 'grey', fontSize: 12 }}>{Object.keys(stars).length}</Text>
        // </TouchableOpacity> uncomment for swiping*/
        }

        {/* Removed the son snippet feature due to too many bugs */}

        {/*{item.artist != null && (<TouchableOpacity style={{ marginRight: 10, marginLeft: 'auto', justifyContent: 'center', alignItems: 'center' }} onPress={() =>{ onSongImagePress(item); if (songState === 0){setSongState(1)} if(songState ===1){setSongState(2);} if(songState === 2){setSongState(1);} if (songState ===3 ){setSongState(1)} }}>
        
        <Ionicons name= {songState === 0 ? "musical-notes": (songState === 1 ? "play": (songState ===2 ? "pause": "reload"))} size={40} color={songState === 0 ? "grey": (songState === 3 ? 'grey': "green")} />

        </TouchableOpacity>)} */}
        
        {/* {songQ && (<TouchableOpacity style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }} onPress={() =>{ onSongImagePress(item); setSongQ(true);} }>
        
        <Ionicons name="musical-notes" size={26} color={"grey"} />

        </TouchableOpacity>)} */}

        <TouchableOpacity 
          style={{ marginLeft: 'auto', marginRight: 10 }} 
          onPress={() => navigation.navigate('Add', {
            itemName: item.content,
            itemDescription: item.description,
            itemImage: [item.image],
            itemCategory: null,
            itemCategoryName: '',
            taggedUser: username,
            taggedUserId: item.user_id,
            itemId: item.id 
          })}>
          <Ionicons name="add-circle" size={30} color="grey" />
        </TouchableOpacity>
        {/*<TouchableOpacity
          onPress={() => navigation.navigate('Add', {
            itemName: item.content,
            itemDescription: item.description,
            itemImage: [item.image],
            itemCategory: null,
            itemCategoryName: '',
            taggedUser: username,
            taggedUserId: item.user_id,
            itemId: item.id 
          })}
        >
          <Ionicons style={{}} name="bookmark" size={30} color="grey" />
        </TouchableOpacity> */}
      </View>
      {showComments && (
        loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center'}}>
            <ActivityIndicator size="large" color={isDarkMode ? darkTheme?.textPrimary : 'black'} />
          </View>
        ) : (
          <FlatList
            data={profileList}
            horizontal
            keyExtractor={(item, index) => item.key ? item.key.toString() : index.toString()}
            renderItem={({ item, index }) => {
              const roundedScore = compareUserRating[index].toFixed(1);
              const backgroundColor = getScoreColorHSL(parseFloat(roundedScore));
              
              return (
                <View style={{ alignItems: 'center', marginRight: 9.5, marginLeft: 9.5, marginTop: 10 }}>
                  <Image
                    source={item.profile_pic ? { uri: item.profile_pic } : { uri: 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png' }} 
                    style={{ height: 47.5, width: 47.5, borderWidth: 0.5, borderRadius: 23.75, borderColor: 'lightgrey' }}
                  />
                    <Text 
                      style={{ marginTop: 5, textAlign: 'center', maxWidth: 50 }} // Adjust maxWidth as necessary
                      numberOfLines={1} 
                      ellipsizeMode="tail"
                    >
                    {item.name}
                  </Text>
                  <View style={{ 
                    position: 'absolute', 
                    right: -5, 
                    top: -5, 
                    backgroundColor, 
                    borderRadius: 15, 
                    width: 30, 
                    height: 30, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    borderWidth: 1, 
                    borderColor: 'white' 
                  }}>
                    <Text style={{ color: 'white', fontSize: 12 }}>{roundedScore}</Text>
                  </View>
                </View>
              );
            }}
            showsHorizontalScrollIndicator={false}
          />
        )
      )}
      </>
    </View>
    )}

    {showComments && (
      <View style={{ paddingHorizontal: 15 }}>
        {/* Render your comments section here */}
        <View style={{
          flexDirection: 'row',
          marginTop: 15,
          paddingHorizontal: 10,
          borderWidth: 0.5,
          borderColor: isDarkMode ? darkTheme?.border : 'lightgrey',
          borderRadius: 25,
          alignItems: 'center', // Aligns the TextInput and the icon vertically
          marginBottom: 10,
          paddingTop: 7,
          paddingBottom: 10
        }}>
          <TextInput
            placeholder={`Add a comment for ${username}...`}
            placeholderTextColor={isDarkMode ? darkTheme?.textSecondary : 'gray'}
            style={{
              flex: 1, // Takes up the maximum space leaving the icon on the far side
              paddingHorizontal: 10, // Optional: Adds some space between the icon and the text input
              fontSize: 15,
              color: isDarkMode ? darkTheme?.textPrimary : 'black'
            }}
            value={newComment} // Binds the text input to your state
            onChangeText={text => setNewComment(text)} // Updates state upon every keystroke
            onFocus={() => setCommentTypingMode(true)}
            onBlur={() => setCommentTypingMode(false)}
            multiline={true}
          />
          <TouchableOpacity onPress={() => newComment.length > 0 && onNewCommentSubmit(item)}>
            <Ionicons name="send" size={24} color={isDarkMode ? darkTheme?.textPrimary : 'black'} />
          </TouchableOpacity>
        </View>
        {memoizedComments}
      </View>
    )}

      </View>
    </TouchableWithoutFeedback>
    </ScrollView>


    </View>
  );
});

export default NormalItemTile;