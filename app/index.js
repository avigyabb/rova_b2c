import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Add from './components/Add';
import Profile from './components/Profile';
import SignIn from './components/SignIn.js';
import Login from './components/Login.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feed from './components/Feed';
import Explore from './components/Explore.js';
import Groups from './components/Groups.js';
import PickCategory from './components/LoginFlow/PickCategory.js';
import { database } from '../firebaseConfig';
import { onValue, ref } from 'firebase/database';
import { EXPLORE_INVITE_THRESHOLD, getRemainingExploreInvites } from '../exploreInviteConfig';
import { triggerExploreInviteShare } from '../exploreInviteShare';
import { UserProvider } from './context/UserContext';
// import * as Analytics from 'expo-firebase-analytics';
// import analytics from '@react-native-firebase/analytics';

// Add more screens here
const ComingSoon = () => (
  <View style={{ backgroundColor: 'white', padding: 20, height: '100%' }}>
    <Text>Coming Soon!</Text>
  </View>
);

const ExploreLockedScreen = ({ inviteCount, setInviteCount, userKey, titleText, subtitleText }) => {
  const remainingInvites = getRemainingExploreInvites(inviteCount);
  const [isSharing, setIsSharing] = useState(false);
  const [loaded] = useFonts({
    'Poppins Regular': require('../assets/fonts/Poppins-Regular.ttf'),
  });

  return (
    <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', paddingHorizontal: 28 }}>
      <Text style={{ position: 'absolute', top: 18, left: 0, right: 0, textAlign: 'center', color: 'black', fontSize: 24, fontFamily: loaded ? 'Poppins Regular' : undefined }}>
        ambora\social
      </Text>
      <Text style={{ fontSize: 52, textAlign: 'center', marginBottom: 36 }}>
        📬
      </Text>
      <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
        {titleText}
      </Text>
      <Text style={{ fontSize: 16, color: 'gray', textAlign: 'center', lineHeight: 22, marginBottom: 80 }}>
        {subtitleText}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 80 }}>
        {remainingInvites} invite{remainingInvites === 1 ? '' : 's'} left
      </Text>
      <TouchableOpacity
        onPress={async () => {
          if (isSharing) return;
          setIsSharing(true);
          await triggerExploreInviteShare({
            userKey,
            onInviteCountUpdated: (nextInviteCount) => setInviteCount(nextInviteCount),
          });
          setIsSharing(false);
        }}
        disabled={isSharing}
        style={{ alignSelf: 'center', backgroundColor: 'black', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 }}
      >
        <Text style={{ color: 'white', fontSize: 15, fontWeight: 'bold' }}>
          {isSharing ? 'Sharing...' : 'Invite Friends'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const InviteGateScreen = ({ route, navigation, UnlockedComponent, titleText, subtitleText }) => {
  const userKey = route.params?.userKey;
  const [inviteCount, setInviteCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userKey) {
      setInviteCount(0);
      setIsLoading(false);
      return undefined;
    }

    const userRef = ref(database, `users/${userKey}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const userData = snapshot.val() || {};
      setInviteCount(typeof userData.inviteCount === 'number' ? userData.inviteCount : 0);
      setIsLoading(false);
    }, (error) => {
      console.error('Explore gate load failed:', error);
      setInviteCount(0);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userKey]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="black" />
      </View>
    );
  }

  if (inviteCount < EXPLORE_INVITE_THRESHOLD) {
    return (
      <ExploreLockedScreen
        inviteCount={inviteCount}
        setInviteCount={setInviteCount}
        userKey={userKey}
        titleText={titleText}
        subtitleText={subtitleText}
      />
    );
  }

  return <UnlockedComponent route={route} navigation={navigation} />;
};

const ExploreGateScreen = ({ route, navigation }) => (
  <InviteGateScreen
    route={route}
    navigation={navigation}
    UnlockedComponent={Explore}
    titleText={`Unlock the explore page after inviting friends!`}
    subtitleText={`See the average scores for top movies, albums, and more after inviting ${EXPLORE_INVITE_THRESHOLD} friends!`}
  />
);

const GroupsGateScreen = ({ route, navigation }) => (
  <InviteGateScreen
    route={route}
    navigation={navigation}
    UnlockedComponent={Groups}
    titleText={`Unlock the group page after inviting friends`}
    subtitleText={`See the top rankers for categories like movies, albums, and more after inviting ${EXPLORE_INVITE_THRESHOLD} friends!`}
  />
);

const Tab = createBottomTabNavigator();

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Root render crash:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Startup error</Text>
          <Text style={{ color: 'black' }}>
            {this.state.error?.message || 'Unknown startup error'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
        component={ExploreGateScreen} 
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
        component={GroupsGateScreen} 
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
    <RootErrorBoundary>
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {userKey ? (
          <>
            {view === 'pickCategory' ? (
              <PickCategory userKey={userKey} setView={() => setView(null)} />
            ) : (
              <UserProvider userKey={userKey}>
              <MyTabs userKey={userKey} setView={setView} fetchUserData={fetchUserData} />
            </UserProvider>
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
    </RootErrorBoundary>
  );
};

export default App;
