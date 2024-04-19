import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import profilePic from '../../assets/images/lebron_profile_pic.webp';
import * as ImagePicker from 'expo-image-picker';

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

const AddPost = ({ setNewItemDescription, newItemDescription, newItemImageUris, setNewItemImageUris, setAddView, setAddedCustomImage }) => {
  

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // ~ may need to change to just pictures
      allowsEditing: true,
      aspect: [4,3], // search up
      quality: 1,
    });

    setNewItemImageUris([result.assets[0].uri]);
    setAddedCustomImage(true);
  }; 

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
          <TouchableOpacity onPress={() => {setAddView('')}} style={{
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
              <MaterialIcons name="add-photo-alternate" size={40} color="gray" />
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
          <TouchableOpacity style={styles.postButtons}>
            <MaterialIcons name="person-pin" size={20} color="black" />
            <Text style={{ marginLeft: 8, fontWeight: 'bold', fontSize: 14 }}>Tag Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.postButtons}>
            <MaterialIcons name="add-location" size={20} color="black" />
            <Text style={{ marginLeft: 8, fontWeight: 'bold', fontSize: 14 }}>Tag Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  )
}

export default AddPost;