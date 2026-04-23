export const EXPLORE_INVITE_THRESHOLD = 3;

export const getRemainingExploreInvites = (inviteCount = 0) => (
  Math.max(EXPLORE_INVITE_THRESHOLD - inviteCount, 0)
);
