import React from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import profilePic from '../../assets/images/lebron_profile_pic.webp';
import { database } from '../../firebaseConfig';
import { ref, set, onValue, off } from "firebase/database"; // Import 'ref' and 'set' from the database package
import { useEffect, useState } from 'react';

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

const Profile = () => {
  const [categories, setCategories] = useState({});
  const [focusedList, setFocusedList] = useState({});
  const user = 'lebron';
  console.log(focusedList);

  useEffect(() => {
    const userCategoriesRef = ref(database, `users/${user}/categories`);

    const handleValueChange = (snapshot) => {
      if (snapshot.exists()) {
        setCategories(snapshot.val());
      } else {
        setCategories({});
      }
    };

    onValue(userCategoriesRef, handleValueChange);

    // Clean up listener on unmount
    return () => off(userCategoriesRef, 'value', handleValueChange);
  }, [user]);

  onCategoryPress = (category_name) => {
    const userCategoryListRef = ref(database, `users/${user}/categories/${category_name}`);

    const handleValueChange = (snapshot) => {
      console.log(snapshot);
      if (snapshot.exists()) {
        setFocusedList(snapshot.val());
      } else {
        setFocusedList({});
      }
    };

    onValue(userCategoryListRef, handleValueChange);

    // Clean up listener on unmount
    return () => off(userCategoryListRef, 'value', handleValueChange);
  }

  const CategoryTile = ({ name }) => {
    return (
      <TouchableOpacity style={styles.tile} onPress={() => onCategoryPress(name)}>
        <Text style={styles.tileText}>{name}</Text>
      </TouchableOpacity>
    );
  };

  const ListItemTile = ({ item }) => {
    console.log("hello");
    console.log(item);
    return (
      <View>
        <Text>{item.Content}</Text>
        <Text>{item.Score}</Text>
      </View>
    );
  }

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

      {Object.keys(focusedList).length !== 0 ? (
        <>
          <TouchableOpacity onPress={() => setFocusedList({})}> 
            <Text>Back</Text> 
          </TouchableOpacity>
          <FlatList
            data={Object.values(focusedList)}
            renderItem={({ item }) => <ListItemTile item={item} />}
            keyExtractor={(item, index) => index.toString()}
            numColumns={1}
            key={"single-column"} // Add this line
          />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15}}>
          <TouchableOpacity style={styles.editContainer}>
            <Text style={styles.editButtons}> Edit Profile </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editContainer}>
            <Text style={styles.editButtons}> Add List </Text>
          </TouchableOpacity>
        </View>

          <FlatList
            data={Object.keys(categories)}
            renderItem={({ item }) => <CategoryTile name={item} />}
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