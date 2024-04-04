import React from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, Alert, ImageBackground } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage
import { useFonts } from 'expo-font';
import profilePic from '../../assets/images/lebron_profile_pic.webp';
import { database, storage } from '../../firebaseConfig';
import { ref, set, onValue, off, push, query, equalTo, orderByChild, get } from "firebase/database"; // Import 'ref' and 'set' from the database package
import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import CategoryList from './CategoryList';
import EditProfile from './EditProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';

const styles = StyleSheet.create({
  profilePic: {
    width: 100,        // Specify the width
    height: 100,       // Specify the height
    borderRadius: 50,  // Make sure this is half of the width and height
  },
  grid: {
    // alignItems: 'center',
    justifyContent: 'space-around',
  },
  tile: {
    width: 129,
    height: 129,
    margin: 1,
    overflow: 'hidden', // Ensure the image is contained within the borders of the tile
  },
  tileBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end', // Position text at the bottom of the tile
  },
  overlayStyle: {
    ...StyleSheet.absoluteFillObject, // This makes sure the overlay covers the whole tile
    backgroundColor: 'rgba(0,0,0,0.4)', // Change the opacity here as needed
    justifyContent: 'flex-end', // Keeps text at the bottom
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
    marginVertical: 20
  }
});

const Profile = ({ route }) => {
  const { userKey, username, setView, fetchUserData } = route.params;
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

        // You can now do something with each category
        // For example, push the category data to an array
        categories.push({ id: categoryKey, ...categoryData });
      });

      setCategories(categories);
    });
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

  const onAddCategoryPress = async (category_name) => {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const filename = imageUri.substring(imageUri.lastIndexOf('/') + 1);
    const storageRef = storRef(storage, filename); // Use the previously renamed 'ref' function
    const uploadTask = uploadBytesResumable(storageRef, blob);
    
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      }, 
      (error) => {
        console.error('Upload failed', error);
      }, 
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);
          const newCategoryRef = push(ref(database, 'categories'));
          set(newCategoryRef, {
            category_name: category_name,
            num_items: 0,
            user_id: userKey,
            category_type: 'ranked_list',
            list_num: 0,
            imageUri: downloadURL, // Save the URI in the database
          })
          .then(() => {
            console.log('New category added with image URI.')
            setImageUri(null);
            onBackPress();
          })
          .catch((error) => console.error('Error adding new category:', error));
        });
      }
    );
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

  const CategoryTile = ({ category_name, category_id, imageUri }) => {
    return (
      <TouchableOpacity style={styles.tile} onPress={() => onCategoryPress(category_name, category_id)}>
        <ImageBackground
          source={{ uri: imageUri }} // Use the imageUri directly
          resizeMode="cover"
          style={styles.tileBackground}
        >
          <View style={styles.overlayStyle}>
            <Text style={styles.tileText}>{category_name}</Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };  

  const onLogOutPress = async () => {
    await AsyncStorage.removeItem('username');
    await AsyncStorage.removeItem('key');
    fetchUserData();
    setView('signin');
  }

  return (
    <View style={{ backgroundColor: 'white', height: '100%' }}>
      {focusedCategory === 'editProfile' ? (
        <EditProfile profilePic={profilePic}/>
      ) : focusedCategory === 'addList' ? (
        <>
          <View style={{ flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderColor: 'lightgrey' }}>
            <TouchableOpacity onPress={() => setFocusedCategory(null)}> 
              <MaterialIcons name="arrow-back" size={30} color="black" />
            </TouchableOpacity>

            <Text style={{ marginLeft: 'auto', marginRight: 10, fontSize: 15, fontWeight: 'bold' }}> {focusedCategory}</Text>
          </View>

          <TextInput
            placeholder="Enter New List Name..."
            placeholderTextColor="#000"
            onChangeText={setAddCategoryName}
            style={{
              marginTop: 20,
              backgroundColor: 'lightgray',
              height: 38,
              padding: 10,
              borderRadius: 10,
            }}
          />

          <View style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
            <TouchableOpacity onPress={pickImage} style={{ width: 140, height: 70, borderRadius: 35, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', marginTop: 35 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Pick Image</Text>
            </TouchableOpacity>
            <View style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
              {imageUri && <Image
                source={{ uri: imageUri }}
                style={{ width: 300, height: 300, marginTop: 35 }}
              />}
            </View>
          </View>

          <View style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
            <TouchableOpacity
              style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', marginTop: 35 }}
              onPress={() => onAddCategoryPress(addCategoryName)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Add</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : focusedCategory ? (
        <CategoryList focusedCategory={focusedCategory} focusedList={focusedList} focusedCategoryId={focusedCategoryId} onBackPress={() => onBackPress()}/>
      ) : (
        <>
          <View style={{ flexDirection: 'row', padding: 15 }}>
            <Image
              source={profilePic}
              style={styles.profilePic}
            />
            <View>
              <Text style={{ marginLeft: 10, fontSize: 20, marginTop: 10, fontWeight: 'bold', fontFamily: 'Poppins Bold' }}> @{username} </Text>
              <View style={{ flexDirection: 'row', marginLeft: 10, marginTop: 10 }}>
                <Text style={{ marginRight: 5 }}> 10 Followers </Text><Text> 11 Following </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => onLogOutPress()}>
              <MaterialIcons name="logout" size={20} color="black" style={{ marginLeft: 45 }}/>
            </TouchableOpacity>
          </View>

          <Text style={{ paddingHorizontal: 15 }}>
            I am LeBron, the greatest basketball player of all time.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15}}>
            <TouchableOpacity style={styles.editContainer} onPress={() => setFocusedCategory('editProfile')}>
              <Text style={styles.editButtons}> Edit Profile </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editContainer} onPress={() => setFocusedCategory('addList')}>
              <Text style={styles.editButtons}> Add List </Text>
            </TouchableOpacity>
          </View>

          {categories.length > 0 ? (
            <FlatList
              data={categories}
              renderItem={({ item }) => <CategoryTile category_name={item.category_name} category_id={item.id} imageUri={item.imageUri}/>}
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