import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard, FlatList } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import profilePic from '../../assets/images/lebron_profile_pic.webp';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage
import { database, storage } from '../../firebaseConfig';
import { ref, set, onValue, off, push, query, equalTo, orderByChild, get } from "firebase/database"; // Import 'ref' and 'set' from the database package
import RNPickerSelect from 'react-native-picker-select';
import { signInCategories } from '../consts';
import CategoryTile from './CategoryTile';

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
  postButtons: {
    flexDirection: 'row',
    borderWidth: 2,
    padding: 6,
    alignItems: 'center',
    borderRadius: 17,
    marginRight: 8
  },
  addedImages: {
    height: 100,
    width: 100,
    borderWidth: 2,
    marginTop: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'gray',
    marginRight: 10
  }
});

const AddCategory = ({ onBackPress, userKey, isDarkMode=false, darkTheme=null }) => {
  const [newCategoryImageUri, setNewCategoryImageUri] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('');
  const [newCategoryImageSet, setNewCategoryImageSet] = useState(false);
  const [buttonMessage, setButtonMessage] = useState('Add Category');

  const onAddCategoryPress = async (item) => { 
    setButtonMessage('Adding Category...')  
    if (newCategoryImageUri) {
      const response = await fetch(newCategoryImageUri);
      const blob = await response.blob();
      const filename = newCategoryImageUri.substring(newCategoryImageUri.lastIndexOf('/') + 1);
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
            if (newCategoryName.length == 0) {
              set(newCategoryRef, {
                category_name: item.category_name,
                category_description: newCategoryDescription,
                num_items: 0,
                user_id: userKey,
                category_type: item.category_type || '',
                list_num: 0,
                imageUri: downloadURL,
                presetImage: true,
                num_items: 0,
                user_set_image: newCategoryImageSet
              })
              .then(() => {
                console.log('New category added with image URI.')
                setNewCategoryName('');
                setNewCategoryDescription('');
                setNewCategoryType('');
                setNewCategoryImageUri(null);
                setNewCategoryImageSet(false);
                onBackPress();
              })
              .catch((error) => console.error('Error adding new category:', error));
            } else {
              set(newCategoryRef, {
                category_name: newCategoryName.trim(),
                category_description: newCategoryDescription,
                num_items: 0,
                user_id: userKey,
                category_type: item.category_type || '',
                list_num: 0,
                imageUri: downloadURL,
                presetImage: true,
                num_items: 0,
                user_set_image: newCategoryImageSet
              })
              .then(() => {
                console.log('New category added with image URI.')
                setNewCategoryName('');
                setNewCategoryDescription('');
                setNewCategoryType('');
                setNewCategoryImageUri(null);
                setNewCategoryImageSet(false);
                onBackPress();
              })
              .catch((error) => console.error('Error adding new category:', error));
            }
          });
        }
      );
    } else {
      const newCategoryRef = push(ref(database, 'categories'));
      if (newCategoryName.length == 0) {
        set(newCategoryRef, {
          category_name: item.category_name,
          category_description: newCategoryDescription,
          num_items: 0,
          user_id: userKey,
          category_type: item.category_type || '',
          list_num: 0,
          imageUri: null, // Save the URI in the database
          latest_add: 0,
          presetImage: false,
          num_items: 0,
          user_set_image: newCategoryImageSet
        })
        .then(() => {
          console.log('New category added without image URI.')
          setNewCategoryName('');
          setNewCategoryDescription('');
          setNewCategoryType('');
          setNewCategoryImageUri(null);
          setNewCategoryImageSet(false);
          onBackPress();
        })
        .catch((error) => console.error('Error adding new category:', error));
      } else {
        set(newCategoryRef, {
          category_name: newCategoryName.trim(),
          category_description: newCategoryDescription,
          num_items: 0,
          user_id: userKey,
          category_type: item.category_type || '',
          list_num: 0,
          imageUri: null, // Save the URI in the database
          latest_add: 0,
          presetImage: false,
          num_items: 0,
          user_set_image: newCategoryImageSet
        })
        .then(() => {
          console.log('New category added without image URI.')
          setNewCategoryName('');
          setNewCategoryDescription('');
          setNewCategoryType('');
          setNewCategoryImageUri(null);
          setNewCategoryImageSet(false);
          onBackPress();
        })
        .catch((error) => console.error('Error adding new category:', error));
      }
    }
  }

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // ~ may need to change to just pictures
      allowsEditing: true,
      aspect: [4,3], // search up
      quality: 1,
    });
    setNewCategoryImageUri(result.assets[0].uri);
    setNewCategoryImageSet(true);
  }; 

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ 
        backgroundColor: isDarkMode ? darkTheme?.background : 'white', 
        padding: 10, 
        height: '100%' 
      }}>    
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {newCategoryImageUri ? (
            <>
            <TouchableOpacity onPress={pickImage}>
              <View style={{ position: 'relative', height: 100, width: 100, marginRight: 10,}}>
                <Image
                  source={{ uri: newCategoryImageUri }}
                  style={[
                    styles.addedImages,
                    { borderColor: isDarkMode ? darkTheme?.border : 'gray' }
                  ]}
                />
                <Ionicons name="pencil" size={30} color="white" style={{ position: 'absolute', bottom: 0, right: 5 }}/>
              </View>
            </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={pickImage} style={[
              styles.addedImages,
              { borderColor: isDarkMode ? darkTheme?.border : 'gray' }
            ]}>
                <Ionicons name="duplicate" size={40} color={isDarkMode ? darkTheme?.textSecondary : "gray"} />
                <Text style={{ 
                  marginTop: 8, 
                  fontWeight: 'bold', 
                  fontSize: 14, 
                  color: isDarkMode ? darkTheme?.textSecondary : 'gray' 
                }}>Add Cover Image</Text>
            </TouchableOpacity>
          )}
          
          <View style={{ width: 260 }}>
            <View style={{ flexDirection: 'row', marginTop: 15 }}>
              <Ionicons name='add-circle' size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
              <TextInput
                placeholder={'Add a list title...'}
                onChangeText={setNewCategoryName}
                value={newCategoryName}
                placeholderTextColor={isDarkMode ? darkTheme?.placeholder : "gray"}
                style={{ 
                  marginLeft: 10, 
                  fontSize: 20, 
                  flex: 1,
                  borderColor: isDarkMode ? darkTheme?.border : 'lightgrey',
                  borderBottomWidth: 1,
                  fontWeight: 'bold',
                  color: isDarkMode ? darkTheme?.textPrimary : 'black'
                }}
              />
            </View>

            <TextInput
              placeholder={'Add a list description...'}
              onChangeText={setNewCategoryDescription}
              value={newCategoryDescription}
              placeholderTextColor={isDarkMode ? darkTheme?.placeholder : "gray"}
              multiline={true}
              style={{ 
                fontSize: 16, 
                borderColor: isDarkMode ? darkTheme?.border : 'lightgrey',
                borderBottomWidth: 1,
                borderRadius: 10,
                padding: 10,
                paddingTop: 10,
                marginTop: 10,
                color: isDarkMode ? darkTheme?.textPrimary : 'black'
              }}
            />
          </View>
          
        </View>

        <View style={{ marginTop: 40 }}>
          <Text style={{ 
            fontWeight: 'bold', 
            fontSize: 14, 
            color: isDarkMode ? darkTheme?.textSecondary : 'gray', 
            paddingLeft: 5, 
            marginBottom: 5 
          }}>Choose A Category Type:</Text>
          <FlatList
            data={signInCategories}
            renderItem={({ item }) => <CategoryTile 
              category_name={item.category_name} 
              imageUri={item.imageUri} 
              num_items={-1} 
              onCategoryPress={() => {
                buttonMessage === 'Add Category' ? onAddCategoryPress(item) : {}
              }}
              fromPage={'PickCategory'}
              isDarkMode={isDarkMode}
              darkTheme={darkTheme}
            />}
            numColumns={3}
            contentContainerStyle={{}}
          />
        </View>
        
        {buttonMessage === 'Adding Category...' && (
          <View style={{ 
            marginTop: 40, 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '80%',
            marginLeft: '10%'
          }}>
            <Text style={{ 
              fontWeight: 'bold', 
              fontSize: 20, 
              color: isDarkMode ? darkTheme?.textSecondary : 'gray' 
            }}>Adding Category... 🚀</Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

export default AddCategory;