import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import profilePic from '../../assets/images/lebron_profile_pic.webp';
import * as ImagePicker from 'expo-image-picker';
import LocationList from './AddFlow/TagLocation';
import PeopleList from './AddFlow/TagFriends';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import axios from 'axios' 
import * as FileSystem from 'expo-file-system'


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
    height: 120,
    width: 120,
    borderWidth: 2,
    marginTop: 10,
    marginBottom: 15,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'gray'
  }
});

const AddPost = ({ setNewItemDescription, newItemDescription, newItemImageUris, setNewItemImageUris, setAddView, setAddedCustomImage, taggedUsers, setTaggedUsers, userKey }) => {

  const [addPageView, setAddPageView] = useState(null);
  var safety = false;


  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Please allow photo access to add an image.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4,3],
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const selectedUri = result.assets[0].uri;

    try {
      const apiKey = "AIzaSyDxK3oZA5yBjSC0Lvrs_wyT53Jputlx-IA";
      const apiURL = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
      const base64ImageData = await FileSystem.readAsStringAsync(selectedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const requestData ={
        requests:[
          {
            image: { content: base64ImageData },
            features: [{type: "SAFE_SEARCH_DETECTION"}]
          }
        ]
      };

      const apiResponse = await axios.post(apiURL, requestData);
      const safeSearch = apiResponse?.data?.responses?.[0]?.safeSearchAnnotation;

      if (safeSearch) {
        const unsafeValues = ['LIKELY', 'VERY_LIKELY'];
        safety =
          unsafeValues.includes(safeSearch.adult) ||
          unsafeValues.includes(safeSearch.medical) ||
          unsafeValues.includes(safeSearch.violence);
      } else {
        safety = false;
      }
    } catch(error){
      // Fail-open so image upload still works if moderation API is unavailable.
      console.log('Error analyzing image', error);
      safety = false;
    }

    if (safety){
      alert("This image does not follow our guidelines");
      return;
    }

    setNewItemImageUris([selectedUri]);
    setAddedCustomImage(true);
  }; 
  // const getLocation = async () => {
  //   try {
  //     let { status } = await Location.requestForegroundPermissionsAsync();
  //     if (status !== 'granted') {
  //       alert('Permission to access location was denied');
  //       return;
  //     }
  
  //     let location = await Location.getCurrentPositionAsync({});
  //     let reverseGeocode = await Location.reverseGeocodeAsync({
  //       latitude: location.coords.latitude,
  //       longitude: location.coords.longitude
  //     });
  //     let address = reverseGeocode[0];
  //     let locationString = `${address.street}, ${address.city}, ${address.region}, ${address.country}`;
  //     console.log(locationString);
  //     return locationString;
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };  

  const getLocation = async () => {
    setAddPageView('locationList');
  }

  const getPeople = async () => {
    setAddPageView('peopleList');
  }

  if (addPageView === 'locationList') {
    return(
      <View>
        <View style={{ backgroundColor: 'white' }}>
          <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
              <TouchableOpacity onPress={() => {
                  setAddPageView(null)
              }}> 
                  <Ionicons name="arrow-back" size={30} color="black" />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Tag Location</Text>
          </View>
        </View>
        <LocationList/>
      </View>
    )
  }

  if (addPageView === 'peopleList') {
    return(
      <View>
        <View style={{ backgroundColor: 'white' }}>
          <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
              <TouchableOpacity onPress={() => {
                  setAddPageView(null)
              }}> 
                  <Ionicons name="arrow-back" size={30} color="black" />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Tag Friends</Text>
          </View>
        </View>
        <PeopleList taggedUsers={taggedUsers} setTaggedUsers={setTaggedUsers} userKey={userKey} />
      </View>
    )
  }

  const openaiAPIKey = "sk-ambora-service-tRGLRzm8TpX7LyaXbEJ1T3BlbkFJZUJGeBOwv2SUDUBYrn8o";
const openaiApi = axios.create({
  baseURL: 'https://api.openai.com/v1/moderations',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openaiAPIKey}`,
  }
});

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ backgroundColor: 'white', padding: 5, paddingLeft: 20, paddingRight: 20, height: '100%' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => {
            setAddView('')
            setNewItemDescription('')
            setNewItemImageUris([])
          }}>
            <Text style={{ fontWeight: 'bold', color: 'black', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={async () => { 
            
            try {
              const moderation_response = await openaiApi.post('', { input: newItemDescription });
              if (moderation_response.data.results[0].flagged){
                alert("This description does not follow our guidelines")
                return;
              }
              setAddView('');
            } catch (error) {
              // Fail-open so users can still continue if moderation service is unavailable.
              setAddView('');
            }
            
          }
         } style={{
            backgroundColor: 'black',
            padding: 6,
            paddingHorizontal: 10,
            borderRadius: 15
          }}>
            <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 16 }}>Done</Text>
          </TouchableOpacity>
        </View>
    
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {newItemImageUris.length > 0 && (
            <Image
              source={{ uri: newItemImageUris[0] }}
              style={[styles.addedImages, {height: 150, width: 150, borderWidth: 0.5, marginRight: 10}]}
            />
          )}
          <TouchableOpacity onPress={pickImage} style={styles.addedImages}>
              <Ionicons name="duplicate" size={40} color="gray" />
              <Text style={{ marginTop: 8, fontWeight: 'bold', fontSize: 14, color: 'gray' }}>Add Image</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 15 }}>
          <Image
            source={profilePic}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
            }}
          />
          <TextInput
            placeholder={'Add a description...'}
            value={newItemDescription}
            onChangeText={setNewItemDescription}
            placeholderTextColor="gray"
            multiline={true}
            style={{ 
              marginLeft: 10, 
              fontSize: 18, 
              flex: 1,
              height: 170
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: 'lightgray', paddingTop: 15 }}>
          <TouchableOpacity onPress={getPeople} style={styles.postButtons}>
            <Ionicons name="person-circle" size={20} color="black" />
            <Text style={{ marginLeft: 8, fontWeight: 'bold', fontSize: 14 }}>Tag Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={getLocation} style={styles.postButtons}>
            <Ionicons name="location-sharp" size={20} color="black" />
            <Text style={{ marginLeft: 8, fontWeight: 'bold', fontSize: 14 }}>Tag Location</Text>
          </TouchableOpacity>
        </View>
        {taggedUsers && taggedUsers.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {taggedUsers.map(u => (
              <View key={u.userId} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'lightgray', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 13 }}>@{u.username}</Text>
                <TouchableOpacity onPress={() => setTaggedUsers(taggedUsers.filter(t => t.userId !== u.userId))} style={{ marginLeft: 6 }}>
                  <Ionicons name="close-circle" size={16} color="gray" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </TouchableWithoutFeedback>
  )
}

export default AddPost;