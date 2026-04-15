import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../../firebaseConfig';
import { ref, get, onValue, off, query, orderByChild, equalTo, set, remove, push, update } from 'firebase/database';
import moment from 'moment';
import CommentLikesModal from './CommentLikesModal';

const CommentItem = ({
  comment,
  commentId,
  level = 0,
  onReply,
  visitingUserId,
  itemKey,
  itemOwnerId,
  setFeedView,
  navigation
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
    onReply(commentId, userInfo.username || comment.userId, comment.userId);
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
  const indentWidth = Math.min(level * 20, 60); // Cap at 60px

  return (
    <View style={{ marginLeft: indentWidth }}>
      <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 15 }}>
        <TouchableOpacity onPress={() => visitingUserId === comment.userId ? navigation.navigate('Profile') : setFeedView({ userKey: comment.userId, username: userInfo.username })}>
          <Image
            source={userInfo.profile_pic || 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
            style={{ height: 30, width: 30, borderWidth: 0.5, marginRight: 10, borderRadius: 15, borderColor: 'lightgrey' }}
            cachePolicy="memory-and-disk"
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', marginRight: 20 }}>{userInfo.name || 'Loading...'}</Text>
            <Text style={{ color: 'grey', fontSize: 10 }}>{realDateStr}</Text>
          </View>
          <TouchableOpacity
            onLongPress={comment.userId === visitingUserId ? handleDeleteComment : undefined}
            activeOpacity={comment.userId === visitingUserId ? 0.7 : 1}
            delayLongPress={500}
          >
            <Text style={{ marginTop: 5, marginRight: 40 }}>{comment.comment}</Text>
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 15 }}>
            <TouchableOpacity onPress={handleReply}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'grey' }}>
                Reply
              </Text>
            </TouchableOpacity>

            {likeCount > 0 && (
              <TouchableOpacity onPress={() => setLikesModalVisible(true)}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: 'grey' }}>
                  {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* View replies toggle */}
          {replyCount > 0 && (
            <TouchableOpacity onPress={handleToggleExpand} style={{ marginTop: 5 }}>
              <Text style={{ fontSize: 12, color: 'grey' }}>
                {isExpanded
                  ? '——— Hide replies'
                  : `——— View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
                }
              </Text>
            </TouchableOpacity>
          )}

          {/* Render nested replies */}
          {isExpanded && replies.length > 0 && (
            <View style={{ marginTop: 5 }}>
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  commentId={reply.id}
                  level={level + 1}
                  onReply={onReply}
                  visitingUserId={visitingUserId}
                  itemKey={itemKey}
                  itemOwnerId={itemOwnerId}
                  setFeedView={setFeedView}
                  navigation={navigation}
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

        {/* Like Icon */}
        <TouchableOpacity onPress={handleLike} style={{ marginLeft: 10, alignSelf: 'flex-start', paddingTop: 5 }}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={14}
            color={liked ? "black" : "grey"}
          />
        </TouchableOpacity>
      </View>
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
