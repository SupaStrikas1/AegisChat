import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { UserGroupIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";

const FriendsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedFriends, setSelectedFriends] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");

  // Fetch friends
  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: () => api.get("/user/friends").then((res) => res.data),
  });

  // Fetch pending requests
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: () => api.get("/user/friend/requests").then((res) => res.data),
  });

  // Accept request
  const acceptMutation = useMutation({
    mutationFn: (requestId) => api.post("/user/friend/accept", { requestId }),
    onSuccess: () => {
      alert("Friend request accepted");
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
    onError: (err) => alert(err.response?.data?.msg || "Error"),
  });

  // Reject request
  const rejectMutation = useMutation({
    mutationFn: (requestId) => api.post("/user/friend/reject", { requestId }),
    onSuccess: () => {
      alert("Friend request rejected");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
    onError: (err) => alert(err.response?.data?.msg || "Error"),
  });

  // Start chat
  const startChatMutation = useMutation({
    mutationFn: (friendId) =>
      api
        .post("/chat", {
          participants: [user._id, friendId], // include both users
          isGroup: false,
        })
        .then((res) => res.data),
    onSuccess: (data) => navigate(`/chats`),
  });

  const handleAccept = (requestId) => {
    acceptMutation.mutate(requestId);
  };

  const handleReject = (requestId) => {
    rejectMutation.mutate(requestId);
  };

  const handleChat = (friendId) => {
    startChatMutation.mutate(friendId);
  };

  const createGroupMutation = useMutation({
    mutationFn: (data) => {
      const user = JSON.parse(localStorage.getItem("user")); // get logged-in user
      return api
        .post("/chat", {
          ...data,
          isGroup: true,
          createdBy: user._id,
          participants: [user._id, ...data.participants], // include creator
        })
        .then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setShowGroupModal(false);
      setGroupName("");
      setSelectedFriends([]);
      navigate("/chats");
    },
  });

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <UserGroupIcon className="h-8 w-8 text-blue-500 mr-2" />
          <h2 className="text-2xl font-bold">Friends</h2>
          <button
            onClick={() => setShowGroupModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700"
          >
            + Create Group
          </button>
        </div>

        {/* Pending Requests */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Pending Requests</h3>
          {requestsLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : requests?.length ? (
            <ul className="space-y-4">
              {requests
                .filter((req) => req.status === "pending")
                .map((req) => (
                  <li
                    key={req._id}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
                  >
                    <div className="flex items-center">
                      {req.from.profilePic ? (
                        <img
                          src={req.from.profilePic}
                          alt={req.from.name}
                          className="w-10 h-10 rounded-full mr-3 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 mr-3" />
                      )}
                      <span className="font-medium">
                        {req.from.name} (@{req.from.username})
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAccept(req._id)}
                        disabled={acceptMutation.isPending}
                        className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 disabled:opacity-50"
                        title="Accept"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleReject(req._id)}
                        disabled={rejectMutation.isPending}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 disabled:opacity-50"
                        title="Reject"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-gray-500">No pending requests</p>
          )}
        </div>

        {/* Friends List */}
        <h3 className="text-xl font-semibold mb-4">Your Friends</h3>
        {friendsLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : friends?.length ? (
          <ul className="space-y-4">
            {friends.map((friend) => {
              const isSelected = selectedFriends.includes(friend._id);
              return (
                <li
                  key={friend._id}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
                >
                  <div className="flex items-center">
                    {friend.profilePic ? (
                      <img
                        src={friend.profilePic}
                        alt={friend.name}
                        className="w-10 h-10 rounded-full mr-3 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 mr-3" />
                    )}
                    <div>
                      <span className="font-medium">
                        {friend.name} (@{friend.username})
                      </span>
                      <span
                        className={`ml-2 text-sm ${
                          friend.online ? "text-green-500" : "text-gray-500"
                        }`}
                      >
                        {friend.online ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleChat(friend._id)}
                      className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 text-sm"
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFriends((prev) =>
                          prev.includes(friend._id)
                            ? prev.filter((id) => id !== friend._id)
                            : [...prev, friend._id]
                        );
                      }}
                      className={`p-2 rounded-full ${
                        isSelected ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <CheckIcon className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500">No friends yet. Send some requests!</p>
        )}

        {showGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Create Group</h3>
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 mb-4"
              />
              <p className="text-sm text-gray-600 mb-2">
                Selected: {selectedFriends.length} friend
                {selectedFriends.length !== 1 ? "s" : ""}
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowGroupModal(false);
                    setGroupName("");
                    setSelectedFriends([]);
                  }}
                  className="px-4 py-2 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!groupName.trim() || selectedFriends.length === 0) {
                      alert("Name and at least 1 friend required");
                      return;
                    }
                    createGroupMutation.mutate({
                      name: groupName,
                      participants: selectedFriends,
                    });
                  }}
                  disabled={createGroupMutation.isPending}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsList;
