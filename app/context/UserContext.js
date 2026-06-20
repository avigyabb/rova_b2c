import React, { createContext, useContext, useEffect, useState } from 'react';
import { database } from '../../firebaseConfig';
import { ref, onValue } from 'firebase/database';

// The "bulletin board" — starts empty, gets filled when the app loads
const UserContext = createContext(null);

// The "bulletin board manager" — fetches the logged-in user's data once
// and makes it available to every screen inside <UserProvider>
export const UserProvider = ({ userKey, children }) => {
  const [profileInfo, setProfileInfo] = useState(null);

  useEffect(() => {
    if (!userKey) return;

    const userRef = ref(database, `users/${userKey}`);

    // onValue watches Firebase in real-time — fires immediately on load,
    // then again if the user edits their profile (name, bio, pic, etc.)
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfileInfo(snapshot.val());
      }
    });

    // When the app closes or userKey changes, stop watching Firebase
    return () => unsubscribe();
  }, [userKey]);

  return (
    <UserContext.Provider value={{ profileInfo }}>
      {children}
    </UserContext.Provider>
  );
};

// The "glance at the board" shortcut — any component calls this
// to get the logged-in user's profile with zero network calls
export const useUser = () => {
  return useContext(UserContext);
};
