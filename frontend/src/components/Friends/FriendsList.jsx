import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { UserGroupIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

const FriendsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch friends (v5 syntax)
  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/user/friends').then((res) => res.data),
  });

  // Fetch pending requests (v5 syntax)
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: () => api.get('/user/friend/requests').then((res) => res.data),
  });

  // Accept request
  const acceptMutation = useMutation({
    mutationFn: (requestId) => api.post('/user/friend/accept', { requestId }),
    onSuccess: () => {
      alert('Friend request accepted');
      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
    onError: (err) => alert(err.response?.data?.msg || 'Error'),
  });

  // Reject request (new)
  const rejectMutation = useMutation({
    mutationFn: (requestId) =>
      api.post('/user/friend/reject', { requestId }), // Assumes new endpoint
    onSuccess: () => {
      alert('Friend request rejected');
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
    onError: (err) => alert(err.response?.data?.msg || 'Error'),
  });

  // Start chat
  const startChatMutation = useMutation({
    mutationFn: (participants) =>
      api.post('/chat', { participants, isGroup: false }).then((res) => res.data),
    onSuccess: (data) => navigate(`/chat/${data._id}`),
  });

  const handleAccept = (requestId) => {
    acceptMutation.mutate(requestId);
  };

  const handleReject = (requestId) => {
    rejectMutation.mutate(requestId);
  };

  const handleChat = (friendId) => {
    startChatMutation.mutate([friendId]);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <UserGroupIcon className="h-8 w-8 text-blue-500 mr-2" />
          <h2 className="text-2xl font-bold">Friends</h2>
        </div>

        {/* Pending Requests */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Pending Requests</h3>
          {requestsLoading ? (
            <p>Loading...</p>
          ) : requests?.length ? (
            <ul className="space-y-4">
              {requests
                .filter((req) => req.status === 'pending')
                .map((req) => (
                  <li
                    key={req._id}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
                  >
                    <span>{req.from.name} (@{req.from.username})</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAccept(req._id)}
                        className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600"
                        title="Accept"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleReject(req._id)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                        title="Reject"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <p>No pending requests</p>
          )}
        </div>

        {/* Friends List */}
        <h3 className="text-xl font-semibold mb-4">Your Friends</h3>
        {friendsLoading ? (
          <p>Loading...</p>
        ) : friends?.length ? (
          <ul className="space-y-4">
            {friends.map((friend) => (
              <li
                key={friend._id}
                className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
              >
                <div className="flex items-center">
                  {friend.profilePic && (
                    <img
                      src={friend.profilePic}
                      alt={friend.name}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                  )}
                  <div>
                    <span className="font-medium">{friend.name} (@{friend.username})</span>
                    <span
                      className={`ml-2 text-sm ${
                        friend.online ? 'text-green-500' : 'text-gray-500'
                      }`}
                    >
                      {friend.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleChat(friend._id)}
                  className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                >
                  Chat
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No friends yet. Send some requests!</p>
        )}
      </div>
    </div>
  );
};

export default FriendsList;