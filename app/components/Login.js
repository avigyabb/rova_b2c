// components/Login.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, TouchableWithoutFeedback, Keyboard, Touchable } from 'react-native';
import { useFonts } from 'expo-font';
import { ref, set, onValue, off, query, orderByChild, push, equalTo, get } from "firebase/database";
import { database } from '../../firebaseConfig.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Login = ({ setView, setUserKeyIndex, setUsernameIndex }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState('');
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
    'Unbounded': require('../../assets/fonts/Unbounded/Unbounded-VariableFont_wght.ttf'),
  });

  const onLogin = async () => {
    if (username) {
      const usersRef = ref(database, 'users');
      const usernameQuery = query(usersRef, orderByChild('username'), equalTo(username));

      get(usernameQuery).then(async (snapshot) => {
        let userKey = null;
        snapshot.forEach((userSnapshot) => {
          if (userSnapshot.val().password === password) {
            userKey = userSnapshot.key;
          }
        });
        
        if (userKey) {
          try {
            setUserKeyIndex(userKey);
            setUsernameIndex(username);
            await AsyncStorage.setItem('username', username);
            await AsyncStorage.setItem('key', userKey);
          } catch (error) {
            console.log(error);
          }
        } else {
          setWrongPassword('User does not exist!');
        }
      }).catch((error) => {
        console.error("Error fetching user:", error);
      });
    } else {
      setWrongPassword('Please enter a username!');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ flex: 1, alignItems: 'center', marginTop: '30%' }}>
        <View style={{ width: '80%' }}>
          <Text style={{ color: 'black', fontSize: 28, fontFamily: 'Poppins Bold', marginBottom: 10, fontWeight: 'bold' }}>skaj\social</Text>
          <Text style={{ color: 'gray', fontSize: 14, marginBottom: 50 }}>new gen social media based on rankings</Text>
          <Text style={{ color: 'black', fontSize: 20, marginBottom: 30 }}>Welcome Back! 🎉</Text>
        </View>
        <TextInput
          placeholder="username"
          value={username}
          onChangeText={setUsername}
          placeholderTextColor={'gray'}
          style={{ 
            width: '80%', 
            fontSize: 16, 
            borderColor: 'black', 
            borderBottomWidth: 0.5, 
            marginTop: 20,
            padding: 10,
            letterSpacing: 1
          }}
        />
        <TextInput
          placeholder="password"
          value={password}
          onChangeText={setPassword}
          placeholderTextColor={'gray'}
          secureTextEntry
          style={{ 
            width: '80%', 
            fontSize: 16, 
            borderColor: 'black', 
            borderBottomWidth: 0.5, 
            marginTop: 20,
            padding: 10,
            letterSpacing: 1
          }}
        />
        {wrongPassword && (
          <Text style={{ color: 'red', fontSize: 13, marginTop: 10, fontWeight: 'bold' }}>{wrongPassword}</Text>
        )}

        <TouchableOpacity onPress={() => onLogin()} style={{ 
          marginTop: '25%',
          backgroundColor: 'black',
          padding: 20,
          paddingHorizontal: 60,
          borderRadius: 30  
        }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', letterSpacing: 5 }}>login</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row' }}>
          <Text style={{ color: 'gray', fontSize: 14, marginTop: 20 }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => setView('signin')}>
            <Text style={{ color: 'black', fontSize: 14, marginTop: 20, fontWeight: 'bold' }}>Sign in here.</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: 'gray', fontSize: 12, marginTop: 'auto' }}>from</Text>
        <Text style={{ color: 'gray', fontSize: 12, fontWeight: 'bold', marginBottom: 20 }}>ambora labs</Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Login;
