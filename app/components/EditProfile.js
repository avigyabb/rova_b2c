import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  profileViews: {
    flexDirection: 'row', 
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderColor: 'lightgrey',
    borderTopWidth: 0.2,
  },
  profileText: {
    width: 80, 
    fontSize: 16,
  },
  profileInput: {
    flex: 1, 
    fontSize: 16,
    fontWeight: 'bold',
  }
});

const EditProfile = ({ profilePic }) => {
  const [name, setName] = useState('lebron');
  const [bio, setBio] = useState('lebron bio');

  return (
    <View>
      <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBackPress}> 
          <MaterialIcons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>

        <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Edit Profile</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Image
          source={profilePic}
          style={{ width: 80, height: 80, borderRadius: 40, marginTop: 20 }}
        />
        <TouchableOpacity>
          <Text style={{ marginBottom: 20, marginTop: 10, color: 'gray', fontWeight: 'bold' }}>Edit Profile Picture</Text>
        </TouchableOpacity>
        <View style={styles.profileViews}>
          <Text style={styles.profileText}>Name</Text>
          <TextInput
            placeholder={name}
            placeholderTextColor="black"
            onChangeText={setName}
            style={styles.profileInput}
          />
        </View>
        <View style={styles.profileViews}>
          <Text style={styles.profileText}>Bio</Text>
          <TextInput
            placeholder={bio}
            placeholderTextColor="black"
            onChangeText={setName}
            style={styles.profileInput}
          />
        </View>
      </View>
    </View>
  )
}

export default EditProfile
