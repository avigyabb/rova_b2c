import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, TextInput, SafeAreaView, Alert, ImageBackground } from 'react-native';
import { Image } from 'expo-image';

const styles = StyleSheet.create({
  tile: {
    width: 129,
    height: 129,
    margin: 1,
    overflow: 'hidden', // Ensure the image is contained within the borders of the tile
  },
  tile2: {
    width: 116,
    height: 116,
    margin: 1,
    overflow: 'hidden',
  }
})

const CategoryTile = ({ category_name, imageUri, num_items, onCategoryPress, fromPage }) => {
  // console.log(pageFrom)
  return (
    <TouchableOpacity style={fromPage === 'Add' ? styles.tile2 : styles.tile} onPress={() => onCategoryPress()}>
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
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'flex-end', // Aligns child content to the bottom
          padding: 10, // Adjust or remove padding as needed
        }}>
          <Text style={{ marginLeft: 'auto', color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 'auto' }}>
            {num_items}
          </Text>
          <Text style={{
            color: 'white', // Ensures the text is visible against a dark background
            fontSize: fromPage === 'Add' ? 14 : 16, // Adjust text size as needed
            fontWeight: 'bold', // Adjust font weight as needed
          }}>
            {category_name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};  

export default CategoryTile;