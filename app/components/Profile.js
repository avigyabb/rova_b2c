import React from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, Alert } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage

import profilePic from '../../assets/images/lebron_profile_pic.webp';
import { database, storage } from '../../firebaseConfig';
import { ref, set, onValue, off, push, query, equalTo, orderByChild, get } from "firebase/database"; // Import 'ref' and 'set' from the database package
import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { launchImageLibrary } from 'react-native-image-picker';
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
    backgroundColor: 'lightgrey',
    padding: 8,
  },
  tileText: {
    // Add text styling if needed
    fontSize: 16,
    fontWeight: 'bold',
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

  const onAddCategoryPress = (category_name) => {
    const newCategoryRef = push(ref(database, 'categories'));

    // Set the data for the new item reference
    set(newCategoryRef, {
      category_name: category_name,
      num_items: 0,
      user_id: user,
      category_type: 'ranked_list',
      list_num: 0,
    })
    .then(() => console.log('New category added.'))
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
    }
  };
  // upload media files
  const uploadMedia = async () => {
    if (image === null) return; // Ensure there is an image to upload
    setUploading(true);
    try {
      const response = await fetch(image);
      const blob = await response.blob(); // Using fetch API to create a blob directly
      const filename = image.substring(image.lastIndexOf('/') + 1);
      console.log(filename);
      const storageRef = storRef(storage, filename); // Corrected reference creation
      const uploadTask = uploadBytesResumable(storageRef, blob); // Starting the upload
  
      uploadTask.on('state_changed', 
        (snapshot) => {
          // You can handle progress here using snapshot
          // For example, to log the progress:
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        }, 
        (error) => {
          // Handle unsuccessful uploads
          console.error(error);
          setUploading(false);
        }, 
        () => {
          // Handle successful uploads on complete
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => { // Correctly getting the download URL
            console.log('File available at', downloadURL);
            Alert.alert(`Photo ${filename} Uploaded`);
            setImage(null);
            setUploading(false);
          });
        }
      );
    } catch (error) {
      console.error(error);
      setUploading(false);
    }
  };  



  const CategoryTile = ({ category_name, category_id }) => {
    return (
      <TouchableOpacity style={styles.tile} onPress={() => onCategoryPress(category_name, category_id)}>
        <Text style={styles.tileText}>{category_name}</Text>
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
            placeholder="List Name"
            placeholderTextColor="#000"
            onChangeText={setAddCategoryName}
            style={{
              marginTop: 20,
              backgroundColor: 'lightgray',
              height: 38,
              padding: 10,
              borderRadius: 10
            }}
          />

          <TouchableOpacity onPress={pickImage}>
            <Text>Pick Image</Text>
          </TouchableOpacity>
          <View>
            {image && <Image
              source={{ uri: image }}
              style={{ width: 300, height: 300 }}
            />}
          </View>
          <TouchableOpacity onPress={uploadMedia}>
            <Text>Upload Image</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{width: 70, height: 70, borderRadius: 35, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', marginTop: 20}} onPress={() => onAddCategoryPress(addCategoryName)}>
            <Text style={{color: 'white', fontWeight: 'bold'}}>Add</Text>
          </TouchableOpacity>
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
            renderItem={({ item }) => <CategoryTile category_name={item.category_name} category_id={item.id}/>}
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