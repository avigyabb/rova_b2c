import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Keyboard, TouchableWithoutFeedback, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get } from "firebase/database";
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


const Explore = ({ route, navigation, isDarkMode=false, darkTheme=null }) => {
  const { userKey } = route.params;
  const [userListData, setUserListData] = useState([]);
  const [searchVal, setSearchVal] = useState(''); // ~ why does this work
  const [exploreView, setExploreView] = useState('Home');
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
  const [shouldFocusSearch, setShouldFocusSearch] = useState(false);

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

  if (itemInfo) {
    const onBackPress = (params) => {
      setExploreView(params)
      setItemInfo(null)
    }

    return (
      <View style={{ 
        backgroundColor: isDarkMode ? darkTheme?.background : 'black', 
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
            setItemInfo(null) 
            setExploreView('Random')
          }}> 
            <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
          </TouchableOpacity>
        </View>
        <NormalItemTile 
          item={itemInfo} 
          visitingUserId={userKey} 
          navigation={navigation} 
          editMode={false} 
          showComments={true} 
          setFeedView={onBackPress} 
          individualSpotifyAccessToken={null} 
          promptAsync={() => {}}
          isDarkMode={isDarkMode}
          darkTheme={darkTheme}
        />
      </View>
    );
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
          }}> 
            <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
          </TouchableOpacity>
          <Text style={{ color: isDarkMode ? darkTheme?.textPrimary : 'black', fontWeight: 'bold' }}>Random Posts</Text>
          <TouchableOpacity onPress={() => fetchRandomPosts()}>
            <MaterialIcons name="refresh" size={24} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={randomPosts}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <NormalItemTile 
              item={item}
              userKey={userKey}
              setFeedView={setExploreView}
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
        />
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
          setFeedView: setExploreView
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
  )
};

export default Explore;