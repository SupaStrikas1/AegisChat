import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { UserGroupIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";
import { MessageSquareIcon } from "lucide-react";

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
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#365db7] to-[#009a83] rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-[#171717]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#365db7] to-[#009a83] bg-clip-text">
              Friends
            </h1>
          </div>
          <button
            onClick={() => setShowGroupModal(true)}
            className="w-full sm:w-auto px-4 py-2 sm:py-3 bg-gradient-to-r from-[#365db7] to-[#009a83] text-[#171717] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#009a83]/20 transition-all duration-300"
          >
            + Create Group
          </button>
        </div>

        {/* Pending Requests */}
        <div className="my-8">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
              Friend Requests
            </h2>
            {/* <p className="text-[#a1a1a1]">
                You have {requests.length} pending request{requests.length !== 1 ? "s" : ""}
              </p> */}
          </div>
          {requestsLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : requests?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {requests
                .filter((req) => req.status === "pending")
                .map((req) => (
                  <div
                    key={req._id}
                    className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4 sm:p-6 hover:border-[#009a83]/50 transition-all duration-300 flex justify-between"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={req.from.profilePic || "/placeholder.svg"}
                          alt={req.from.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">
                            {req.from.name}
                          </h3>
                          <p className="text-sm text-[#a1a1a1] truncate">
                            @{req.from.username}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAccept(req._id)}
                        disabled={acceptMutation.isPending}
                        className="flex-1 sm:flex-none px-4 py-2 bg-[#365db7] hover:bg-[#365db7]/90 text-[#171717] rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:shadow-[#365db7]/20"
                        title="Accept"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleReject(req._id)}
                        disabled={rejectMutation.isPending}
                        className="flex-1 sm:flex-none px-4 py-2 bg-[#e7000b]/20 hover:bg-[#e7000b]/30 text-[#e7000b] rounded-lg font-medium transition-all duration-300"
                        title="Reject"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-[#a1a1a1]">No pending requests</p>
          )}
        </div>

        {/* Friends List */}
        <h3 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
          Your Friends
        </h3>
        {friendsLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : friends?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {friends.map((friend) => {
              const isSelected = selectedFriends.includes(friend._id);
              return (
                <div
                  key={friend._id}
                  className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4 sm:p-6 hover:border-[#009a83]/50 hover:shadow-lg hover:shadow-[#009a83]/10 transition-all duration-300"
                >
                  <div className="flex flex-col">
                    <div className="flex items-start gap-3 mb-4">
                      <img
                        src={friend.profilePic || "/placeholder.svg"}
                        alt={friend.name}
                        className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {friend.name}
                        </h3>
                        <p className="text-sm text-[#a1a1a1] truncate mb-2">
                          @{friend.username}
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              friend.online ? "bg-[#009a83]" : "bg-[#a1a1a1]"
                            }`}
                          />
                          <span className="text-xs font-medium text-[#a1a1a1]">
                            {friend.online ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleChat(friend._id)}
                      className="flex-1 px-3 py-2 bg-[#365db7] hover:bg-[#365db7]/90 text-[#171717] rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300"
                    >
                      <MessageSquareIcon className="h-4 w-4" />
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
                      className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                        isSelected
                          ? "bg-[#009a83] text-[#fafafa]"
                          : "bg-[#262626] hover:bg-[#262626]/80 text-[#a1a1a1]"
                      }`}
                    >
                      <CheckIcon className="h-4 w-4 inline mr-2" />
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <UserGroupIcon className="h-16 w-16 mx-auto text-[#a1a1a1]/40 mb-4" />
            <p className="text-[#a1a1a1] text-lg">
              No friends yet. Send some requests!
            </p>
          </div>
        )}

        {showGroupModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg w-full max-w-md p-6 sm:p-8 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6">Create Group</h3>
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-[#fafafa] placeholder-[#a1a1a1] focus:outline-none focus:border-[#009a83] focus:ring-2 focus:ring-[#009a83]/20 mb-6 transition-all duration-300"
              />
              <div className="bg-[#0a0a0a]/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-[#a1a1a1]">
                  <span className="font-semibold text-[#fafafa]">
                    {selectedFriends.length}
                  </span>{" "}
                  friend
                  {selectedFriends.length !== 1 ? "s" : ""} selected
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    setShowGroupModal(false);
                    setGroupName("");
                    setSelectedFriends([]);
                  }}
                  className="flex-1 px-4 py-2 sm:py-3 bg-[#262626] hover:bg-[#262626]/80 text-[#fafafa] rounded-lg font-medium transition-all duration-300"
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
                  className="flex-1 px-4 py-2 sm:py-3 bg-gradient-to-r from-[#365db7] to-[#009a83] text-[#171717] rounded-lg font-medium hover:shadow-lg hover:shadow-[#009a83]/20 transition-all duration-300"
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
