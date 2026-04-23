import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { equalTo, get, orderByChild, query, ref, set } from 'firebase/database';
import { auth, database } from './firebaseConfig.js';

const DEFAULT_USER_TYPE = 'founding_member';

function getGoogleOAuthConfig() {
  const extra =
    Constants.expoConfig?.extra ||
    Constants.manifest2?.extra?.expoClient?.extra ||
    Constants.manifest2?.extra ||
    Constants.manifest?.extra ||
    {};
  const config = extra.googleOAuth || {};
  return {
    iosClientId: config.iosClientId,
    webClientId: config.webClientId,
  };
}

function buildFallbackUsername(user) {
  const emailPrefix = user.email?.split('@')?.[0] || '';
  const display = user.displayName || '';
  const rawBase = display || emailPrefix || `user${user.uid.slice(0, 6)}`;
  const sanitized = rawBase.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

  if (!sanitized) {
    return `user${user.uid.slice(0, 6)}`;
  }

  if (sanitized.length >= 4) {
    return sanitized.slice(0, 24);
  }

  return `${sanitized}${user.uid.slice(0, 6)}`.slice(0, 24);
}

async function usernameExists(usernameCandidate) {
  const usersRef = ref(database, 'users');
  const usernameQuery = query(
    usersRef,
    orderByChild('username_lowercase'),
    equalTo(usernameCandidate.toLowerCase())
  );
  const snapshot = await get(usernameQuery);
  return snapshot.exists();
}

async function buildUniqueUsername(user) {
  const base = buildFallbackUsername(user);
  const options = [
    base,
    `${base}${user.uid.slice(0, 3)}`,
    `${base}${user.uid.slice(3, 6)}`,
    `${base}${user.uid.slice(6, 9)}`,
  ].map((item) => item.slice(0, 30));

  for (const candidate of options) {
    if (candidate && !(await usernameExists(candidate))) {
      return candidate;
    }
  }

  return `user${user.uid.slice(0, 10)}`;
}

export async function createAppleNoncePair() {
  const rawNonce = `${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  return { rawNonce, hashedNonce };
}

export function getGoogleProviderConfig() {
  return getGoogleOAuthConfig();
}

export async function signInWithGoogleIdToken(idToken) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signInWithAppleIdentityToken(identityToken, rawNonce) {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce,
  });

  return signInWithCredential(auth, credential);
}

export async function ensureUserProfile(user) {
  const userRef = ref(database, `users/${user.uid}`);
  const snapshot = await get(userRef);
  if (snapshot.exists()) {
    return { profile: snapshot.val(), created: false };
  }

  const username = await buildUniqueUsername(user);
  const displayName = user.displayName || username;
  const payload = {
    username,
    username_lowercase: username.toLowerCase(),
    email: user.email || '',
    name: displayName,
    bio: `${displayName}'s bio`,
    user_type: DEFAULT_USER_TYPE,
    termsAccepted: true,
    termsAcceptedAt: Date.now(),
  };

  await set(userRef, payload);
  return { profile: payload, created: true };
}

export function normalizeSocialAuthError(error) {
  if (!error) return 'Social sign-in failed. Please try again.';
  if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
    return 'Sign-in cancelled.';
  }
  if (error.code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with a different sign-in method.';
  }
  if (error.code === 'auth/invalid-credential') {
    return 'Invalid sign-in credentials. Please try again.';
  }
  if (error.code === 'auth/popup-closed-by-user') {
    return 'Sign-in was cancelled before completion.';
  }
  return error.message || 'Social sign-in failed. Please try again.';
}
