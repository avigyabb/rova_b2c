import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { signInCategories } from '../../consts';
import CategoryTile from '../CategoryTile';
import { database } from '../../../firebaseConfig';
import { ref, set, push } from "firebase/database";

const PickCategory = ({userKey, setView}) => {

  const onCategoryPress = async (item) => { 
    console.log(item)
    const newCategoryRef = push(ref(database, 'categories'));
    set(newCategoryRef, {
      category_name: item.category_name,
      category_description: '',
      num_items: 0,
      user_id: userKey,
      category_type: item.category_type,
      list_num: 0,
      imageUri: null,
      latest_add: 0,
      presetImage: false,
    })
    .catch((error) => console.error('Error adding new category:', error));
    setView();
  }
  
  return (
    <View style={{ padding: 10, height: '100%' }}>
      <Text style={{ paddingLeft: 10, paddingTop: 50, fontWeight: 'bold', fontSize: 20, marginBottom: 10 }}>What do you want to rank first?</Text>
      <Text style={{ paddingLeft: 10, color: 'gray', fontSize: 14, marginBottom: 20}}>You can add more lists to your profile later...</Text>
      <FlatList
        data={signInCategories}
        renderItem={({ item }) => <CategoryTile 
          category_name={item.category_name} 
          imageUri={item.imageUri} 
          num_items={-1} 
          onCategoryPress={() => {
            onCategoryPress(item);
          }}
          fromPage={'PickCategory'}
        />}
        numColumns={3}
        contentContainerStyle={{}}
      />
    </View>
  );
};

export default PickCategory;