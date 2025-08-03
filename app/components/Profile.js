import React, { useMemo, useRef } from 'react';
import { View, Alert, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ScrollView, ActivityIndicator, Share, Platform, Dimensions, TextInput, TouchableWithoutFeedback, Keyboard, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Image as ReactImage } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage
import { useFonts } from 'expo-font';
// import profilePic from '../../assets/images/lebron_profile_pic.webp';
import { sendPasswordResetEmail, getAuth } from "firebase/auth";
import { database, storage } from '../../firebaseConfig';
import { ref, set, onValue, off, push, query, equalTo, orderByChild, get, remove, update, getDatabase } from "firebase/database"; // Import 'ref' and 'set' from the database package
import { useEffect, useState } from 'react';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import CategoryList from './CategoryList';
import EditProfile from './EditProfile';
import AddCategory from './AddCategory';
import AsyncStorage from '@react-native-async-storage/async-storage';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Hyperlink from 'react-native-hyperlink';
import FollowUsers from './FollowUsers';
import CategoryTile from './CategoryTile';
import Settings from './Settings';
import NormalItemTile from './NormalItemTile';

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
  profilePic: {
    width: 100,        // Specify the width
    height: 100,       // Specify the height
    borderRadius: 50,  // Make sure this is half of the width and height
    borderWidth: 0.5, 
    borderColor: 'lightgrey'
  },
  grid: {
    width: '100%',
    paddingHorizontal: 0,
  },
  tileText: {
    // existing text styles...
    color: 'white', // Ensure text is visible on likely darker images
    padding: 8, // Add padding to separate text from the edges
    fontWeight: 'bold',
    fontSize: 15
  },
  editButtons: {
    fontWeight: 'bold',
  },
  editContainer: {
    backgroundColor: 'lightgrey',
    padding: 8,
    fontSize: 13,
    width: '44%',
    borderRadius: 10,
    alignItems: 'center',
  },
  shareContainer: {
    backgroundColor: '#33c1ff',
    padding: 4,
    fontSize: 8,
    width: '10%',
    borderRadius: 10,
    alignItems: 'center',
  },
});

// Memoized header component to prevent flickering
const ProfileHeader = React.memo(({ 
  profileInfo, 
  isDarkMode, 
  darkTheme, 
  visitingUserId, 
  setShowSettings, 
  setFeedView, 
  setFocusedCategory, 
  setActiveTab, 
  activeTab, 
  shareLink, 
  followUser,
  unfollowUser,
  isFollowing,
  styles 
}) => (
  <>
    {!visitingUserId ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20, paddingTop: 10 }}>
        <Text style={{ color: isDarkMode ? darkTheme.textPrimary : 'black', fontSize: 24, fontFamily: 'Poppins Regular' }}>ambora\social</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={{ marginLeft: 'auto' }}>
          <Ionicons name="settings-outline" size={25} color={isDarkMode ? darkTheme.textPrimary : 'black'} />
        </TouchableOpacity>
      </View>
    ) : (
      <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: isDarkMode ? darkTheme.border : 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => setFeedView(null)}>
          <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme.textPrimary : 'black'} />
        </TouchableOpacity>
      </View>
    )}

    <View style={{ flexDirection: 'row', padding: 15 }}>
      {profileInfo.profile_pic ? (
        <Image source={{ uri: profileInfo.profile_pic }} style={[styles.profilePic, { borderColor: isDarkMode ? darkTheme.border : 'lightgrey' }]} />
      ) : (
        <Image source={"https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png"} style={[styles.profilePic, { borderColor: isDarkMode ? darkTheme.border : 'lightgrey' }]} />
      )}
      <View>
        <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
          <Text style={{ marginLeft: 10, fontSize: 20, fontWeight: 'bold', fontFamily: 'Poppins Bold', marginRight: 10, color: isDarkMode ? darkTheme.textPrimary : 'black' }}>
            {profileInfo.name}
          </Text>
          {profileInfo.user_type === 'verified' && <MaterialIcons name="verified" size={20} color={darkTheme.accent} />}
        </View>
        <Text style={{ marginLeft: 10, fontSize: 16, marginTop: 0, fontWeight: 'bold', color: isDarkMode ? darkTheme.textSecondary : 'grey' }}>@{profileInfo.username}</Text>

        <View style={{ flexDirection: 'row', marginLeft: 10, marginTop: 15 }}>
          <TouchableOpacity onPress={() => profileInfo.followers && setFocusedCategory('Followers')}>
            <Text style={{ marginRight: 30, fontWeight: 'bold', color: isDarkMode ? darkTheme.textPrimary : 'black' }}>{profileInfo.followers ? Object.keys(profileInfo.followers).length : 0} Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => profileInfo.following && setFocusedCategory('Following')}>
            <Text style={{ fontWeight: 'bold', color: isDarkMode ? darkTheme.textPrimary : 'black' }}>{profileInfo.following ? Object.keys(profileInfo.following).length : 0} Following</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>

    <Hyperlink linkDefault={true} linkStyle={{ color: darkTheme.accent, textDecorationLine: 'underline' }} onPress={(url, text) => Linking.openURL(url)}>
      <Text style={{ paddingHorizontal: 15, marginBottom: 20, color: isDarkMode ? darkTheme.textPrimary : 'black' }}>{profileInfo.bio}</Text>
    </Hyperlink>

    {!visitingUserId ? (
      <View style={{ paddingHorizontal: 15, paddingBottom: 20, borderColor: isDarkMode ? darkTheme.border : 'lightgrey', borderBottomWidth: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity style={[styles.editContainer, { backgroundColor: isDarkMode ? darkTheme.buttonSecondary : 'lightgrey' }]} onPress={() => setFocusedCategory('editProfile')}>
            <Text style={[styles.editButtons, { color: isDarkMode ? darkTheme.buttonSecondaryText : 'black' }]}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.editContainer, { backgroundColor: isDarkMode ? darkTheme.buttonSecondary : 'lightgrey' }]} onPress={() => setFocusedCategory('Add List Page')}>
            <Text style={[styles.editButtons, { color: isDarkMode ? darkTheme.buttonSecondaryText : 'black' }]}>Add List</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={shareLink} style={[styles.shareContainer, { backgroundColor: darkTheme.accent }]}>
              <Ionicons name="person-add-sharp" size={17} color="white" style={{ marginTop: 3 }} />
          </TouchableOpacity>
        </View>
        
        {/* Tab Buttons */}
        <View style={{ flexDirection: 'row', marginTop: 10, paddingHorizontal: 15 }}>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              paddingVertical: 8, 
              backgroundColor: 'transparent',
              marginRight: 8,
              alignItems: 'center',
              justifyContent: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : 'transparent'
            }} 
            onPress={() => setActiveTab('recent')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 14, 
                marginRight: 6,
                color: activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666'),
                fontWeight: activeTab === 'recent' ? 'bold' : 'normal'
              }}>
                Recent
              </Text>
              <Ionicons 
                name="time-outline" 
                size={18} 
                color={activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666')} 
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              paddingVertical: 8, 
              backgroundColor: 'transparent',
              marginLeft: 8,
              alignItems: 'center',
              justifyContent: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : 'transparent'
            }} 
            onPress={() => setActiveTab('lists')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 14, 
                marginRight: 6,
                color: activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666'),
                fontWeight: activeTab === 'lists' ? 'bold' : 'normal'
              }}>
                Lists
              </Text>
              <Ionicons 
                name="grid-outline" 
                size={18} 
                color={activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666')} 
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <View style={{ paddingHorizontal: 15, paddingBottom: 20, borderColor: isDarkMode ? darkTheme.border : 'lightgrey', borderBottomWidth: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {isFollowing ? (
            <TouchableOpacity style={[styles.editContainer, { backgroundColor: isDarkMode ? darkTheme.buttonSecondary : 'lightgrey' }]} onPress={() => unfollowUser()}>
              <Text style={[styles.editButtons, { color: isDarkMode ? darkTheme.buttonSecondaryText : 'black' }]}>Unfollow</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.editContainer, { backgroundColor: isDarkMode ? darkTheme.buttonSecondary : 'lightgrey' }]} onPress={() => followUser()}>
              <Text style={[styles.editButtons, { color: isDarkMode ? darkTheme.buttonSecondaryText : 'black' }]}>Follow</Text>
            </TouchableOpacity>
          )}
        </View>
      
        {/* Tab Buttons */}
        <View style={{ flexDirection: 'row', marginTop: 15, paddingHorizontal: 15 }}>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              paddingVertical: 8, 
              backgroundColor: 'transparent',
              marginRight: 8,
              alignItems: 'center',
              justifyContent: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : 'transparent'
            }} 
            onPress={() => setActiveTab('recent')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 14, 
                marginRight: 6,
                color: activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666'),
                fontWeight: activeTab === 'recent' ? 'bold' : 'normal'
              }}>
                Recent
              </Text>
              <Ionicons 
                name="time-outline" 
                size={18} 
                color={activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666')} 
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              paddingVertical: 8, 
              backgroundColor: 'transparent',
              marginLeft: 8,
              alignItems: 'center',
              justifyContent: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : 'transparent'
            }} 
            onPress={() => setActiveTab('lists')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 14, 
                marginRight: 6,
                color: activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666'),
                fontWeight: activeTab === 'lists' ? 'bold' : 'normal'
              }}>
                Lists
              </Text>
              <Ionicons 
                name="grid-outline" 
                size={18} 
                color={activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666')} 
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    )}
  </>
));

const Profile = ({ route, navigation }) => {
  const { userKey, setView, fetchUserData, visitingUserId, setFeedView, onDarkModeChange } = route.params;

  const [profileInfo, setProfileInfo] = useState({});
  const [categories, setCategories] = useState({});
  const [focusedCategory, setFocusedCategory] = useState(null);
  const [focusedCategoryId, setFocusedCategoryId] = useState(null);
  const [focusedList, setFocusedList] = useState({'now': [], 'later': []});
  const [addCategoryName, setAddCategoryName] = useState('');
  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadImage, setDownloadImage] = useState(null);
  const [refreshed, setRefreshed] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [numItems, setNumItems] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('recent');
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Start with light mode
  const [itemInfo, setItemInfo] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  const [currentScrollPosition, setCurrentScrollPosition] = useState(0);
  const flatListRef = useRef(null);
  
  // Animation states
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (onDarkModeChange) {
      onDarkModeChange(newDarkMode);
    }
  };

  // Sync dark mode state with parent
  useEffect(() => {
    if (onDarkModeChange) {
      onDarkModeChange(isDarkMode);
    }
  }, [isDarkMode]);

  // Load dark mode preference from storage
  useEffect(() => {
    const loadDarkModePreference = async () => {
      try {
        const savedDarkMode = await AsyncStorage.getItem('darkMode');
        if (savedDarkMode !== null) {
          const isDark = JSON.parse(savedDarkMode);
          setIsDarkMode(isDark);
          if (onDarkModeChange) {
            onDarkModeChange(isDark);
          }
        }
      } catch (error) {
        console.error('Error loading dark mode preference:', error);
      }
    };
    loadDarkModePreference();
  }, []);

  // Save dark mode preference to storage
  useEffect(() => {
    const saveDarkModePreference = async () => {
      try {
        await AsyncStorage.setItem('darkMode', JSON.stringify(isDarkMode));
      } catch (error) {
        console.error('Error saving dark mode preference:', error);
      }
    };
    saveDarkModePreference();
  }, [isDarkMode]);

  const getUserInfo = () => {
    const userRef = ref(database, 'users/' + userKey);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setIsFollowing(snapshot.val().followers && snapshot.val().followers.hasOwnProperty(visitingUserId));
        setProfileInfo(snapshot.val());
      } else {
        console.log("No user data.");
      }
    }).catch((error) => {
      console.error(error);
    });
  }

  useEffect(() => {
    const categoriesRef = ref(database, 'categories');
    const userCategoriesQuery = query(categoriesRef, orderByChild('user_id'), equalTo(userKey));
    // Execute the query and listen for updates
    onValue(userCategoriesQuery, (snapshot) => {
      const categories = [];

      snapshot.forEach((childSnapshot) => {
        // childSnapshot.key will contain the unique key of each category
        const categoryKey = childSnapshot.key;
        const categoryData = childSnapshot.val();

        categories.push({ id: categoryKey, ...categoryData });
      });

      setCategories(categories.sort((a, b) => b.latest_add - a.latest_add));
    });

    getUserInfo();
    
    // Force layout refresh on iOS to handle system UI initialization
    if (Platform.OS === 'ios') {
      const timer = setTimeout(() => {
        setLayoutReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setLayoutReady(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'recent' && userPosts.length === 0 && !loadingPosts) {
      getUserPosts();
    }
  }, [activeTab]);

  const onCategoryPress = (category_name, category_id, num_items) => {
    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(category_id));

    get(categoryItemsQuery).then((snapshot) => {
      let tempFocusedList = {'now': [], 'later': []};
      if (snapshot.exists()) {
        for (const [key, value] of Object.entries(snapshot.val())) {
          if (value.bucket === 'later') {
            tempFocusedList['later'].push([key, value]);
          } else {
            tempFocusedList['now'].push([key, value]);
          }
        }
        tempFocusedList['now'].sort((a, b) => b[1].score - a[1].score);
      }
      setFocusedList(tempFocusedList);
      setFocusedCategory(category_name);
      setFocusedCategoryId(category_id);
      setNumItems(num_items);
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });
  }

  const shareLink = () => {
    Share.share({
      message: 'Follow these steps and rank with me on ambora/social!',
      url: 'https://testflight.apple.com/join/6VpEA1gh',
    })
    .then((result) => {
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared with activity type: ', result.activityType);
        } else {
          console.log('Shared');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Dismissed');
      }
    })
    .catch((error) => console.error('Error sharing:', error));
  };

  const onBackPress = () => {
    setFocusedList(null);
    setFocusedCategory(null);
    setFocusedCategoryId(null);
  }

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // ~ may need to change to just pictures
      allowsEditing: true,
      aspect: [4,3], // search up
      quality: 1,
    });
    setImageUri(result.assets[0].uri);
  }; 



  const followUser = async () => {
    // THIS IS TO VERIFY USERS
    // const userRef1 = ref(database, 'users/' + userKey);
    // update(userRef1, {
    //   user_type: 'verified'
    // })

    //THIS IS TO GET PASSWORD BACK
    // const auth = getAuth();
    // const database = getDatabase();
    // const emailVal = "EMAIL";
    // sendPasswordResetEmail(auth, emailVal).then(() => {
    //   alert("Check your email for password reset");
    //   console.log("Password reset email sent");
    // }).catch(err => {
    //   alert("Error sending password reset email: " + err.message);
    // });
    
    const followersRef = ref(database, 'users/' + userKey + '/followers/' + visitingUserId);
    set(followersRef, {
      closeFriend: false
    })
    const followingRef = ref(database, 'users/' + visitingUserId + '/following/' + userKey);
    set(followingRef, {
      closeFriend: false
    })

    const eventsRef = push(ref(database, 'events/' + userKey));
    set(eventsRef, {
      evokerId: visitingUserId,
      content: 'followed you!',
      timestamp: Date.now()
    })

    console.log(userKey)
    const userRef = ref(database, 'users/' + userKey);
    update(userRef, {
      unreadNotifications: true
    })

    getUserInfo();
  }

  const unfollowUser = async () => {
    const followersRef = ref(database, 'users/' + userKey + '/followers/' + visitingUserId);
    remove(followersRef);
    const followingRef = ref(database, 'users/' + visitingUserId + '/following/' + userKey);
    remove(followingRef);
    getUserInfo();
  }

  const refreshProfile = () => {
    setRefreshed(true);
    getUserInfo();
    if (activeTab === 'recent') {
      getUserPosts();
    }
    setRefreshed(false);
  }

  // Create memoized header component
  const memoizedHeader = useMemo(() => (
    <ProfileHeader
      profileInfo={profileInfo}
      isDarkMode={isDarkMode}
      darkTheme={darkTheme}
      visitingUserId={visitingUserId}
      setShowSettings={setShowSettings}
      setFeedView={setFeedView}
      setFocusedCategory={setFocusedCategory}
      setActiveTab={setActiveTab}
      activeTab={activeTab}
      shareLink={shareLink}
      followUser={followUser}
      unfollowUser={unfollowUser}
      isFollowing={isFollowing}
      styles={styles}
    />
  ), [profileInfo, isDarkMode, visitingUserId, activeTab, isFollowing]);

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
          toValue: Dimensions.get('window').height,
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

  const getUserPosts = () => {
    try {
      setLoadingPosts(true);
      const itemsRef = ref(database, 'items');
      
      get(itemsRef).then((snapshot) => {
        try {
          if (snapshot.exists()) {
            const posts = [];
            snapshot.forEach((childSnapshot) => {
              const postKey = childSnapshot.key;
              const postData = childSnapshot.val();
              // Only include posts from the current user
              if (postData.user_id === userKey) {
                posts.push({ key: postKey, ...postData });
              }
            });
            setUserPosts(posts.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30));
          } else {
            setUserPosts([]);
          }
        } catch (error) {
          console.error('Error processing posts:', error);
          setUserPosts([]);
        } finally {
          setLoadingPosts(false);
        }
      }).catch((error) => {
        console.error('Error fetching posts:', error);
        setUserPosts([]);
        setLoadingPosts(false);
      });
    } catch (error) {
      console.error('Error setting up posts query:', error);
      setUserPosts([]);
      setLoadingPosts(false);
    }
  };

  if (focusedCategory === 'Followers') {
    return <FollowUsers 
      userIds={Object.keys(profileInfo.followers)} 
      setFocusedCategory={setFocusedCategory}
      focusedCategory={'Followers'}
      username={profileInfo.username}
      userKey={userKey}
      visitingUserId={visitingUserId}
      navigation={navigation}
    />
  }

  if (focusedCategory === 'Following') {
    return <FollowUsers 
      userIds={profileInfo.following ? Object.keys(profileInfo.following) : []} 
      setFocusedCategory={setFocusedCategory}
      focusedCategory={'Following'}
      username={profileInfo.username}
      userKey={userKey}
      visitingUserId={visitingUserId}
      navigation={navigation}
          />
    }


  
    return (
    <>
      {showSettings ? (
        <Settings 
          onBackPress={() => setShowSettings(false)} 
          fetchUserData={fetchUserData} 
          setView={setView}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      ) : focusedCategory === 'editProfile' ? (
        <EditProfile userKey={userKey} onBackPress={() => onBackPress()} getUserInfo={() => getUserInfo()} />
      ) : focusedCategory === 'Add List Page' ? (
        <>
          <View style={{ flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderColor: 'lightgrey', backgroundColor: 'white' }}>
            <TouchableOpacity onPress={() => onBackPress()}>
              <Ionicons name="arrow-back" size={30} color="black" />
            </TouchableOpacity>
            <Text style={{ marginLeft: 'auto', marginRight: 10, fontSize: 15, fontWeight: 'bold' }}> </Text>
          </View>

          <AddCategory 
            onBackPress={() => onBackPress()} 
            userKey={userKey} 
            isDarkMode={isDarkMode}
            darkTheme={darkTheme}
          />
        </>
      ) : focusedCategoryId ? (
        <CategoryList
          focusedCategory={focusedCategory}
          focusedList={focusedList}
          focusedCategoryId={focusedCategoryId}
          numItems={numItems}
          onBackPress={() => onBackPress()}
          isMyProfile={visitingUserId ? visitingUserId === userKey : true}
          visitingUserId={visitingUserId || userKey}
          userKey={userKey}
          navigation={navigation}
          isDarkMode={isDarkMode}
          darkTheme={darkTheme}
        />
      ) : (
        <View style={{ 
          flex: 1, 
          backgroundColor: isDarkMode ? darkTheme.background : 'white'
        }}>
          {!layoutReady ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? darkTheme.background : 'white' }}>
              <ActivityIndicator size="large" color={isDarkMode ? darkTheme.textPrimary : 'black'} />
            </View>
          ) : (
            <>
              {scrollY < -110 && (
                <View style={{position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1000,}}>
                  <ActivityIndicator size="large" color={isDarkMode ? darkTheme.textPrimary : 'black'} />
                </View>
              )}
              
              {activeTab === 'recent' ? (
            <FlatList
              ref={flatListRef}
              style={{ backgroundColor: isDarkMode ? darkTheme.background : 'white' }}
              data={userPosts}
              renderItem={({ item }) => (
                <NormalItemTile 
                  item={item} 
                  userKey={userKey} 
                  setFeedView={setFeedView || (() => {})} 
                  navigation={navigation} 
                  visitingUserId={userKey} 
                  setItemInfo={setItemInfo} 
                  topPostsTime={null}
                  individualSpotifyAccessToken={null} 
                  promptAsync={() => {}}
                  setIndex={() => {}}
                  setFocusedItemDescription={() => {}}
                  isDarkMode={isDarkMode}
                  darkTheme={darkTheme}
                  currentProfileUserKey={userKey}
                />
              )}
              keyExtractor={(item) => item.key || item.id}
              ListHeaderComponent={memoizedHeader}
              ListEmptyComponent={() => (
                loadingPosts ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
                    <ActivityIndicator size="large" color={isDarkMode ? darkTheme.textPrimary : 'black'} />
                  </View>
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
                    <Text style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: isDarkMode ? darkTheme.textSecondary : 'lightgray' }}>
                      No posts yet
                    </Text>
                  </View>
                )
              )}
              onScroll={(event) => {
                const y = event.nativeEvent.contentOffset.y;
                setScrollY(y);
                setCurrentScrollPosition(y);
                // Save scroll position for restoration, but only when comments overlay is not active
                if (y > 0 && itemInfo === null) {
                  setSavedScrollPosition(y);
                }
                if (y < -110 && !refreshed) {
                  refreshProfile();
                }
              }}
              scrollEventThrottle={1}
              showsVerticalScrollIndicator={true}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              windowSize={10}
              initialNumToRender={3}
            />
          ) : (
            <ScrollView
              style={{ backgroundColor: isDarkMode ? darkTheme.background : 'white' }}
              onScroll={(event) => {
                const y = event.nativeEvent.contentOffset.y;
                setScrollY(y);
                if (y < -110 && !refreshed) {
                  refreshProfile();
                }
              }}
              scrollEventThrottle={1}
            >
            {!visitingUserId ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20, paddingTop: 10 }}>
                <Text style={{ color: isDarkMode ? darkTheme.textPrimary : 'black', fontSize: 24, fontFamily: 'Poppins Regular' }}>ambora\social</Text>
                <TouchableOpacity onPress={() => setShowSettings(true)} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="settings-outline" size={25} color={isDarkMode ? darkTheme.textPrimary : 'black'} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: isDarkMode ? darkTheme.border : 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setFeedView(null)}>
                  <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme.textPrimary : 'black'} />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', padding: 15 }}>
              {profileInfo.profile_pic ? (
                <Image source={{ uri: profileInfo.profile_pic }} style={[styles.profilePic, { borderColor: isDarkMode ? darkTheme.border : 'lightgrey' }]} />
              ) : (
                <Image source={"https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png"} style={[styles.profilePic, { borderColor: isDarkMode ? darkTheme.border : 'lightgrey' }]} />
              )}
              <View>
                <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ marginLeft: 10, fontSize: 20, fontWeight: 'bold', fontFamily: 'Poppins Bold', marginRight: 10, color: isDarkMode ? darkTheme.textPrimary : 'black' }}>
                    {profileInfo.name}
                  </Text>
                  {profileInfo.user_type === 'verified' && <MaterialIcons name="verified" size={20} color={darkTheme.accent} />}
                </View>
                <Text style={{ marginLeft: 10, fontSize: 16, marginTop: 0, fontWeight: 'bold', color: isDarkMode ? darkTheme.textSecondary : 'grey' }}>@{profileInfo.username}</Text>

                <View style={{ flexDirection: 'row', marginLeft: 10, marginTop: 15 }}>
                  <TouchableOpacity onPress={() => profileInfo.followers && setFocusedCategory('Followers')}>
                    <Text style={{ marginRight: 30, fontWeight: 'bold', color: isDarkMode ? darkTheme.textPrimary : 'black' }}>{profileInfo.followers ? Object.keys(profileInfo.followers).length : 0} Followers</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => profileInfo.following && setFocusedCategory('Following')}>
                    <Text style={{ fontWeight: 'bold', color: isDarkMode ? darkTheme.textPrimary : 'black' }}>{profileInfo.following ? Object.keys(profileInfo.following).length : 0} Following</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Hyperlink linkDefault={true} linkStyle={{ color: darkTheme.accent, textDecorationLine: 'underline' }} onPress={(url, text) => Linking.openURL(url)}>
              <Text style={{ paddingHorizontal: 15, marginBottom: 20, color: isDarkMode ? darkTheme.textPrimary : 'black' }}>{profileInfo.bio}</Text>
            </Hyperlink>

            {!visitingUserId ? (
              <View style={{ paddingHorizontal: 15, paddingBottom: 20, borderColor: isDarkMode ? darkTheme.border : 'lightgrey', borderBottomWidth: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity style={[styles.editContainer, { backgroundColor: isDarkMode ? darkTheme.buttonSecondary : 'lightgrey' }]} onPress={() => setFocusedCategory('editProfile')}>
                    <Text style={[styles.editButtons, { color: isDarkMode ? darkTheme.buttonSecondaryText : 'black' }]}>Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.editContainer, { backgroundColor: isDarkMode ? darkTheme.buttonSecondary : 'lightgrey' }]} onPress={() => setFocusedCategory('Add List Page')}>
                    <Text style={[styles.editButtons, { color: isDarkMode ? darkTheme.buttonSecondaryText : 'black' }]}>Add List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={shareLink} style={[styles.shareContainer, { backgroundColor: darkTheme.accent }]}>
                      <Ionicons name="person-add-sharp" size={17} color="white" style={{ marginTop: 3 }} />
                  </TouchableOpacity>
                </View>
                
                                  {/* Tab Buttons */}
                  <View style={{ flexDirection: 'row', marginTop: 10, paddingHorizontal: 15 }}>
                    <TouchableOpacity 
                      style={{ 
                        flex: 1, 
                        paddingVertical: 8, 
                        backgroundColor: 'transparent',
                        marginRight: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottomWidth: 2,
                        borderBottomColor: activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : 'transparent'
                      }} 
                      onPress={() => setActiveTab('recent')}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ 
                          fontSize: 14, 
                          marginRight: 6,
                          color: activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666'),
                          fontWeight: activeTab === 'recent' ? 'bold' : 'normal'
                        }}>
                          Recent
                        </Text>
                        <Ionicons 
                          name="time-outline" 
                          size={18} 
                          color={activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666')} 
                        />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ 
                        flex: 1, 
                        paddingVertical: 8, 
                        backgroundColor: 'transparent',
                        marginLeft: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottomWidth: 2,
                        borderBottomColor: activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : 'transparent'
                      }} 
                      onPress={() => setActiveTab('lists')}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ 
                          fontSize: 14, 
                          marginRight: 6,
                          color: activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666'),
                          fontWeight: activeTab === 'lists' ? 'bold' : 'normal'
                        }}>
                          Lists
                        </Text>
                        <Ionicons 
                          name="grid-outline" 
                          size={18} 
                          color={activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666')} 
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
              </View>
                          ) : (
                <View style={{ paddingHorizontal: 15, paddingBottom: 20, borderColor: isDarkMode ? darkTheme.border : 'lightgrey', borderBottomWidth: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                    {isFollowing ? (
                      <TouchableOpacity style={[styles.editContainer, { backgroundColor: isDarkMode ? darkTheme.buttonSecondary : 'lightgrey' }]} onPress={() => unfollowUser()}>
                        <Text style={[styles.editButtons, { color: isDarkMode ? darkTheme.buttonSecondaryText : 'black' }]}>Unfollow</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.editContainer, { backgroundColor: isDarkMode ? darkTheme.buttonSecondary : 'lightgrey' }]} onPress={() => followUser()}>
                        <Text style={[styles.editButtons, { color: isDarkMode ? darkTheme.buttonSecondaryText : 'black' }]}>Follow</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                
                                  {/* Tab Buttons */}
                  <View style={{ flexDirection: 'row', marginTop: 15, paddingHorizontal: 15 }}>
                    <TouchableOpacity 
                      style={{ 
                        flex: 1, 
                        paddingVertical: 8, 
                        backgroundColor: 'transparent',
                        marginRight: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottomWidth: 2,
                        borderBottomColor: activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : 'transparent'
                      }} 
                      onPress={() => setActiveTab('recent')}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ 
                          fontSize: 14, 
                          marginRight: 6,
                          color: activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666'),
                          fontWeight: activeTab === 'recent' ? 'bold' : 'normal'
                        }}>
                          Recent
                        </Text>
                        <Ionicons 
                          name="time-outline" 
                          size={18} 
                          color={activeTab === 'recent' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666')} 
                        />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ 
                        flex: 1, 
                        paddingVertical: 8, 
                        backgroundColor: 'transparent',
                        marginLeft: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottomWidth: 2,
                        borderBottomColor: activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : 'transparent'
                      }} 
                      onPress={() => setActiveTab('lists')}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ 
                          fontSize: 14, 
                          marginRight: 6,
                          color: activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666'),
                          fontWeight: activeTab === 'lists' ? 'bold' : 'normal'
                        }}>
                          Lists
                        </Text>
                        <Ionicons 
                          name="grid-outline" 
                          size={18} 
                          color={activeTab === 'lists' ? (isDarkMode ? darkTheme.textPrimary : 'black') : (isDarkMode ? darkTheme.textSecondary : '#666')} 
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
              </View>
            )}

              {/* Lists Tab Content */}
              <View style={{ paddingTop: 5 }}>
                {categories.length > 0 ? (
                  <FlatList
                    data={categories}
                    renderItem={({ item }) => (
                      <CategoryTile
                        category_name={item.category_name}
                        imageUri={item.imageUri}
                        num_items={item.num_items}
                        onCategoryPress={() => onCategoryPress(item.category_name, item.id, item.num_items)}
                      />
                    )}
                    scrollEnabled={false}
                    numColumns={3}
                    contentContainerStyle={styles.grid}
                    columnWrapperStyle={{ width: '100%' }}
                    showsVerticalScrollIndicator={false}
                  />
                ) : (
                  <Text style={{ textAlign: 'center', marginTop: '20%', fontWeight: 'bold', fontSize: 16, color: isDarkMode ? darkTheme.textSecondary : 'lightgray' }}>
                    {visitingUserId ? 'No lists yet' : 'add a list to get started...'}
                  </Text>
                )}
              </View>
            </ScrollView>
          )}
            </>
          )}
        </View>
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
    </>
  );
};

export default Profile;