import React, { useState } from 'react';
import { Text, View, FlatList, TouchableOpacity, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { database } from '../../../firebaseConfig';
import { ref, query, orderByChild, startAt, endAt, get } from "firebase/database";

const PeopleList = ({ taggedUsers, setTaggedUsers, userKey }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [searchText, setSearchText] = useState('');

  const searchUsers = async (text) => {
    setSearchText(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    const usersRef = ref(database, 'users');
    const usernameQuery = query(
      usersRef,
      orderByChild('username'),
      startAt(text.toLowerCase()),
      endAt(text.toLowerCase() + '\uf8ff')
    );
    try {
      const snapshot = await get(usernameQuery);
      if (snapshot.exists()) {
        const results = [];
        snapshot.forEach((child) => {
          if (child.key !== userKey) {
            const userData = child.val();
            results.push({
              userId: child.key,
              name: userData.name,
              username: userData.username,
              profile_pic: userData.profile_pic,
            });
          }
        });
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const toggleUser = (user) => {
    const isSelected = taggedUsers.some(u => u.userId === user.userId);
    if (isSelected) {
      setTaggedUsers(taggedUsers.filter(u => u.userId !== user.userId));
    } else {
      setTaggedUsers([...taggedUsers, user]);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ backgroundColor: 'white', paddingHorizontal: 20, height: '100%' }}>
        <View style={{
          flexDirection: 'row',
          marginTop: 15,
          backgroundColor: 'lightgray',
          paddingHorizontal: 15,
          borderRadius: 10,
          alignItems: 'center',
          marginBottom: 10
        }}>
          <Ionicons name="search" size={24} color="black" />
          <TextInput
            placeholder={'Search by username...'}
            placeholderTextColor="gray"
            value={searchText}
            onChangeText={searchUsers}
            autoCapitalize="none"
            style={{
              fontSize: 16,
              letterSpacing: 0.4,
              paddingLeft: 10,
              fontWeight: 'bold',
              height: 50,
              flex: 1
            }}
          />
        </View>

        {taggedUsers.length > 0 && (
          <Text style={{ fontSize: 13, color: 'gray', marginBottom: 6 }}>
            Tagged: {taggedUsers.map(u => '@' + u.username).join(', ')}
          </Text>
        )}

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => {
            const isSelected = taggedUsers.some(u => u.userId === item.userId);
            return (
              <TouchableOpacity
                onPress={() => toggleUser(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 10,
                  borderBottomWidth: 0.5,
                  borderColor: 'lightgray',
                }}
              >
                <Image
                  source={item.profile_pic || 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
                  style={{ width: 45, height: 45, borderRadius: 22.5, borderWidth: 0.5, borderColor: 'lightgray' }}
                  cachePolicy="memory-and-disk"
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15 }}>{item.name}</Text>
                  <Text style={{ color: 'gray', fontSize: 13 }}>@{item.username}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color="black" />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default PeopleList;
