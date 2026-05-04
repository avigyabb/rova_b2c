import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../../firebaseConfig';
import { ref, get, onValue, off, query, orderByChild, equalTo, set, remove, push, update } from 'firebase/database';
import moment from 'moment';
import CommentLikesModal from './CommentLikesModal';
import CommentText from './CommentText';

const CommentItem = ({
  comment,
  commentId,
  level = 0,
  onReply,
  visitingUserId,
  itemKey,
  itemOwnerId,
  setFeedView,
  navigation,
  onCloseComments
}) => {
  const [userInfo, setUserInfo] = useState({});
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentLikes, setCommentLikes] = useState({});
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyCount, setReplyCount] = useState(comment.replyCount || 0);

  // Fetch user info
  useEffect(() => {
    const userRef = ref(database, `users/${comment.userId}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setUserInfo(snapshot.val());
      }
    });
  }, [comment.userId]);

  // Set up real-time listener for comment likes
  useEffect(() => {
    const likesRef = ref(database, `items/${itemKey}/comments/${commentId}/likes`);
    const unsubscribe = onValue(likesRef, (snapshot) => {
      const likes = snapshot.val() || {};
      setCommentLikes(likes);
      setLikeCount(Object.keys(likes).length);
      setLiked(!!likes[visitingUserId]);
    });

    return () => off(likesRef, 'value', unsubscribe);
  }, [commentId, itemKey, visitingUserId]);

  // Set up real-time listener for reply count
  useEffect(() => {
    const commentRef = ref(database, `items/${itemKey}/comments/${commentId}/replyCount`);
    const unsubscribe = onValue(commentRef, (snapshot) => {
      const count = snapshot.val() || 0;
      setReplyCount(count);
    });

    return () => off(commentRef, 'value', unsubscribe);
  }, [commentId, itemKey]);

  // Fetch replies when expanded
  useEffect(() => {
    if (isExpanded && replyCount > 0) {
      fetchReplies();
    }
  }, [isExpanded, replyCount]);

  const fetchReplies = async () => {
    const repliesQuery = query(
      ref(database, `items/${itemKey}/comments`),
      orderByChild('parentCommentId'),
      equalTo(commentId)
    );

    const snapshot = await get(repliesQuery);
    if (snapshot.exists()) {
      const repliesData = Object.keys(snapshot.val()).map(key => ({
        id: key,
        ...snapshot.val()[key]
      })).sort((a, b) => a.timestamp - b.timestamp);
      setReplies(repliesData);
    } else {
      setReplies([]);
    }
  };

  const handleLike = async () => {
    // Optimistic update
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);

    // Firebase update
    try {
      const likeRef = ref(database, `items/${itemKey}/comments/${commentId}/likes/${visitingUserId}`);
      const currentlyLiked = liked;

      if (currentlyLiked) {
        await remove(likeRef);
      } else {
        await set(likeRef, true);

        // Create notification for comment author (if not liking own comment)
        if (comment.userId !== visitingUserId) {
          const eventsRef = push(ref(database, `events/${comment.userId}`));
          const excerpt = comment.comment.length > 30
            ? comment.comment.substring(0, 30) + '...'
            : comment.comment;

          await set(eventsRef, {
            evokerId: visitingUserId,
            content: `liked your comment: "${excerpt}"`,
            timestamp: Date.now(),
            postId: itemKey,
            commentId: commentId, // NEW: Include commentId for deep linking
            type: 'comment_like'
          });

          await update(ref(database, `users/${comment.userId}`), {
            unreadNotifications: true
          });
        }
      }
    } catch (error) {
      // Revert on error
      setLiked(liked);
      setLikeCount(liked ? likeCount + 1 : likeCount - 1);
      console.error('Error toggling like:', error);
    }
  };

  const handleReply = () => {
    // Ensure we use the username handle for @mentions, not the display name
    // Priority: username field > fallback to fetching from Firebase
    const usernameForMention = userInfo?.username || 'user';

    console.log('Reply - userInfo:', userInfo);
    console.log('Using username:', usernameForMention);

    onReply(commentId, usernameForMention, comment.userId, level);
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleDeleteComment = async () => {
    // Only allow user to delete their own comments
    if (comment.userId !== visitingUserId) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the comment from Firebase
              const commentRef = ref(database, `items/${itemKey}/comments/${commentId}`);
              await remove(commentRef);

              // If this is a reply, decrement parent's reply count
              if (comment.parentCommentId) {
                const parentReplyCountRef = ref(database, `items/${itemKey}/comments/${comment.parentCommentId}/replyCount`);
                const parentSnapshot = await get(parentReplyCountRef);
                const currentCount = parentSnapshot.val() || 0;
                if (currentCount > 0) {
                  await set(parentReplyCountRef, currentCount - 1);
                }
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          }
        }
      ]
    );
  };

  const realDateStr = moment(comment.timestamp).fromNow();
  // Only apply indent to level 1 (direct replies)
  // Level 2+ replies are nested inside level 1, so they inherit the indent automatically
  const indentWidth = level === 1 ? 48 : 0;

  return (
    <View style={{ marginLeft: indentWidth }}>
      <View style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={() => visitingUserId === comment.userId ? navigation.navigate('Profile') : setFeedView({ userKey: comment.userId, username: userInfo.username })}>
          <Image
            source={userInfo.profile_pic || 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
            style={{ height: 32, width: 32, borderRadius: 16 }}
            cachePolicy="memory-and-disk"
          />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          {/* Username and timestamp */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#000', marginRight: 8 }}>
              {userInfo.name || 'Loading...'}
            </Text>
            <Text style={{ fontSize: 12, color: '#737373' }}>
              {realDateStr}
            </Text>
            {itemOwnerId === comment.userId && (
              <Text style={{ fontSize: 12, color: '#737373', marginLeft: 4 }}>
                · by author
              </Text>
            )}
          </View>

          {/* Comment text */}
          <TouchableOpacity
            onLongPress={comment.userId === visitingUserId ? handleDeleteComment : undefined}
            activeOpacity={comment.userId === visitingUserId ? 0.7 : 1}
            delayLongPress={500}
          >
            <View style={{ marginBottom: 8 }}>
              <CommentText
                text={comment.comment}
                setFeedView={setFeedView}
                navigation={navigation}
                onCloseComments={onCloseComments}
              />
            </View>
          </TouchableOpacity>

          {/* Action row: Reply and like count */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={handleReply}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#737373' }}>
                Reply
              </Text>
            </TouchableOpacity>

            {likeCount > 0 && (
              <TouchableOpacity onPress={() => setLikesModalVisible(true)} style={{ marginLeft: 14 }}>
                <Text style={{ fontSize: 13, color: '#737373' }}>
                  {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* View replies toggle */}
          {replyCount > 0 && (
            <TouchableOpacity onPress={handleToggleExpand} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: '#737373' }}>
                {isExpanded
                  ? `Hide ${replyCount === 1 ? 'reply' : 'replies'}`
                  : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Like Icon */}
        <TouchableOpacity onPress={handleLike} style={{ paddingLeft: 12, paddingTop: 4 }}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={16}
            color={liked ? "#000" : "#737373"}
          />
        </TouchableOpacity>
      </View>

      {/* Render nested replies */}
      {isExpanded && replies.length > 0 && (
        <View>
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              commentId={reply.id}
              level={Math.min(level + 1, 2)}
              onReply={onReply}
              visitingUserId={visitingUserId}
              itemKey={itemKey}
              itemOwnerId={itemOwnerId}
              setFeedView={setFeedView}
              navigation={navigation}
              onCloseComments={onCloseComments}
            />
          ))}
        </View>
      )}

      {/* Likes Modal */}
      {likesModalVisible && (
        <CommentLikesModal
          visible={likesModalVisible}
          onClose={() => setLikesModalVisible(false)}
          likes={commentLikes}
          setFeedView={setFeedView}
          visitingUserId={visitingUserId}
          navigation={navigation}
        />
      )}
    </View>
  );
};

export default React.memo(CommentItem, (prevProps, nextProps) => {
  return (
    prevProps.comment.id === nextProps.comment.id &&
    JSON.stringify(prevProps.comment.likes) === JSON.stringify(nextProps.comment.likes) &&
    prevProps.comment.replyCount === nextProps.comment.replyCount &&
    prevProps.comment.comment === nextProps.comment.comment
  );
});
