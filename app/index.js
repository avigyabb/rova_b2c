import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import Add from './components/Add';
import Profile from './components/Profile';
import SignIn from './components/SignIn.js';
import Login from './components/Login.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feed from './components/Feed';
import Explore from './components/Explore.js';
import { useNavigation } from '@react-navigation/native';
import Groups from './components/Groups.js';

// Add more screens here
const ComingSoon = () => (
  <View style={{ backgroundColor: 'white', padding: 20, height: '100%' }}>
    <Text>Coming Soon!</Text>
  </View>
);

const Tab = createBottomTabNavigator();

function MyTabs({ userKey, setView, fetchUserData }) {
  const navigation = useNavigation();

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

          return (
            <TouchableOpacity onPress={() => navigation.navigate(route.name)}>
              <MaterialIcons name={iconName} size={size} color={color} />
            </TouchableOpacity>
          );
        },
        tabBarStyle: { paddingBottom: 0, height: '8%' },
      })}

      tabBarOptions={{
        activeTintColor: 'black',
        inactiveTintColor: 'gray',
      }}
    >
      {/* this is wrong  */}
      <Tab.Screen 
        name="Feed" 
        component={Feed} 
        options={{headerStyle: { height: 0 }}}
        initialParams={{ 
          userKey: userKey, 
        }}
        />
      <Tab.Screen 
        name="Explore" 
        component={Explore} 
        options={{headerStyle: { height: 0 }}}
        initialParams={{ 
          userKey: userKey, 
        }}
      />
      <Tab.Screen 
        name="Add" 
        component={Add} 
        options={{headerStyle: { height: 0 }}}
        initialParams={{ 
          userKey: userKey,
          itemName: '',
          itemCategory: null,
          itemDescription: '',
          itemImage: [],
        }}
      />
      <Tab.Screen 
        name="Groups" 
        component={Groups} 
        options={{headerStyle: { height: 0 }}}
        initialParams={{ 
          userKey: userKey, 
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={Profile} 
        options={{headerStyle: { height: 0 }}} 
        initialParams={{ 
          userKey: userKey, 
          setView: setView, 
          fetchUserData: fetchUserData,
          visitingUserId: null
        }}
        />
    </Tab.Navigator>
  );
}

const App = () => {
  const [view, setView] = useState('signin');
  const [userKey, setUserKey] = useState('');

  const fetchUserData = async () => {
    setUserKey(await AsyncStorage.getItem('key'));
  }

  useEffect(() => {
    fetchUserData();
  }, []);
  
  return (
    <NavigationContainer independent={true}>
      {userKey ? (
        <MyTabs userKey={userKey} setView={setView} fetchUserData={fetchUserData}/>
      ) : view === 'signin' ? (
        <SignIn setView={setView} setUserKeyIndex={setUserKey} />
      ) : (
        <Login setView={setView} setUserKeyIndex={setUserKey} />
      )}
    </NavigationContainer>
  );
};

export default App;
