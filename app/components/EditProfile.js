import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../../firebaseConfig';
import { ref, set, onValue, off, push, query, equalTo, orderByChild, get, update } from "firebase/database";


const styles = StyleSheet.create({
  profileViews: {
    flexDirection: 'row', 
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderColor: 'lightgrey',
    borderTopWidth: 0.2,
  },
  profileText: {
    width: 60, 
    fontSize: 16,
    fontStyle: 'italic',
  },
  profileInput: {
    flex: 1, 
    fontSize: 16,
    fontWeight: 'bold',
  }
});

const EditProfile = ({ userKey, onBackPress, getUserInfo }) => {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicUri, setProfilePicUri] = useState(null);
  const [buttonMessage, setButtonMessage] = useState('Save');

  useEffect(() => {
    const userRef = ref(database, 'users/' + userKey);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setName(userData.name);
        setBio(userData.bio);
        setProfilePicUri(userData.profile_pic);
      } else {
        console.log("No user data.");
      }
    }).catch((error) => {
      console.error(error);
    });
  }, []);

  const changeProfilePic = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // ~ may need to change to just pictures
      allowsEditing: true,
      aspect: [4,3], // search up
      quality: 1,
    });

    setProfilePicUri(result.assets[0].uri);
  }

  const saveProfile = async () => {

    if (name.length > 12 || name.length < 4) {
      Alert.alert(
        "Invalid Name Length, name must be between 4 and 12 characters long."
      );
      return;
    }
    if (bio.length > 200) {
      Alert.alert(
        "Invalid Bio Length, bio can be up to 200 characters long."
      );
      return;
    }

    setButtonMessage('Saving...');
    if (profilePicUri) {
      const response = await fetch(profilePicUri);
      const blob = await response.blob();
      const filename = profilePicUri.substring(profilePicUri.lastIndexOf('/') + 1);
      const storageRef = storRef(storage, filename);
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
            const userRef = ref(database, 'users/' + userKey);
            update(userRef, {
              profile_pic: downloadURL,
              name: name,
              bio: bio
            })
            .then(() => {
              console.log('Profile picture updated.')
              setButtonMessage('Save');
              onBackPress();
              getUserInfo();
            })
            .catch((error) => console.error('Error changeProfilePic:', error));
          });
        }
      )
    } else {
      const userRef = ref(database, 'users/' + userKey);
      update(userRef, {
        name: name,
        bio: bio
      })
      .then(() => {
        console.log('Profile picture updated.')
        setButtonMessage('Save');
        onBackPress();
        getUserInfo();
      })
      .catch((error) => console.error('Error changeProfilePic:', error));
    } 
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBackPress}> 
          <Ionicons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>

        <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Edit Profile</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Image
          // source={profilePic}
          source={{ uri: profilePicUri }}
          style={{ width: 80, height: 80, borderRadius: 40, marginTop: 20, borderWidth: 0.5, borderColor: 'lightgrey' }}
        />
        <TouchableOpacity onPress={() => changeProfilePic()}>
          <Text style={{ marginBottom: 20, marginTop: 10, color: 'gray', fontWeight: 'bold' }}>Edit Profile Picture</Text>
        </TouchableOpacity>
        <View style={styles.profileViews}>
          <Text style={styles.profileText}>Name</Text>
          <TextInput
            placeholder={name}
            value={name}
            placeholderTextColor="black"
            onChangeText={setName}
            style={styles.profileInput}
          />
        </View>
        <View style={styles.profileViews}>
          <Text style={styles.profileText}>Bio</Text>
          <TextInput
            placeholder={bio}
            value={bio}
            placeholderTextColor="black"
            onChangeText={setBio}
            multiline={true}
            style={[styles.profileInput, {fontWeight: 'normal', fontSize: 15}]}
          />
        </View>
        <TouchableOpacity onPress={() => saveProfile()} style={{ 
          marginTop: 100, 
          backgroundColor: 'black', 
          alignItems: 'center', 
          justifyContent: 'center', 
          paddingVertical: 15, 
          paddingHorizontal: 50, 
          borderRadius: 35 
        }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{buttonMessage}</Text>
        </TouchableOpacity>
      </View>
      </View>
    </TouchableWithoutFeedback>
  )
}

export default EditProfile
