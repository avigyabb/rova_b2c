import React from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import profilePic from '../../assets/images/lebron_profile_pic.webp';
import { database } from '../../firebaseConfig';
import { ref, set, onValue, off, push, query, equalTo, orderByChild, get } from "firebase/database"; // Import 'ref' and 'set' from the database package
import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { launchImageLibrary } from 'react-native-image-picker';

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
  },
  listTileScore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderColor: 'green',
    borderWidth: 3
  }
});

const Profile = () => {
  const [categories, setCategories] = useState({});
  const [focusedCategory, setFocusedCategory] = useState(null);
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
    // console.log(category_id)
    // const userCategoryListRef = ref(database, `categories/${category_id}`);

    // // change this to get ~
    // const handleValueChange = (snapshot) => {
    //   console.log(snapshot)
    //   if (snapshot.exists()) {
    //     setFocusedList(snapshot.val());
    //     setFocusedCategory(category_name);
    //   }
    // };

    // onValue(userCategoryListRef, handleValueChange);

    // // Clean up listener on unmount
    // return () => off(userCategoryListRef, 'value', handleValueChange);

    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(category_id));

    get(categoryItemsQuery).then((snapshot) => {
      setFocusedList(snapshot.val());
      setFocusedCategory(category_name);
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

  const selectImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 1 });
    if (result.assets && result.assets.length > 0) { // don't understand the reason for this ~
      const uri = result.assets[0].uri;
      uploadImage(uri);
    }
  };

  const selectAndUploadImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 1,
    };
  
    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        const uri = response.assets[0].uri;
        const imageName = `images/${Date.now()}`; // Create a unique name for the image
        const imgStorageRef = storageRef(storage(), imageName);
        
        try {
          const imgBlob = await (await fetch(uri)).blob(); // Fetch the image as a blob
          await uploadBytes(imgStorageRef, imgBlob); // Upload blob to Firebase Storage
          const imgUrl = await getDownloadURL(imgStorageRef); // Get the download URL
          console.log('Image uploaded and download URL fetched');
          
          // Push new image reference to the Firebase Realtime Database
          const newImageRef = push(databaseRef(database, 'images'));
          await set(newImageRef, { imageUrl: imgUrl, createdAt: Date.now() });
          console.log('Image URL saved to the database');
        } catch (error) {
          console.error('Error during the image upload:', error);
        }
      }
    });
  };

  const CategoryTile = ({ category_name, category_id }) => {
    return (
      <TouchableOpacity style={styles.tile} onPress={() => onCategoryPress(category_name, category_id)}>
        <Text style={styles.tileText}>{category_name}</Text>
      </TouchableOpacity>
    );
  };

  const ListItemTile = ({ item }) => {
    console.log(item)
    return (
      <View style={{ padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: 'bold' }}>{item.content}</Text>
        <View style={styles.listTileScore}>
          <Text style={{ color: 'green', fontWeight: 'bold' }}>{item.score.toFixed(1)}</Text>
        </View>
      </View>
    );
  }

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

          <TouchableOpacity onPress={() => selectAndUploadImage}>
            <Text>Upload Image</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{width: 70, height: 70, borderRadius: 35, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', marginTop: 20}} onPress={() => onAddCategoryPress(addCategoryName)}>
            <Text style={{color: 'white', fontWeight: 'bold'}}>Add</Text>
          </TouchableOpacity>
        </>
      ) : focusedCategory ? (
        <>
          <View style={{ flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderColor: 'lightgrey' }}>
            <TouchableOpacity onPress={() => onBackPress()}> 
              <MaterialIcons name="arrow-back" size={30} color="black" />
            </TouchableOpacity>

            <Text style={{ marginLeft: 'auto', marginRight: 10, fontSize: 15, fontWeight: 'bold' }}> {focusedCategory}</Text>
          </View>

          {focusedList ? (           
            <FlatList
              data={Object.values(focusedList)}
              renderItem={({ item }) => <ListItemTile item={item} />}
              keyExtractor={(item, index) => index.toString()}
              numColumns={1}
              key={"single-column"}
            />
          ) : (
            <Text>Add some items to this category!</Text>
          )}
        </>
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