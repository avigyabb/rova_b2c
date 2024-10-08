// components/Login.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, TouchableWithoutFeedback, Keyboard, Touchable } from 'react-native';
import { useFonts } from 'expo-font';
import { ref, set, onValue, off, query, orderByChild, push, equalTo, get, getDatabase } from "firebase/database";
import { database } from '../../firebaseConfig.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

const auth = getAuth();

const Login = ({ setView, setUserKeyIndex }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState('');
  const [page, setPage] = useState();
  const [resetEmail, setResetEmail] = useState('');
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
    'Unbounded': require('../../assets/fonts/Unbounded/Unbounded-VariableFont_wght.ttf'),
  });

  const onLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in:', userCredential.user);
      setUserKeyIndex(userCredential.user.uid);
      await AsyncStorage.setItem('key', userCredential.user.uid);
    } catch (error) {
      if (email) {
        const usersRef = ref(database, 'users');
        const emailQuery = query(usersRef, orderByChild('email'), equalTo(email));
  
        get(emailQuery).then(async (snapshot) => {
          if (!snapshot.exists()) {
            setWrongPassword('Email does not exist!');
            return;
          } else {
            setWrongPassword('Wrong password!');
          }
        }).catch((error) => {
          console.error("Error fetching user:", error);
        });
      } else {
        setWrongPassword('Please enter an email!');
      }
    }
  };

  const onSendResetEmail = () => {
    const auth = getAuth();
    const database = getDatabase();
    const emailVal = resetEmail;
    sendPasswordResetEmail(auth, emailVal).then(() => {
      alert("Check your email for password reset");
      console.log("Password reset email sent");
    }).catch(err => {
      alert("Error sending password reset email: " + err.message);
    });
    console.log(`Reset email sent to: ${resetEmail}`);
    setPage(null);
    setResetEmail('');
  };

  if (page === 'forgotPassword') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'black', fontSize: 24, marginBottom: 20, textAlign: 'left', width: '80%' }}>Forgot Your Password? 🤔</Text>
        
        <TextInput
          placeholder="email"
          value={resetEmail}
          onChangeText={setResetEmail}
          placeholderTextColor={'gray'}
          style={{ 
            width: '80%', 
            fontSize: 16, 
            borderColor: 'black', 
            borderBottomWidth: 0.5, 
            padding: 10, 
            marginBottom: 30,
            letterSpacing: 1 
          }}
        />
        
        <TouchableOpacity 
          onPress={onSendResetEmail} 
          style={{ 
            backgroundColor: 'black', 
            padding: 20, 
            paddingHorizontal: 60, 
            borderRadius: 30 
          }}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}>
            Send Reset Email
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setPage(null)}>
            <Text style={{ color: 'black', fontSize: 14, marginTop: 20, fontWeight: 'bold' }}>Back To Login.</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ flex: 1, alignItems: 'center', marginTop: '30%' }}>
        <View style={{ width: '80%' }}>
          <Text style={{ color: 'black', fontSize: 28, fontFamily: 'Poppins Bold', marginBottom: 10, fontWeight: 'bold' }}>ambora\social</Text>
          <Text style={{ color: 'gray', fontSize: 14, marginBottom: 50 }}>new gen social platform based on rankings</Text>
          <Text style={{ color: 'black', fontSize: 20, marginBottom: 30 }}>Welcome Back! 🎉</Text>
        </View>
        <TextInput
          placeholder="email"
          value={email}
          onChangeText={setEmail}
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
        <TouchableOpacity 
          onPress={() => setPage('forgotPassword')}
          style={{ 
            marginTop: 10, 
            width: '80%',
            alignItems: 'flex-end' 
          }}
        >
          <Text 
            style={{ 
              color: 'gray', 
              fontSize: 14, 
              textDecorationLine: 'underline' 
            }}
          >
            Forgot Password?
          </Text>
        </TouchableOpacity>

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
            <Text style={{ color: 'black', fontSize: 14, marginTop: 20, fontWeight: 'bold' }}>Sign up here.</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: 'gray', fontSize: 12, marginTop: 'auto' }}>from</Text>
        <Text style={{ color: 'gray', fontSize: 12, fontWeight: 'bold', marginBottom: 20 }}>ambora labs</Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Login;
