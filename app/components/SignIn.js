// components/Login.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, TouchableWithoutFeedback, Keyboard, Touchable, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { ref, set, onValue, off, query, orderByChild, push, equalTo, get } from "firebase/database";
import { database } from '../../firebaseConfig.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const auth = getAuth();

const styles = StyleSheet.create({
  input: {
    width: '80%', 
    fontSize: 16, 
    borderColor: 'black', 
    borderBottomWidth: 0.5, 
    marginTop: 20,
    padding: 10,
    letterSpacing: 1
  }
});

function isValidEmail(email) {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(String(email).toLowerCase());
}

const SignIn = ({ setView, setUserKeyIndex }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [code, setCode] = useState('test');
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
    'Unbounded': require('../../assets/fonts/Unbounded/Unbounded-VariableFont_wght.ttf'),
  });

  const onSignIn = async () => {
    if (password.length < 6) {
      setErrorMessage('Password too short');
      return;
    }

    if (username.length < 4) {
      setErrorMessage('Username too short');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage('Invalid email');
      return;
    }

    const usersRef = ref(database, 'users');
    const usernameQuery = query(usersRef, orderByChild('username'), equalTo(username));

    const usernameSnapshot = await get(usernameQuery);
    if (usernameSnapshot.exists()) {
      setErrorMessage('Username already exists');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    // proceed with user creation
    let userCredential = null;
    try {
       userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setErrorMessage('Email already exists!');
      console.log(error);
      return;
    }
    const user = userCredential.user;

    const newUserRef = ref(database, 'users/' + user.uid);
    setUserKeyIndex(user.uid);
    await AsyncStorage.setItem('username', username);
    await AsyncStorage.setItem('key', user.uid);
    set(newUserRef, { 
      username: username,
      email: email,
      name: username, 
      bio: username + '\'s bio',
      user_type: 'founding_member'
    })
    .then(() => console.log(`New user added`))
    .catch((error) => console.error(`Failed to add new user: ${error}`));
  }

  return (
    code === 'test' && loaded ? (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={{ flex: 1, alignItems: 'center', marginTop: '25%' }}>

          <View style={{ width: '80%' }}>
            <Text style={{ color: 'black', fontSize: 20, marginBottom: 10 }}>Welcome to</Text>
            <Text style={{ color: 'black', fontSize: 28, fontFamily: 'Poppins Bold', marginBottom: 10, fontWeight: 'bold' }}>ambora\social  🌍</Text>
            <Text style={{ color: 'gray', fontSize: 14, marginBottom: 30 }}>new gen social platform based on rankings</Text>
          </View>
          
          <View style={{ width: '100%', alignItems: 'center' }}>
            <TextInput
              placeholder="username"
              value={username}
              onChangeText={setUsername}
              placeholderTextColor={'gray'}
              style={styles.input}
            />
            <TextInput
              placeholder="email"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={'gray'}
              style={styles.input}
            />
            <TextInput
              placeholder="password"
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={'gray'}
              secureTextEntry
              style={styles.input}
            />
            <TextInput
              placeholder="confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor={'gray'}
              secureTextEntry
              style={styles.input}
            />
            {errorMessage && (
              <Text style={{ color: 'red', fontSize: 13, marginTop: 10, fontWeight: 'bold' }}>{errorMessage}</Text>
            )}
          </View>

          <View style={{ width: '100%', alignItems: 'center', marginTop: 60 }}>
            <TouchableOpacity onPress={() => onSignIn()} style={{ 
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
