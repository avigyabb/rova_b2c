import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import Add from './components/Add';
import Profile from './components/Profile';
import SignIn from './components/SignIn.js';
import Login from './components/Login.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

function MyTabs({ userKey, username, setView, fetchUserData }) {
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
      <Tab.Screen 
        name="Add" 
        component={Add} 
        options={{headerStyle: { height: 0 }}}
        initialParams={{ 
          userKey: userKey, 
          username: username, 
          setView: setView, 
          fetchUserData: fetchUserData 
        }}
      />
      <Tab.Screen name="Groups" component={Explore} />
      <Tab.Screen 
        name="Profile" 
        component={Profile} 
        options={{headerStyle: { height: 0 }}} 
        initialParams={{ 
          userKey: userKey, 
          username: username, 
          setView: setView, 
          fetchUserData: fetchUserData 
        }}
        />
    </Tab.Navigator>
  );
}

const App = () => {
  const [view, setView] = useState('signin');
  const [username, setUsername] = useState('');
  const [userKey, setUserKey] = useState('');

  const fetchUserData = async () => {
    setUsername(await AsyncStorage.getItem('username'));
    setUserKey(await AsyncStorage.getItem('key'));
  }

  useEffect(() => {
    fetchUserData();
  }, []);
  
  return (
    <NavigationContainer independent={true}>
      {userKey && username ? (
        <MyTabs userKey={userKey} username={username} setView={setView} fetchUserData={fetchUserData}/>
      ) : view === 'signin' ? (
        <SignIn setView={setView} setUserKeyIndex={setUserKey} setUsernameIndex={setUsername} />
      ) : (
        <Login setView={setView} setUserKeyIndex={setUserKey} setUsernameIndex={setUsername} />
      )}
    </NavigationContainer>
  );
};

export default App;
