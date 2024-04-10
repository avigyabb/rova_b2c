import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, TextInput, SafeAreaView, Alert, ImageBackground } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage
import { useFonts } from 'expo-font';
// import profilePic from '../../assets/images/lebron_profile_pic.webp';
import { database, storage } from '../../firebaseConfig';
import { ref, set, onValue, off, push, query, equalTo, orderByChild, get, remove } from "firebase/database"; // Import 'ref' and 'set' from the database package
import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import CategoryList from './CategoryList';
import EditProfile from './EditProfile';
import AddCategory from './AddCategory';
import AsyncStorage from '@react-native-async-storage/async-storage';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Hyperlink from 'react-native-hyperlink';
import FollowUsers from './FollowUsers';

const styles = StyleSheet.create({
  profilePic: {
    width: 100,        // Specify the width
    height: 100,       // Specify the height
    borderRadius: 50,  // Make sure this is half of the width and height
    borderWidth: 0.5, 
    borderColor: 'lightgrey'
  },
  grid: {
    // alignItems: 'center',
    justifyContent: 'space-around'
  },
  tile: {
    width: 129,
    height: 129,
    margin: 1,
    overflow: 'hidden', // Ensure the image is contained within the borders of the tile
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
    width: '48%',
    borderRadius: 10,
    alignItems: 'center',
  }
});

const Profile = ({ route }) => {
  const { userKey, setView, fetchUserData, visitingUserId, setFeedView } = route.params;
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
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
  });
  const [isFollowing, setIsFollowing] = useState(false);

  const getUserInfo = () => {
    const userRef = ref(database, 'users/' + userKey);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        console.log(snapshot.val());
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
  }, []);

  const onCategoryPress = (category_name, category_id) => {
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
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });
  }

  onBackPress = () => {
    setFocusedList({});
    setFocusedCategory(null);
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

  const CategoryTile = ({ category_name, category_id, imageUri, num_items }) => {
    return (
      <TouchableOpacity style={styles.tile} onPress={() => onCategoryPress(category_name, category_id)}>
        <View style={{
          width: '100%', // Adjust these values as needed
          height: '100%', // Adjust these values as needed
          position: 'relative', // This allows the overlay to be absolutely positioned within
        }}>
          <Image
            source={{ uri: imageUri }}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute', // Positions the image to fill the parent
            }}
            resizeMode="cover"
          />
          <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end', // Aligns child content to the bottom
            padding: 10, // Adjust or remove padding as needed
          }}>
            <Text style={{ marginLeft: 'auto', color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 'auto' }}>
              {num_items}
            </Text>
            <Text style={{
              color: 'white', // Ensures the text is visible against a dark background
              fontSize: 16, // Adjust text size as needed
              fontWeight: 'bold', // Adjust font weight as needed
            }}>
              {category_name}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };  

  const onLogOutPress = async () => {
    await AsyncStorage.removeItem('username');
    await AsyncStorage.removeItem('key');
    fetchUserData();
    setView('signin');
  }

  const followUser = async () => {
    const followersRef = ref(database, 'users/' + userKey + '/followers/' + visitingUserId);
    set(followersRef, {
      closeFriend: false
    })
    const followingRef = ref(database, 'users/' + visitingUserId + '/following/' + userKey);
    set(followingRef, {
      closeFriend: false
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

  if (focusedCategory === 'Followers') {
    return <FollowUsers 
      userIds={Object.keys(profileInfo.followers)} 
      setFocusedCategory={setFocusedCategory}
      focusedCategory={'Followers'}
      username={profileInfo.username}
      userKey={userKey}
      visitingUserId={visitingUserId}
    />
  }

  if (focusedCategory === 'Following') {
    return <FollowUsers 
      userIds={Object.keys(profileInfo.following)} 
      setFocusedCategory={setFocusedCategory}
      focusedCategory={'Following'}
      username={profileInfo.username}
      userKey={userKey}
      visitingUserId={visitingUserId}
    />
  }

  return (
    <View style={{ backgroundColor: 'white', height: '100%'}}>
      {focusedCategory === 'editProfile' ? (
        <EditProfile userKey={userKey} onBackPress={() => onBackPress()} getUserInfo={() => getUserInfo()}/>
      ) : focusedCategory === 'addList' ? (
        <>
          <View style={{ flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderColor: 'lightgrey' }}>
            <TouchableOpacity onPress={() => setFocusedCategory(null)}> 
              <MaterialIcons name="arrow-back" size={30} color="black" />
            </TouchableOpacity>
            <Text style={{ marginLeft: 'auto', marginRight: 10, fontSize: 15, fontWeight: 'bold' }}> {focusedCategory}</Text>
          </View>

          <AddCategory profilePic={profileInfo.profile_pic} onBackPress={() => onBackPress()} userKey={userKey}/>
        </>
      ) : focusedCategory ? (
        <CategoryList 
          focusedCategory={focusedCategory} 
          focusedList={focusedList} 
          focusedCategoryId={focusedCategoryId} 
          onBackPress={() => onBackPress()}
          isMyProfile={visitingUserId ? visitingUserId === userKey : true}
        />
      ) : (
        <>
          {!visitingUserId ? (
            <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center', width: '100%', paddingHorizontal: 20  }}>
              <Text style={{ color: 'black', fontSize: 24, fontWeight: 'bold', fontFamily: 'Poppins Regular' }}>ambora\social</Text>
              <TouchableOpacity onPress={() => onLogOutPress()} style={{ marginLeft: 'auto' }}>
                <MaterialIcons name="logout" size={25} color="black"/>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setFeedView(null)}> 
                <MaterialIcons name="arrow-back" size={30} color="black" />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={{ flexDirection: 'row', padding: 15 }}>
            {profileInfo.profile_pic ? (
              <Image
                source={{ uri: profileInfo.profile_pic }}
                style={styles.profilePic}
              />
            ) : (
              <Image
                source={profilePic}
                style={styles.profilePic}
              />
            )}
            <View>
              <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
                <Text style={{ marginLeft: 10, fontSize: 20, fontWeight: 'bold', fontFamily: 'Poppins Bold', marginRight: 10 }}>{profileInfo.name}</Text>
                <MaterialIcons name="verified" size={20} color="black" />
              </View>
              <Text style={{ marginLeft: 10, fontSize: 16, marginTop: 0, fontWeight: 'bold', color: 'gray' }}>@{profileInfo.username}</Text>
              
              <View style={{ flexDirection: 'row', marginLeft: 10, marginTop: 15 }}>
                <TouchableOpacity onPress={() => setFocusedCategory('Followers')}>
                  <Text style={{ marginRight: 30, fontWeight: 'bold' }}>{profileInfo.followers ? Object.keys(profileInfo.followers).length : 0} Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFocusedCategory('Following')}>
                  <Text style={{ fontWeight: 'bold' }}>{profileInfo.following ? Object.keys(profileInfo.following).length : 0} Following</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <Hyperlink
            linkDefault={ true }
            linkStyle={ { color: '#2980b9', textDecorationLine: 'underline' } }
            onPress={ (url, text) => Linking.openURL(url) }
          >
            <Text style={{ paddingHorizontal: 15, marginBottom: 20 }}>
              {profileInfo.bio}
            </Text>
          </Hyperlink>
          
          {!visitingUserId ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 20, borderColor: 'lightgrey', borderBottomWidth: 1}}>
              <TouchableOpacity style={styles.editContainer} onPress={() => setFocusedCategory('editProfile')}>
                <Text style={styles.editButtons}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editContainer} onPress={() => setFocusedCategory('addList')}>
                <Text style={styles.editButtons}>Add List</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 15, paddingBottom: 20, borderColor: 'lightgrey', borderBottomWidth: 1 }}>
              {isFollowing ? (
                <TouchableOpacity style={styles.editContainer} onPress={() => unfollowUser()}>
                  <Text style={styles.editButtons}>Unfollow</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.editContainer} onPress={() => followUser()}>
                  <Text style={styles.editButtons}>Follow</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {categories.length > 0 ? (
            <FlatList
              data={categories}
              renderItem={({ item }) => <CategoryTile category_name={item.category_name} category_id={item.id} imageUri={item.imageUri} num_items={item.num_items}/>}
              keyExtractor={(item, index) => index.toString()}
              numColumns={3}
              contentContainerStyle={styles.grid}
            />
          ) : (
            <Text style={{ textAlign: 'center', marginTop: '20%', fontWeight: 'bold', fontSize: 16, color: 'lightgray' }}>add a list to get started...</Text>
          )}
        </>
      )}
    </View> 
  )
};

export default Profile;