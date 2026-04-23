import { Alert, Share } from 'react-native';
import { ref, runTransaction } from 'firebase/database';
import { database } from './firebaseConfig';
import { EXPLORE_INVITE_THRESHOLD } from './exploreInviteConfig';

export const triggerExploreInviteShare = async ({ userKey, onInviteCountUpdated }) => {
  if (!userKey) {
    console.error('Missing userKey for invite share.');
    return null;
  }

  try {
    const result = await Share.share({
      message: 'Download the app and rank with me on ambora\\social!',
      url: 'https://ishortn.ink/download-ambora-app',
    });

    if (result.action === Share.dismissedAction) {
      console.log('Dismissed');
      return null;
    }

    const inviteCountRef = ref(database, `users/${userKey}/inviteCount`);
    const transactionResult = await runTransaction(inviteCountRef, (currentInviteCount) => {
      const safeInviteCount = typeof currentInviteCount === 'number' ? currentInviteCount : 0;
      return safeInviteCount + 1;
    });
    const nextInviteCount = transactionResult.snapshot.val() || 0;

    if (onInviteCountUpdated) {
      onInviteCountUpdated(nextInviteCount);
    }

    if (result.activityType) {
      console.log('Shared with activity type: ', result.activityType);
    } else {
      console.log('Shared');
    }

    if (nextInviteCount >= EXPLORE_INVITE_THRESHOLD) {
      Alert.alert('Explore unlocked', 'You have invited enough friends to unlock Explore.');
    } else {
      Alert.alert(
        'Invite sent',
        `${nextInviteCount} of ${EXPLORE_INVITE_THRESHOLD} invites completed.`
      );
    }

    return nextInviteCount;
  } catch (error) {
    console.error('Error sharing:', error);
    return null;
  }
};
