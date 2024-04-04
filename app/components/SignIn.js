// components/Login.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, TouchableWithoutFeedback, Keyboard, Touchable } from 'react-native';
import { useFonts } from 'expo-font';
import { ref, set, onValue, off, query, orderByChild, push, equalTo, get } from "firebase/database";
import { database } from '../../firebaseConfig.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignIn = ({ setView, setUserKeyIndex, setUsernameIndex }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('test');
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
    'Unbounded': require('../../assets/fonts/Unbounded/Unbounded-VariableFont_wght.ttf'),
  });

  const onSignIn = async (username, password) => {
    const newUserRef = push(ref(database, 'users'));
    setUserKeyIndex(newUserRef.key);
    setUsernameIndex(username);
    await AsyncStorage.setItem('username', username);
    await AsyncStorage.setItem('key', newUserRef.key);
    set(newUserRef, { 
      username: username,
      password: password, 
      name: '', 
      bio: ''
    })
    .then(() => console.log(`New user added`))
    .catch((error) => console.error(`Failed to add new user: ${error}`));
  }

  return (
    code === 'test' && loaded ? (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={{ flex: 1, alignItems: 'center', marginTop: '40%' }}>
          <View style={{ width: '80%' }}>
            <Text style={{ color: 'black', fontSize: 20, marginBottom: 10 }}>Welcome to</Text>
            <Text style={{ color: 'black', fontSize: 28, fontFamily: 'Poppins Bold', marginBottom: 10, fontWeight: 'bold' }}>skaj\social</Text>
            <Text style={{ color: 'gray', fontSize: 14, marginBottom: 30 }}>Don't have an account? Create one here.</Text>
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
          <TouchableOpacity onPress={() => onSignIn(username, password)} style={{ 
            marginTop: '25%',
            backgroundColor: 'black',
            padding: 20,
            paddingHorizontal: 60,
            borderRadius: 30  
          }}>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', letterSpacing: 5 }}>sign up</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row' }}>
            <Text style={{ color: 'gray', fontSize: 14, marginTop: 20 }}>Have an account? </Text>
            <TouchableOpacity onPress={() => setView('login')}>
              <Text style={{ color: 'black', fontSize: 14, marginTop: 20, fontWeight: 'bold' }}>Login Here.</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ color: 'gray', fontSize: 12, marginTop: 'auto' }}>from</Text>
          <Text style={{ color: 'gray', fontSize: 12, fontWeight: 'bold', marginBottom: 20 }}>ambora labs</Text>
        </View>
      </TouchableWithoutFeedback>
    ) : loaded ? (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={{ flex: 1, alignItems: 'center', marginTop: '50%' }}>
          <Text style={{ color: 'black', fontSize: 28, fontWeight: 'bold', fontFamily: 'Poppins Regular' }}>ambora\social</Text>
          <TextInput
            placeholder="code"
            value={code}
            onChangeText={setCode}
            secureTextEntry
            style={{ 
              width: 220, 
              fontSize: 20, 
              borderColor: 'black', 
              borderWidth: 0.5, 
              marginTop: '20%',
              padding: 10,
              borderRadius: 10,
              letterSpacing: 2
            }}
          />
          <Text style={{ color: 'gray', fontSize: 12, marginTop: 'auto' }}>from</Text>
          <Text style={{ color: 'gray', fontSize: 12, fontWeight: 'bold', marginBottom: 20 }}>ambora labs</Text>
        </View>
      </TouchableWithoutFeedback>
    ) : (
      <Text>Loading...</Text>
    )
  );
};

export default SignIn;
