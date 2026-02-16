import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Add from './components/Add';
import Profile from './components/Profile';
import SignIn from './components/SignIn.js';
import Login from './components/Login.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feed from './components/Feed';
import Explore from './components/Explore.js';
import Groups from './components/Groups.js';
import PickCategory from './components/LoginFlow/PickCategory.js';
// import * as Analytics from 'expo-firebase-analytics';
// import analytics from '@react-native-firebase/analytics';

// Add more screens here
const ComingSoon = () => (
  <View style={{ backgroundColor: 'white', padding: 20, height: '100%' }}>
    <Text>Coming Soon!</Text>
  </View>
);

const Tab = createBottomTabNavigator();

function MyTabs({ userKey, setView, fetchUserData }) {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Profile"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconMap = {
            Feed: focused ? 'newspaper' : 'newspaper-outline',
            Explore: focused ? 'search' : 'search-outline',
            Add: focused ? 'add-circle' : 'add-circle-outline',
            Groups: focused ? 'people' : 'people-outline',
            Profile: focused ? 'person' : 'person-outline',
          };

          return <Ionicons name={iconMap[route.name] || 'ellipse'} size={focused ? 28 : 24} color={color} />;
        },
        headerShown: false,
        sceneStyle: { backgroundColor: 'white', paddingTop: insets.top },
        tabBarStyle: {
          paddingBottom: 0,
          paddingTop: 4,
          height: 50 + insets.bottom,
          backgroundColor: 'white',
          borderTopColor: 'lightgrey',
        },
        tabBarActiveTintColor: 'black',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      {/* this is wrong  */}
      <Tab.Screen 
        name="Feed" 
        component={Feed} 
        initialParams={{ 
          userKey: userKey, 
        }}
        />
      <Tab.Screen 
        name="Explore" 
        component={Explore} 
        initialParams={{ 
          userKey: userKey, 
        }}
      />
      <Tab.Screen 
        name="Add" 
        component={Add} 
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
        initialParams={{ 
          userKey: userKey, 
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={Profile} 
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

  // const logAppOpen = async () => {
  //   console.log("loc7")
  //   console.log(Analytics)
  //   try {
  //     await Analytics.logEvent('app_open');
  //   } catch (error) {
  //       console.error("Error logging the app open event:", error);
  //   }
  // };

  useEffect(() => {
    fetchUserData();
    // logAppOpen();
    // analytics().logEvent('some_event', {
    //   id: 3745092,
    //   item: 'sample_item',
    //   description: ['array', 'of', 'items'],
    // });
  }, []);
  
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {userKey ? (
        <>
          {view === 'pickCategory' ? (
            <PickCategory userKey={userKey} setView={() => setView(null)} />
          ) : (
            <MyTabs userKey={userKey} setView={setView} fetchUserData={fetchUserData} />
          )}
        </>
      ) : (
        <>
          {view === 'signin' ? (
            <SignIn setView={setView} setUserKeyIndex={setUserKey} />
          ) : (
            <Login setView={setView} setUserKeyIndex={setUserKey} />
          )}
        </>
      )}
    </View>
  );
};

export default App;
