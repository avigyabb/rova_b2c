// components/Login.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard,
  Pressable,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Google from 'expo-auth-session/providers/google';
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';
import { database } from '../../firebaseConfig.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import {
  ensureUserProfile,
  getGoogleProviderConfig,
  normalizeSocialAuthError,
  signInWithGoogleIdToken,
} from '../../socialAuth.js';

const auth = getAuth();

const Login = ({ setView, setUserKeyIndex }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState('');
  const [page, setPage] = useState();
  const [resetEmail, setResetEmail] = useState('');
  const [socialLoading, setSocialLoading] = useState('');
  const isExpoGo = Constants.appOwnership === 'expo';
  const googleConfig = getGoogleProviderConfig();
  const googleIosClientId = googleConfig.iosClientId || 'MISSING_GOOGLE_IOS_CLIENT_ID';
  const googleWebClientId = googleConfig.webClientId || 'MISSING_GOOGLE_WEB_CLIENT_ID';
  const [googleRequest, , googlePromptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: googleIosClientId,
    webClientId: googleWebClientId,
  });
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
    Unbounded: require('../../assets/fonts/Unbounded/Unbounded-VariableFont_wght.ttf'),
  });
  const loginDisabled = !email.trim() || !password;

  const handlePostAuthSuccess = async (uid) => {
    const pendingDeleteUid = await AsyncStorage.getItem('pendingDeleteAccountUid');
    if (pendingDeleteUid && pendingDeleteUid === uid) {
      alert('Deletion pending. Open your profile menu and tap "Delete account" again to permanently delete it.');
    }
    setUserKeyIndex(uid);
    await AsyncStorage.setItem('key', uid);
  };

  const onLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      await handlePostAuthSuccess(uid);
    } catch (error) {
      if (email) {
        const usersRef = ref(database, 'users');
        const emailQuery = query(usersRef, orderByChild('email'), equalTo(email));
        get(emailQuery)
          .then((snapshot) => {
            if (!snapshot.exists()) {
              setWrongPassword('Email does not exist!');
              return;
            }
            setWrongPassword('Wrong password!');
          })
          .catch((fetchError) => {
            console.error('Error fetching user:', fetchError);
          });
      } else {
        setWrongPassword('Please enter an email!');
      }
    }
  };

  const onGoogleLogin = async () => {
    if (isExpoGo) {
      setWrongPassword('Google sign-in requires a development build or standalone app. Expo Go is blocked by Google OAuth policy.');
      return;
    }

    const hasConfig =
      googleConfig.iosClientId &&
      googleConfig.webClientId &&
      !googleConfig.iosClientId.startsWith('REPLACE_') &&
      !googleConfig.webClientId.startsWith('REPLACE_') &&
      googleIosClientId !== 'MISSING_GOOGLE_IOS_CLIENT_ID' &&
      googleWebClientId !== 'MISSING_GOOGLE_WEB_CLIENT_ID';

    if (!hasConfig) {
      setWrongPassword('Google auth is not configured yet.');
      return;
    }

    if (!googleRequest) {
      setWrongPassword('Google sign-in is still loading. Try again.');
      return;
    }

    setWrongPassword('');
    setSocialLoading('google');
    try {
      const result = await googlePromptAsync();
      if (result.type !== 'success') {
        return;
      }

      const idToken = result.authentication?.idToken || result.params?.id_token;
      if (!idToken) {
        throw new Error('Google did not return an ID token.');
      }

      const userCredential = await signInWithGoogleIdToken(idToken);
      await ensureUserProfile(userCredential.user);
      await handlePostAuthSuccess(userCredential.user.uid);
    } catch (error) {
      setWrongPassword(normalizeSocialAuthError(error));
    } finally {
      setSocialLoading('');
    }
  };

  const onSendResetEmail = () => {
    const emailVal = resetEmail;
    sendPasswordResetEmail(auth, emailVal)
      .then(() => {
        alert('Check your email for password reset. NOTE: Please check your spam email!');
      })
      .catch((err) => {
        alert(`Error sending password reset email: ${err.message}`);
      });
    setPage(null);
    setResetEmail('');
  };

  if (page === 'forgotPassword') {
    return (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'white',
            paddingHorizontal: '8%',
            paddingTop: 92,
            paddingBottom: 24,
          }}
        >
          <View>
            <Text
              style={{
                color: 'black',
                fontSize: 28,
                fontFamily: loaded ? 'Poppins Bold' : undefined,
                marginBottom: 8,
                fontWeight: 'bold',
              }}
            >
              ambora\social
            </Text>
            <Text style={{ color: 'gray', fontSize: 14, marginBottom: 120 }}>
              reset your password and get back to ranking
            </Text>
            <Text style={{ color: 'black', fontSize: 22, marginBottom: 12, fontWeight: 'bold' }}>
              Forgot your password?
            </Text>
            <Text style={{ color: 'gray', fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
              Enter the email tied to your account and we&apos;ll send you a reset link.
            </Text>
          </View>

          <TextInput
            placeholder="email"
            value={resetEmail}
            onChangeText={setResetEmail}
            placeholderTextColor={'gray'}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
            style={{
              width: '100%',
              fontSize: 16,
              borderColor: 'black',
              borderBottomWidth: 0.5,
              padding: 10,
              letterSpacing: 1,
            }}
          />

          <Pressable
            onPress={onSendResetEmail}
            disabled={!resetEmail.trim()}
            style={({ hovered, pressed }) => ({
              marginTop: 32,
              backgroundColor: 'black',
              paddingVertical: 18,
              borderRadius: 30,
              alignItems: 'center',
              opacity: !resetEmail.trim() ? 0.45 : 1,
              borderWidth: hovered || pressed ? 2 : 0,
              borderColor: hovered || pressed ? '#666666' : 'transparent',
            })}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}>
              Send Reset Email
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPage(null)}
            style={({ hovered, pressed }) => ({
              marginTop: 18,
              alignItems: 'center',
              opacity: hovered || pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: 'black', fontSize: 14, fontWeight: 'bold' }}>Back To Login.</Text>
          </Pressable>

          <Text style={{ color: 'gray', fontSize: 12, marginTop: 'auto', textAlign: 'center' }}>from</Text>
          <Text style={{ color: 'gray', fontSize: 12, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
            ambora labs
          </Text>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'white',
          paddingHorizontal: '8%',
          paddingTop: 92,
          paddingBottom: 24,
        }}
      >
        <View>
          <Text
            style={{
              color: 'black',
              fontSize: 28,
              fontFamily: loaded ? 'Poppins Bold' : undefined,
              marginBottom: 8,
              fontWeight: 'bold',
            }}
          >
            ambora\social
          </Text>
          <Text style={{ color: 'gray', fontSize: 14, marginBottom: 40 }}>
            new gen social platform based on rankings
          </Text>
          <Text style={{ color: 'black', fontSize: 20, marginBottom: 24 }}>Welcome Back! 🎉</Text>
        </View>

        <View>
        <TextInput
          placeholder="email"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor={'gray'}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={{
            width: '100%',
            fontSize: 16,
            borderColor: 'black',
            borderBottomWidth: 0.5,
            marginTop: 6,
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
            width: '100%',
            fontSize: 16,
            borderColor: 'black',
            borderBottomWidth: 0.5,
            marginTop: 20,
            padding: 10,
            letterSpacing: 1
          }}
        />
        {wrongPassword && (
          <Text style={{ color: 'red', fontSize: 13, marginTop: 10, fontWeight: 'bold' }}>
            {wrongPassword}
          </Text>
        )}

        <Pressable
          onPress={() => onLogin()}
          disabled={loginDisabled}
          style={({ hovered, pressed }) => ({
            marginTop: 28,
            backgroundColor: 'black',
            paddingVertical: 18,
            borderRadius: 30,
            alignItems: 'center',
            opacity: loginDisabled ? 0.45 : 1,
            borderWidth: hovered || pressed ? 2 : 0,
            borderColor: hovered || pressed ? '#666666' : 'transparent',
          })}
        >
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', letterSpacing: 3 }}>
            log in
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setPage('forgotPassword')}
          style={({ hovered, pressed }) => ({
            marginTop: 16,
            alignItems: 'center',
            opacity: hovered || pressed ? 0.7 : 1,
          })}
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
        </Pressable>

        <View
          style={{
            marginTop: 42,
            paddingTop: 24,
            borderTopWidth: 0.5,
            borderColor: '#d1d1d1',
          }}
        >
        <Pressable
          onPress={onGoogleLogin}
          disabled={socialLoading === 'google'}
          style={({ hovered, pressed }) => ({
            backgroundColor: '#1f1f1f',
            paddingVertical: 16,
            borderRadius: 30,
            width: '100%',
            alignItems: 'center',
            opacity: socialLoading === 'google' ? 0.7 : 1,
            borderWidth: hovered || pressed ? 2 : 0,
            borderColor: hovered || pressed ? '#7a7a7a' : 'transparent',
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {socialLoading !== 'google' && (
              <AntDesign
                name="google"
                size={16}
                color="white"
                style={{ marginRight: 10 }}
              />
            )}
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              {socialLoading === 'google' ? 'Connecting...' : 'Log in with Google'}
            </Text>
          </View>
        </Pressable>
        </View>
        </View>

        <View style={{ marginTop: 36 }}>
          <Pressable
            onPress={() => setView('signin')}
            style={({ hovered, pressed }) => ({
              borderWidth: 1.5,
              borderColor: 'black',
              borderRadius: 30,
              paddingVertical: 16,
              alignItems: 'center',
              backgroundColor: hovered || pressed ? '#f4f4f4' : 'white',
            })}
          >
            <Text style={{ color: 'black', fontSize: 16, fontWeight: 'bold' }}>Create new account</Text>
          </Pressable>
        </View>

        <Text style={{ color: 'gray', fontSize: 12, marginTop: 'auto', textAlign: 'center' }}>from</Text>
        <Text style={{ color: 'gray', fontSize: 12, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
          ambora labs
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Login;
