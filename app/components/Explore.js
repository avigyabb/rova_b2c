import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Keyboard, TouchableWithoutFeedback, FlatList, TouchableOpacity, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get, push, set } from "firebase/database";
import { Image } from 'expo-image';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Profile from './Profile';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import ExploreItemTile from './ExploreComponents/ExploreItemTile';
import MovieDetailTile from './ExploreComponents/MovieDetailTile';
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

const Explore = ({ route, navigation, isDarkMode=false, darkTheme=null }) => {
  const { userKey } = route.params;
  const [userListData, setUserListData] = useState([]);
  const [searchVal, setSearchVal] = useState(''); // ~ why does this work
  const [exploreView, setExploreView] = useState('Home');
  const [previousView, setPreviousView] = useState(null); // Track previous view for navigation
  const [topMovies, setTopMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsInCategory, setItemsInCategory] = useState(new Set());
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieSearchVal, setMovieSearchVal] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState('default'); // 'default', 'rankings', 'alphabetical', 'rating'
  const [randomPosts, setRandomPosts] = useState([]);
  const [randomLoading, setRandomLoading] = useState(false);
  const [itemInfo, setItemInfo] = useState(null);
  
  // Debug setItemInfo function
  const debugSetItemInfo = (item) => {
    console.log('debugSetItemInfo called with:', item);
    setItemInfo(item);
  };

  // Custom navigation function to preserve current view when going to profile
  const navigateToProfile = (userKey, username) => {
    setPreviousView(exploreView); // Save current view
    setExploreView({ userKey, username });
  };

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
        toValue: Dimensions.get('window').height,
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

  const [shouldFocusSearch, setShouldFocusSearch] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  const [currentScrollPosition, setCurrentScrollPosition] = useState(0);
  const [randomPostsScrollPosition, setRandomPostsScrollPosition] = useState(0);
  const flatListRef = useRef(null);
  
  // Animation states
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Past Rankings states
  const [pastRankingsInfo, setPastRankingsInfo] = useState(null);
  const [pastRankingsSlideAnim] = useState(new Animated.Value(Dimensions.get('window').height));
  const [pastRankingsOverlayOpacity] = useState(new Animated.Value(0));

  const fetchTopMovies = async () => {
    if (topMovies.length > 0) {
      return;
    }
    setLoading(true);
    const promises = [];
    const items = {};
    const itemsRef = ref(database, 'items');

    const snapshot = await get(itemsRef);
    if (snapshot.exists()) {
      
      snapshot.forEach((childSnapshot) => {
        const categoryRef = ref(database, 'categories/' + childSnapshot.val().category_id);
        const promise = get(categoryRef).then((categorySnapshot) => {
          if (categorySnapshot.exists()) {
            if (categorySnapshot.val().category_type === 'Movies') {
              const itemId = childSnapshot.val().image;
              if (childSnapshot.val().content === 'Dune: Part Two') {
                console.log(childSnapshot.val());
              }
              if (itemId in items) {
                items[itemId].score += childSnapshot.val().score;
                items[itemId].num_items += 1;
                items[itemId].name = childSnapshot.val().content;
              } else {
                items[itemId] = { 
                  score: childSnapshot.val().score, 
                  num_items: 1, 
                  name: childSnapshot.val().content 
                };
              }
            }
          }
        });
        promises.push(promise);
      });

      // Wait for all category fetch promises to complete
      await Promise.all(promises);

      // Convert items object to an array
      const itemsArray = Object.keys(items).map((key) => ({
        image: key,
        ...items[key]
      }))
      .filter(item => item.num_items > 1);  // Filter items with num_items > 1

      // Calculate weighted ratings using IMDb formula
      const weightedMovies = calculateWeightedRatings(itemsArray);

      // Sort by weighted rating in decreasing order
      weightedMovies.sort((a, b) => b.weightedRating - a.weightedRating);

      // Update the state
      setTopMovies(weightedMovies);
      setLoading(false);
    }
  };

  const calculateWeightedRatings = (movies) => {
    if (movies.length === 0) return movies;

  
    const totalScore = movies.reduce((sum, movie) => sum + movie.score, 0);
    const totalRatings = movies.reduce((sum, movie) => sum + movie.num_items, 0);
    const C = totalScore / totalRatings;

    const m = 10;

   
    return movies.map(movie => {
      const R = movie.score / movie.num_items; 
      const v = movie.num_items; 
      
      // IMDb formula: WR = (v / (v + m)) * R + (m / (v + m)) * C
      const weightedRating = (v / (v + m)) * R + (m / (v + m)) * C;
      
      return {
        ...movie,
        weightedRating: weightedRating,
        averageRating: R,
        globalAverage: C
      };
    });
  };

  const getSortedMovies = (movies) => {
    const filteredMovies = movies.filter(movie => 
      movie.name.toLowerCase().includes(movieSearchVal.toLowerCase())
    );

    // Create a map of original indices for ranking numbers
    const originalIndices = {};
    topMovies.forEach((movie, index) => {
      originalIndices[movie.name] = index;
    });

    let sortedMovies;
    switch (sortBy) {
      case 'default':
        sortedMovies = filteredMovies; // Original order from fetchTopMovies
        break;
      case 'rankings':
        sortedMovies = filteredMovies.sort((a, b) => b.num_items - a.num_items); // Sort by number of rankings (most first)
        break;
      case 'alphabetical':
        sortedMovies = filteredMovies.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rating':
        sortedMovies = filteredMovies.sort((a, b) => a.weightedRating - b.weightedRating); // Sort by rating (lowest first)
        break;
      default:
        sortedMovies = filteredMovies;
    }

    // Add original index to each movie for ranking display
    return sortedMovies.map(movie => ({
      ...movie,
      originalIndex: originalIndices[movie.name]
    }));
  };

  const fetchRandomPosts = async () => {
    setRandomLoading(true);
    try {
      const itemsRef = ref(database, 'items');
      const snapshot = await get(itemsRef);
      
      if (snapshot.exists()) {
        const allPosts = Object.entries(snapshot.val())
          .filter(([key, value]) => key !== 'undefined' && value.custom)
          .map(([key, value]) => ({ key, ...value }));
        
        // Shuffle the posts randomly
        const shuffledPosts = allPosts.sort(() => Math.random() - 0.5);
        
        // Take first 30 posts (or all if less than 30)
        const randomPostsData = shuffledPosts.slice(0, 30);
        setRandomPosts(randomPostsData);
      }
    } catch (error) {
      console.error("Error fetching random posts:", error);
    } finally {
      setRandomLoading(false);
    }
  };

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
        username: 'Anonymous', // We don't have profileInfo in Explore
        name: 'Anonymous',
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
    console.log('itemInfo changed:', itemInfo);
    if (itemInfo?.key) {
      console.log('Fetching comments for item:', itemInfo.key);
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
      console.log('Clearing comments');
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

  // Restore scroll position when returning to Random Posts view
  useEffect(() => {
    if (exploreView === 'Random' && randomPostsScrollPosition > 0 && flatListRef.current) {
      // Use requestAnimationFrame to ensure the FlatList is ready
      requestAnimationFrame(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({ offset: randomPostsScrollPosition, animated: false });
        }
      });
    }
  }, [exploreView, randomPostsScrollPosition]);

  const checkUserMatches = async () => {
    const sameUserCategoriesRef = ref(database, 'categories');
    const sameUserCategoriesQuery = query(sameUserCategoriesRef, orderByChild('user_id'), equalTo(userKey));
    get(sameUserCategoriesQuery).then((sameUserCategoriesSnapshot) => {
      if (sameUserCategoriesSnapshot.exists()) {
        let promises = [];
        sameUserCategoriesSnapshot.forEach((childSnapshot) => {
          if (childSnapshot.val().category_type === 'Movies') {
            const categoryItemsRef = ref(database, 'items');
            const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(childSnapshot.key));
            promises.push(get(categoryItemsQuery));
          }
        });

        Promise.all(promises).then((results) => {
          let items = new Set();
          results.forEach((categoryItemsSnapshot) => {
            if (categoryItemsSnapshot.exists()) {
              categoryItemsSnapshot.forEach((childCategoryItemsSnapshot) => {
                let item = childCategoryItemsSnapshot.val();
                items.add(item.image);
              });
            }
          });
          setItemsInCategory(items)
          // Now you can use 'items' or set it in your state
        }).catch((error) => {
          console.error(error);
        });

      } else {
        console.log("No categories found for the user.");
      }
    })
  }

  useEffect(() => {
    checkUserMatches();
    const usersRef = ref(database, 'users');

    get(usersRef).then((snapshot) => {
      if (snapshot.exists()) {
        const usersObject = snapshot.val();
        // Transform the usersObject into an array of user objects, each with its Firebase key
        const usersArray = Object.keys(usersObject).map((key) => ({
        
          ...usersObject[key], // Spread the user data
          id: key // Add the Firebase key as an 'id' field
          
        }));
        
        // Sort by account creation with newest at the top
        // Firebase keys are typically chronological, so newer accounts have higher keys
        const sortedUsers = usersArray.sort((a, b) => {
          // Use Firebase key comparison - newer accounts typically have higher keys
          return b.id.localeCompare(a.id);
        });
        
        setUserListData(sortedUsers);
      }
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });
  }, []);

  const UserTile = ({ item }) => {
    if (item.username && item.username.toLowerCase().includes(searchVal.toLowerCase())){
      return (
        <TouchableOpacity onPress={() => userKey === item.id ? {} : setExploreView({userKey: item.id, username: item.username })}>
          <View style={{ 
            flexDirection: 'row', 
            padding: 10, 
            borderBottomColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
            borderBottomWidth: 1, 
            backgroundColor: isDarkMode ? darkTheme?.background : 'white', 
            alignItems: 'center' 
          }}>
            <Image
              source={item.profile_pic ? { uri: item.profile_pic } : 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
              style={{
                height: 50, 
                width: 50, 
                borderWidth: 0.5, 
                marginRight: 10, 
                borderRadius: 25, 
                borderColor: isDarkMode ? darkTheme?.border : 'lightgrey' 
              }}
            />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ 
                  fontWeight: 'bold', 
                  fontSize: 16,
                  color: isDarkMode ? darkTheme?.textPrimary : 'black'
                }}>{item.name}</Text>
                {item.user_type === 'verified' && <MaterialIcons name="verified" size={16} color="#00aced" style={{ marginLeft: 5 }}/>}
              </View>
              <Text style={{ color: isDarkMode ? darkTheme?.textSecondary : 'grey' }}>@{item.username}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    }
  }

  if (exploreView === 'Home') {
          return (
        <View style={{ backgroundColor: isDarkMode ? darkTheme?.background : 'white', height: '100%' }}>
        
          <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
            <Text style={{ 
              color: isDarkMode ? darkTheme?.textPrimary : 'black', 
              fontSize: 24, 
              fontFamily: 'Poppins Regular' 
            }}>ambora\social</Text>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          

                      <TouchableOpacity 
              style={{ 
                backgroundColor: isDarkMode ? darkTheme?.inputBackground : '#f5f5f5',
                borderRadius: 15,
                padding: 10,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: isDarkMode ? darkTheme?.border : '#ddd',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            onPress={() => {
              setExploreView(null);
              setShouldFocusSearch(true);
            }}
          >
            <Ionicons name="search" size={20} color={isDarkMode ? darkTheme?.textSecondary : '#666'} style={{ marginRight: 10 }} />
            <Text style={{ 
              fontSize: 16, 
              color: isDarkMode ? darkTheme?.textSecondary : '#666',
              flex: 1,
            }}>Search Users</Text>
          </TouchableOpacity>

                      <TouchableOpacity 
              style={{ 
                backgroundColor: '#E8F4FD',
                borderRadius: 20,
                padding: 18,
                marginBottom: 20,
                borderWidth: 2,
                borderColor: '#B3D9FF',
                shadowColor: '#007AFF',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5
              }}
            onPress={() => {
              setExploreView('Top Movies')
              fetchTopMovies();
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                backgroundColor: '#007AFF', 
                borderRadius: 30, 
                width: 60, 
                height: 60, 
                justifyContent: 'center', 
                alignItems: 'center',
                marginRight: 20,
                shadowColor: '#007AFF',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4
              }}>
                <Ionicons name="film" size={30} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0056CC', marginBottom: 5 }}>Movies</Text>
                <Text style={{ fontSize: 16, color: '#666', lineHeight: 22 }}>see what's hot on ambora 👀</Text>
              </View>
            </View>
          </TouchableOpacity>




                      <TouchableOpacity 
              style={{ 
                backgroundColor: '#FFF8E1',
                borderRadius: 20,
                padding: 18,
                marginBottom: 20,
                borderWidth: 2,
                borderColor: '#FFE082'
              }}
            onPress={() => {
              setExploreView('Events')
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                backgroundColor: '#FFA000', 
                borderRadius: 30, 
                width: 60, 
                height: 60, 
                justifyContent: 'center', 
                alignItems: 'center',
                marginRight: 20
              }}>
                <Ionicons name="basketball-sharp" size={30} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#F57C00', marginBottom: 5 }}>Events</Text>
                <Text style={{ fontSize: 16, color: '#666', lineHeight: 22 }}>local events coming soon...🚧</Text>
              </View>
            </View>
          </TouchableOpacity>

                      <TouchableOpacity 
              style={{ 
                backgroundColor: '#F0F8FF',
                borderRadius: 20,
                padding: 18,
                marginBottom: 20,
                borderWidth: 2,
                borderColor: '#87CEEB',
                shadowColor: '#4682B4',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5
              }}
            onPress={() => {
              setExploreView('Random')
              fetchRandomPosts();
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                backgroundColor: '#4682B4', 
                borderRadius: 30, 
                width: 60, 
                height: 60, 
                justifyContent: 'center', 
                alignItems: 'center',
                marginRight: 20,
                shadowColor: '#4682B4',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4
              }}>
                <MaterialIcons name="shuffle" size={30} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#2E5A88', marginBottom: 5 }}>Random</Text>
                <Text style={{ fontSize: 16, color: '#666', lineHeight: 22 }}>posts from anywhere 🎲</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

    
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
       
        </View>
      </View>
    )
  }

  if (exploreView === 'Events') {
    return (
      <View>
          <View style={{ backgroundColor: isDarkMode ? darkTheme?.background : 'white' }}>
            <View style={{ 
              flexDirection: 'row', 
              padding: 10, 
              borderBottomWidth: 1, 
              borderColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
                <TouchableOpacity onPress={() => {
                    setExploreView("Home")
                }}> 
                    <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
                </TouchableOpacity>
                <Text style={{ color: isDarkMode ? darkTheme?.textPrimary : 'black' }}>Events</Text>
            </View>
        </View>
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}> 
              <View style={{ 
                backgroundColor: isDarkMode ? darkTheme?.background : 'white', 
                paddingHorizontal: 20, 
                height: '100%' 
              }}>
                  <View style={{ flex: 1, alignItems: 'center', marginTop: '30%' }}>
                      <Text style={{ 
                        color: isDarkMode ? darkTheme?.textSecondary : 'gray', 
                        fontSize: 20, 
                        marginBottom: 30 
                      }}>Coming Soon! 🗓️</Text>
                  </View>
              </View> 
          </TouchableWithoutFeedback>
      </View>
    )
  }



  if (exploreView === 'Random') {
    return (
      <View style={{ backgroundColor: isDarkMode ? darkTheme?.background : 'white', height: '100%' }}>
        <View style={{ 
          flexDirection: 'row', 
          padding: 10, 
          borderBottomWidth: 1, 
          borderColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <TouchableOpacity onPress={() => {
            setExploreView('Home');
            // Reset scroll position when going back to home
            setRandomPostsScrollPosition(0);
          }}> 
            <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
          </TouchableOpacity>
          <Text style={{ color: isDarkMode ? darkTheme?.textPrimary : 'black', fontWeight: 'bold' }}>Random Posts</Text>
          <TouchableOpacity onPress={() => fetchRandomPosts()}>
            <MaterialIcons name="refresh" size={24} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
          </TouchableOpacity>
        </View>
        
        <FlatList
          ref={flatListRef}
          data={randomPosts}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <NormalItemTile 
              item={item}
              userKey={userKey}
              setFeedView={(profileData) => {
                if (profileData && profileData.userKey) {
                  // Use custom navigation function to preserve current view
                  navigateToProfile(profileData.userKey, profileData.username);
                } else {
                  setExploreView(profileData);
                }
              }}
              navigation={navigation}
              visitingUserId={userKey}
              setItemInfo={debugSetItemInfo}
              topPostsTime={null}
              individualSpotifyAccessToken={null}
              promptAsync={() => {}}
              setIndex={() => {}}
              setFocusedItemDescription={() => {}}
              isDarkMode={isDarkMode}
              darkTheme={darkTheme}
              onShowPastRankings={showPastRankingsOverlay}
            />
          )}
          ListEmptyComponent={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
              {randomLoading ? (
                <ActivityIndicator size="large" color={isDarkMode ? darkTheme?.accent : '#007AFF'} />
              ) : (
                <Text style={{ color: isDarkMode ? darkTheme?.textSecondary : 'gray', fontSize: 16 }}>
                  No random posts found
                </Text>
              )}
            </View>
          )}
          refreshing={randomLoading}
          onRefresh={fetchRandomPosts}
          onScroll={(event) => {
            const y = event.nativeEvent.contentOffset.y;
            setCurrentScrollPosition(y);
            setRandomPostsScrollPosition(y);
            // Save scroll position for restoration, but only when comments overlay is not active
            if (y > 0 && itemInfo === null) {
              setSavedScrollPosition(y);
            }
          }}
          scrollEventThrottle={1}
        />

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
  }

  if (exploreView === 'Top Movies') {
    // If a movie is selected, show the movie detail view
    if (selectedMovie) {
      return (
        <MovieDetailTile 
          movie={selectedMovie} 
          onBackPress={() => setSelectedMovie(null)}
          navigation={navigation}
          isDarkMode={isDarkMode}
          darkTheme={darkTheme}
        />
      );
    }

    return (
      <View style={{ backgroundColor: isDarkMode ? darkTheme?.background : 'white', height: '100%' }}>
        <View style={{ 
          flexDirection: 'row', 
          padding: 10, 
          borderBottomWidth: 1, 
          borderColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <TouchableOpacity onPress={() => {
            setExploreView('Home');
          }}> 
            <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
          </TouchableOpacity>
  
        </View>
        <View style={{ 
          padding: 20, 
          borderBottomWidth: 1, 
          borderColor: isDarkMode ? darkTheme?.border : 'lightgrey' 
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ 
                fontWeight: 'bold', 
                fontSize: 30, 
                fontStyle: 'italic',
                color: isDarkMode ? darkTheme?.textPrimary : 'black'
              }}>Top Movies</Text>
              <Text style={{ 
                color: isDarkMode ? darkTheme?.textSecondary : 'grey', 
                marginTop: 10 
              }}>{topMovies.length} movies ranked.</Text>
            </View>
            <TouchableOpacity 
              style={{
                backgroundColor: isDarkMode ? darkTheme?.buttonSecondary : 'lightgrey',
                paddingHorizontal: 15,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center'
              }}
              onPress={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Ionicons name="filter" size={16} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
              <Text style={{ 
                marginLeft: 5, 
                color: isDarkMode ? darkTheme?.textPrimary : 'black',
                fontSize: 14,
                fontWeight: '500'
              }}>Sort</Text>
            </TouchableOpacity>
          </View>
          {showFilterDropdown && (
            <View style={{
              position: 'absolute',
              top: 80,
              right: 20,
              backgroundColor: isDarkMode ? darkTheme?.surface : 'white',
              borderWidth: 1,
              borderColor: isDarkMode ? darkTheme?.border : 'lightgrey',
              borderRadius: 8,
              padding: 10,
              zIndex: 1000,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5
            }}>
              <TouchableOpacity 
                style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                onPress={() => {
                  setSortBy('default');
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={{ 
                  color: sortBy === 'default' ? (isDarkMode ? darkTheme?.accent : '#00aced') : (isDarkMode ? darkTheme?.textPrimary : 'black'),
                  fontWeight: sortBy === 'default' ? 'bold' : 'normal'
                }}>Default</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                onPress={() => {
                  setSortBy('rankings');
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={{ 
                  color: sortBy === 'rankings' ? (isDarkMode ? darkTheme?.accent : '#00aced') : (isDarkMode ? darkTheme?.textPrimary : 'black'),
                  fontWeight: sortBy === 'rankings' ? 'bold' : 'normal'
                }}>Popularity</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                onPress={() => {
                  setSortBy('alphabetical');
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={{ 
                  color: sortBy === 'alphabetical' ? (isDarkMode ? darkTheme?.accent : '#00aced') : (isDarkMode ? darkTheme?.textPrimary : 'black'),
                  fontWeight: sortBy === 'alphabetical' ? 'bold' : 'normal'
                }}>A-Z</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                onPress={() => {
                  setSortBy('rating');
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={{ 
                  color: sortBy === 'rating' ? (isDarkMode ? darkTheme?.accent : '#00aced') : (isDarkMode ? darkTheme?.textPrimary : 'black'),
                  fontWeight: sortBy === 'rating' ? 'bold' : 'normal'
                }}>Low to High</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={isDarkMode ? darkTheme?.textPrimary : "black"} style={{ marginTop: 20 }} />
          </View>
        ) : (
          <FlatList
            data={getSortedMovies(topMovies)}
            renderItem={({ item, index }) => (
              <TouchableOpacity onPress={() => setSelectedMovie(item)}>
                <ExploreItemTile 
                  item={item} 
                  index={item.originalIndex} 
                  itemsInCategory={itemsInCategory}
                  isDarkMode={isDarkMode}
                  darkTheme={darkTheme}
                />
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
            numColumns={1}
            key={"single-column"}
            ListHeaderComponent={() => (
              <TextInput
                placeholder={'Search movies...'}
                value={movieSearchVal} 
                onChangeText={setMovieSearchVal}
                placeholderTextColor={isDarkMode ? darkTheme?.placeholder : "gray"}
                style={{ 
                  fontSize: 16, 
                  borderColor: isDarkMode ? darkTheme?.border : 'lightgrey',
                  borderWidth: 0.5,
                  borderRadius: 30,
                  padding: 10,
                  marginRight: 10,
                  marginLeft: 10,
                  paddingHorizontal: 20,
                  marginVertical: 15,
                  color: isDarkMode ? darkTheme?.textPrimary : 'black',
                  backgroundColor: isDarkMode ? darkTheme?.inputBackground : 'white'
                }}
                autoCorrect={false}
                autoCapitalize="none"
                keyboardType="default"
                returnKeyType="search"
                blurOnSubmit={false}
              />
            )}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          />
        )}
      </View> 
    )
  }

  if (exploreView) {
    return (
      <Profile 
        route={{'params': {
          userKey: exploreView.userKey,
          username: exploreView.username,
          visitingUserId: userKey,
          setFeedView: (value) => {
            if (value === null) {
              // Restore previous view when coming back from profile
              setExploreView(previousView || 'Home');
            } else {
              setExploreView(value);
            }
          }
        }}}
        navigation={navigation}  
      />
    )
  }

  return (
    <>
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}> 
      <View style={{ backgroundColor: isDarkMode ? darkTheme?.background : 'white', height: '100%' }}>
        
        <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
          <Text style={{ 
            color: isDarkMode ? darkTheme?.textPrimary : 'black', 
            fontSize: 24, 
            fontFamily: 'Poppins Regular' 
          }}>ambora\social</Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setExploreView('Home')} style={{ marginRight: 10 }}>
              <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ 
                backgroundColor: isDarkMode ? darkTheme?.inputBackground : '#f5f5f5',
                borderRadius: 15,
                padding: 10,
                borderWidth: 1,
                borderColor: isDarkMode ? darkTheme?.border : '#ddd',
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1
              }}
              onPress={() => {
                // Do nothing, already on search page
              }}
            >
              <Ionicons name="search" size={20} color={isDarkMode ? darkTheme?.textSecondary : '#666'} style={{ marginRight: 10 }} />
              <TextInput
                placeholder={'Search Users...'}
                value={searchVal} 
                onChangeText={setSearchVal}
                placeholderTextColor={isDarkMode ? darkTheme?.textSecondary : '#666'}
                style={{ 
                  fontSize: 16, 
                  color: isDarkMode ? darkTheme?.textSecondary : '#666',
                  flex: 1,
                }}
                autoFocus={shouldFocusSearch}
                onFocus={() => setShouldFocusSearch(false)}
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <FlatList
          data={userListData}
          renderItem={({ item, index }) => <UserTile item={item} index={index}/>}
          keyExtractor={(item, index) => index.toString()}
          numColumns={1}
          key={"single-column"}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      </View> 
    </TouchableWithoutFeedback>
    </>
  );
};

export default Explore;