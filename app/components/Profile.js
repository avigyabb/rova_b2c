import React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import profilePic from '../../assets/images/lebron_profile_pic.webp';

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

const categories = [
  {
    name: 'Movies',
    image: null
  },
  {
    name: 'Albums',
    image: null
  },
  {
    name: 'Home Cooked Meals',
    image: null
  },
  {
    name: 'Advice',
    image: null
  },
]

const CategoryTile = ({ name }) => {
  return (
    <TouchableOpacity style={styles.tile}>
      <Text style={styles.tileText}>{name}</Text>
      {/* Add Image component if you have an image to display */}
    </TouchableOpacity>
  );
};

const Profile = () => {

  return (
    <View style={{ backgroundColor: 'white', height: '100%' }}>
      <View style={{ flexDirection: 'row', padding: 15 }}>
        <Image
          source={profilePic}
          style={styles.profilePic}
        />
        <View>
          <Text style={{ marginLeft: 10, fontSize: 20, marginTop: 10 }}> @lebron </Text>
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
        <TouchableOpacity style={styles.editContainer}>
          <Text style={styles.editButtons}> Add List </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        renderItem={({ item }) => <CategoryTile name={item.name} />}
        keyExtractor={(item, index) => index.toString()}
        numColumns={3}
        contentContainerStyle={styles.grid}
      />
    </View> 
  )
};

export default Profile;