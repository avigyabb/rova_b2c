import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Keyboard, TouchableWithoutFeedback, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get } from "firebase/database";
import { Image } from 'expo-image';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Profile from './Profile';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import ExploreItemTile from './ExploreComponents/ExploreItemTile';


const Explore = ({ route, navigation }) => {
  const { userKey } = route.params;
  const [userListData, setUserListData] = useState([]);
  const [searchVal, setSearchVal] = useState(''); // ~ why does this work
  const [exploreView, setExploreView] = useState('Home');
  const [topMovies, setTopMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsInCategory, setItemsInCategory] = useState(new Set());

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
      .filter(item => item.num_items > 1)  // Filter items with num_items > 1
      .sort((a, b) => b.score/b.num_items - a.score/a.num_items);  // Sort by score in decreasing order

      // Update the state
      setTopMovies(itemsArray);
      setLoading(false);
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
        setUserListData(usersArray);
      }
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });
  }, []);

  const UserTile = ({ item }) => {
    if (item.username && item.username.toLowerCase().includes(searchVal.toLowerCase())){
      return (
        <TouchableOpacity onPress={() => userKey === item.id ? {} : setExploreView({userKey: item.id, username: item.username })}>
          <View style={{ flexDirection: 'row', padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, backgroundColor: 'white', alignItems: 'center' }}>
            <Image
              source={item.profile_pic ? { uri: item.profile_pic } : 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
              style={{height: 50, width: 50, borderWidth: 0.5, marginRight: 10, borderRadius: 25, borderColor: 'lightgrey' }}
            />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.name}</Text>
                {item.user_type === 'verified' && <MaterialIcons name="verified" size={16} color="#00aced" style={{ marginLeft: 5 }}/>}
              </View>
              <Text style={{ color: 'grey' }}>@{item.username}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    }
  }

  if (exploreView === 'Home') {
          return (
        <View style={{ backgroundColor: 'white', height: '100%' }}>
        
          <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
            <Text style={{ color: 'black', fontSize: 24, fontFamily: 'Poppins Regular' }}>ambora\social</Text>
          </View>

          <View style={{ paddingHorizontal: 20, marginTop: 30 }}>
          

                      <TouchableOpacity 
              style={{ 
                backgroundColor: '#FFE5E5',
                borderRadius: 20,
                padding: 18,
                marginBottom: 20,
                borderWidth: 2,
                borderColor: '#FFB3B3',
                shadowColor: '#FF6B6B',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5
              }}
            onPress={() => setExploreView(null)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                backgroundColor: '#FF6B6B', 
                borderRadius: 30, 
                width: 60, 
                height: 60, 
                justifyContent: 'center', 
                alignItems: 'center',
                marginRight: 20,
                shadowColor: '#FF6B6B',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4
              }}>
                <MaterialIcons name="people" size={30} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#FF4757', marginBottom: 5 }}>Search Users</Text>
                <Text style={{ fontSize: 16, color: '#666', lineHeight: 22 }}>find new people 🔍</Text>
              </View>
            </View>
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
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0056CC', marginBottom: 5 }}>Top Movies</Text>
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
                borderColor: '#FFE082',
                opacity: 0.7
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
        </View>

    
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
       
        </View>
      </View>
    )
  }

  if (exploreView === 'Events') {
    return (
      <View>
          <View style={{ backgroundColor: 'white' }}>
            <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => {
                    setExploreView("Home")
                }}> 
                    <Ionicons name="arrow-back" size={30} color="black" />
                </TouchableOpacity>
                <Text>Events</Text>
            </View>
        </View>
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}> 
              <View style={{ backgroundColor: 'white', paddingHorizontal: 20, height: '100%' }}>
                  <View style={{ flex: 1, alignItems: 'center', marginTop: '30%' }}>
                      <Text style={{ color: 'gray', fontSize: 20, marginBottom: 30 }}>Coming Soon! 🗓️</Text>
                  </View>
              </View> 
          </TouchableWithoutFeedback>
      </View>
    )
  }

  if (exploreView === 'Top Movies') {
    return (
      <View style={{ backgroundColor: 'white', height: '100%' }}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => {
            setExploreView('Home');
          }}> 
            <Ionicons name="arrow-back" size={30} color="black" />
          </TouchableOpacity>
          <Text>Top Movies</Text>
        </View>
        <View style={{ padding: 20, borderBottomWidth: 1, borderColor: 'lightgrey' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 30, fontStyle: 'italic' }}>Top Movies</Text>
          <Text style={{ color: 'grey', marginTop: 10 }}>{topMovies.length} movies ranked.</Text>
        </View>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
          </View>
        ) : (
          <>
          <FlatList
            data={topMovies}
            renderItem={({ item, index }) => <ExploreItemTile item={item} index={index} itemsInCategory={itemsInCategory}/>}
            keyExtractor={(item, index) => index.toString()}
            numColumns={1}
            key={"single-column"}
          />
          </>
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
      <View style={{ backgroundColor: 'white', paddingHOrizontal: 20, height: '100%' }}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => {
            setExploreView('Home');
          }}> 
            <Ionicons name="arrow-back" size={30} color="black" />
          </TouchableOpacity>
      
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <TextInput
            placeholder={'Search Users...'}
            value={searchVal} 
            onChangeText={setSearchVal}
            placeholderTextColor="gray"
            style={{ 
              fontSize: 16, 
              borderColor: 'lightgrey',
              borderWidth: 0.5,
              borderRadius: 30,
              padding: 10,
              paddingHorizontal: 20,
              marginVertical: 15
            }}
          /> 
        </View>
        <FlatList
          data={userListData}
          renderItem={({ item, index }) => <UserTile item={item} index={index}/>}
          keyExtractor={(item, index) => index.toString()}
          numColumns={1}
          key={"single-column"}
        />
      </View> 
    </TouchableWithoutFeedback>
    </>
  )
};

export default Explore;