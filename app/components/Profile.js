import React from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, Alert, ImageBackground } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage

import profilePic from '../../assets/images/lebron_profile_pic.webp';
import { database, storage } from '../../firebaseConfig';
import { ref, set, onValue, off, push, query, equalTo, orderByChild, get } from "firebase/database"; // Import 'ref' and 'set' from the database package
import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import CategoryList from './CategoryList';

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
  tileText: {
    // existing text styles...
    color: 'white', // Ensure text is visible on likely darker images
    padding: 8, // Add padding to separate text from the edges
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

const Profile = () => {
  const [categories, setCategories] = useState({});
  const [focusedCategory, setFocusedCategory] = useState(null);
  const [focusedCategoryId, setFocusedCategoryId] = useState(null);
  const [focusedList, setFocusedList] = useState({});
  const [addCategoryName, setAddCategoryName] = useState('');
  const user = 'lebron';

  useEffect(() => {
    // Create a reference to the 'categories' node
    const categoriesRef = ref(database, 'categories');

    // Create a query to filter by 'user_id' equal to 'lebron'
    const userCategoriesQuery = query(categoriesRef, orderByChild('user_id'), equalTo(user));

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
      console.log(categories);
    });
  }, [user]);

  const onCategoryPress = (category_name, category_id) => {
    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(category_id));

    get(categoryItemsQuery).then((snapshot) => {
      let tempFocusedList = {'now': [], 'later': []};
      for (const [key, value] of Object.entries(snapshot.val())) {
        if (value.bucket === 'later') {
          tempFocusedList['later'].push([key, value]);
        } else {
          tempFocusedList['now'].push([key, value]);
        }
      }
      tempFocusedList['now'].sort((a, b) => b[1].score - a[1].score);
      setFocusedList(tempFocusedList);
      setFocusedCategory(category_name);
      setFocusedCategoryId(category_id);
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });
  }

  const onAddCategoryPress = (category_name, image) => {
    const newCategoryRef = push(ref(database, 'categories'));
  
    set(newCategoryRef, {
      category_name: category_name,
      num_items: 0,
      user_id: user,
      category_type: 'ranked_list',
      list_num: 0,
      imageUri: image, // Save the URI in the database
    })
    .then(() => console.log('New category added with image URI.'))
    .catch((error) => console.error('Error adding new category:', error));
  };  

  onBackPress = () => {
    setFocusedList({});
    setFocusedCategory(null);
  }

  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const pickImage = async () => {
    // no permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,         // all, images, videos
      allowsEditing: true,
      aspect: [4,3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      console.log(result.assets[0].uri); // Log the selected image URI. THIS IS WHAT WE WANT STORED IN THE OBJECT, THIS IS WHAT THE LONG LINK IS FOR EACH VARIABLE. right now one is hard coded, but we need to store this somehow in the object so then it can be retrieved and set to the uri to display a specific image for each tile.
    }
  };

  // upload media files
  const uploadMedia = async () => {
    if (image === null) return null; // Return null if no image to upload
    setUploading(true);
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const filename = image.substring(image.lastIndexOf('/') + 1);
      const storageRef = storRef(storage, filename); // Use the previously renamed 'ref' function
      const uploadTask = uploadBytesResumable(storageRef, blob);
  
      // Use a promise to wait for the upload to complete and then return the filename
      return await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            // Optional: Update progress state here
          }, 
          (error) => {
            console.error(error);
            setUploading(false);
            reject(error);
          }, 
          () => {
            console.log('File available at', filename);
            setImage(null);
            setUploading(false);
            resolve(filename); // Resolve the promise with the filename
          }
        );
      });
    } catch (error) {
      console.error(error);
      setUploading(false);
      return null; // Return null in case of error
    }
  };  

  const CategoryTile = ({ category_name, category_id, imageUri }) => {
    return (
      <TouchableOpacity style={styles.tile} onPress={() => onCategoryPress(category_name, category_id)}>
        <ImageBackground
          source={{ uri: imageUri }} // Use the imageUri directly
          resizeMode="cover"
          style={styles.tileBackground}
        >
          <Text style={styles.tileText}>{category_name}</Text>
        </ImageBackground>
      </TouchableOpacity>
    );
  };  

  return (
    <View style={{ backgroundColor: 'white', height: '100%' }}>
      {focusedCategory === 'addList' ? (
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
              {image && <Image
                source={{ uri: image }}
                style={{ width: 300, height: 300, marginTop: 35 }}
              />}
            </View>
          </View>

          <View style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
            <TouchableOpacity
              style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', marginTop: 35 }}
              onPress={async () => {
                const filename = await uploadMedia(); // This should be the URI or a reference to the image
                if (filename) {
                  onAddCategoryPress(addCategoryName, image); // Pass the filename/URI here
                  Alert.alert("Category Uploaded");
                } else {
                  Alert.alert("Upload failed", "The image could not be uploaded. Please try again.");
                }
              }}>
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
              <Text style={{ marginLeft: 10, fontSize: 20, marginTop: 10, fontWeight: 'bold' }}> @lebron </Text>
              <View style={{ flexDirection: 'row', marginLeft: 10, marginTop: 10 }}>
                <Text style={{ marginRight: 5 }}> 10 Followers </Text><Text> 11 Following </Text>
              </View>
            </View>
          </View>

          <Text style={{ paddingHorizontal: 15 }}>
              I am LeBron, the greatest basketball player of all time.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15}}>
            <TouchableOpacity style={styles.editContainer}>
              <Text style={styles.editButtons}> Edit Profile </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editContainer} onPress={() => setFocusedCategory('addList')}>
              <Text style={styles.editButtons}> Add List </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={categories}
            renderItem={({ item }) => <CategoryTile category_name={item.category_name} category_id={item.id} imageUri={item.imageUri}/>}
            keyExtractor={(item, index) => index.toString()}
            numColumns={3}
            contentContainerStyle={styles.grid}
          />
        </>
      )}
    </View> 
  )
};

export default Profile;