import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import Add from './components/Add';
import Profile from './components/Profile';
import SignIn from './components/SignIn.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, set, onValue, off, query, orderByChild, push, equalTo, get } from "firebase/database";
import { database } from '../firebaseConfig.js';

const Feed = () => (
  <View style={{ backgroundColor: 'white', padding: 5, paddingLeft: 20, height: '100%' }}>
    <Text style={{ fontSize: 30, fontWeight: 'bold' }}> rova </Text>
  </View>
);

// Add more screens here
const Explore = () => (
  <View style={{ backgroundColor: 'white', padding: 20, height: '100%' }}>
    <Text>Settingss</Text>
  </View>
);

const Tab = createBottomTabNavigator();

function MyTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Feed') {
            iconName = 'feed';
          } else if (route.name === 'Explore') {
            iconName = 'explore';
          } else if (route.name === 'Add') {
            iconName = 'add-circle';
          } else if (route.name === 'Groups') {
            iconName = 'groups';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }
          size = focused ? 35 : 30;

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarStyle: { paddingBottom: 0, height: '8%' },
      })}

      tabBarOptions={{
        activeTintColor: 'black',
        inactiveTintColor: 'gray',
      }}

    >
      {/* this is wrong  */}
      <Tab.Screen name="Feed" component={Feed} options={{headerStyle: { height: 0 }}}/>
      <Tab.Screen name="Explore" component={Explore} />
      <Tab.Screen name="Add" component={Add} options={{headerStyle: { height: 0 }}}/>
      <Tab.Screen name="Groups" component={Explore} />
      <Tab.Screen name="Profile" component={Profile} options={{headerStyle: { height: 0 }}}/>
    </Tab.Navigator>
  );
}

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  // useEffect(() => {
  //   const checkLoginStatus = async () => {
  //     try {
  //       const username = await AsyncStorage.getItem('username');
  //       if (username) {
  //         setUsername(username);
  //       }
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   };

  // }, []);

  const onLogin = async (username, password) => {
    // Here, you would usually validate the login credentials
    // try {
    //   await AsyncStorage.setItem('username', username);
    // } catch (error) {
    //   console.log(error);
    // }
    setIsLoggedIn(true);
    // const newUserRef = push(ref(database, 'users'));
    // set(newUserRef, { 
    //   username: username,
    //   password: password, 
    //   name: '', 
    //   bio: ''
    // })
    // .then(() => console.log(`New user added`))
    // .catch((error) => console.error(`Failed to add new user: ${error}`));
  };

  return (
    <NavigationContainer independent={true}>
      {isLoggedIn ? <MyTabs /> : <SignIn onLogin={onLogin} />}
    </NavigationContainer>
  );
};

export default App;
