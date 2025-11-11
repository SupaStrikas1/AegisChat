"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { PlusIcon } from "@heroicons/react/24/solid";
import { toast } from "react-toastify";
import { Edit2, Upload, User, X, Check } from "lucide-react";

const ProfileForm = () => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    bio: authUser?.bio || "",
    interests: authUser?.interests || [],
    profilePic: authUser?.profilePic || "",
  });

  const [newInterest, setNewInterest] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const name = authUser?.name || "";
  const username = authUser?.username || "";

  const updateMutation = useMutation({
    mutationFn: (data) => api.put("/user/profile", data),
    onSuccess: (res) => {
      const updatedUser = res.data;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      queryClient.setQueryData(["user"], updatedUser);
      toast.success("Profile updated!");
      navigate("/chats");
    },
    onError: (err) => {
      const msg = err.response?.data?.msg || "Update failed";
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        setError(msg);
      }
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post("/user/upload", fd);
    },
    onSuccess: (res) => {
      setForm({ ...form, profilePic: res.data.url });
      toast.success("Photo uploaded!");
    },
    onError: (err) => {
      setError(err.response?.data?.msg || "Upload failed");
    },
  });

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p>Loading profile...</p>
      </div>
    );
  }

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("Image must be < 5MB");
      return;
    }
    uploadMutation.mutate(file);
  };

  const addInterest = () => {
    if (newInterest && !form.interests.includes(newInterest)) {
      setForm({ ...form, interests: [...form.interests, newInterest] });
      setNewInterest("");
    }
  };

  const removeInterest = (i) => {
    setForm({ ...form, interests: form.interests.filter((x) => x !== i) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#262626]/40 backdrop-blur-sm sticky top-0 z-50 bg-[#0a0a0a]/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-[#365db7] to-[#365db7]/80 rounded-xl">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-[#171717]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#fafafa]">
              Profile
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-[#0a0a0a] border border-[#262626]/60 rounded-2xl overflow-hidden mb-6 sm:mb-8">
            <div className="h-28 sm:h-40 bg-gradient-to-r from-[#365db7]/20 via-[#009a83]/10 to-[#365db7]/10 relative" />

            <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 -mt-14 sm:-mt-20 mb-6 sm:mb-8">
                <div className="relative group flex-shrink-0">
                  <img
                    src={form.profilePic || "/placeholder.svg"}
                    alt="Profile"
                    className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl object-cover ring-4 ring-[#0a0a0a] shadow-2xl hover:shadow-[#365db7]/60 transition-shadow duration-300"
                  />
                  {isEditMode && (
                    <label className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFile}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-end gap-3 sm:gap-4">
                  <div>
                    <h2 className="text-2xl sm:text-4xl font-bold text-[#fafafa]">
                      {name}
                    </h2>
                    <p className="text-[#a1a1a1] text-sm sm:text-base mt-1">
                      @{username}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className="w-fit px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#365db7] to-[#365db7]/80 text-[#171717] font-medium text-sm sm:text-base rounded-lg hover:shadow-lg hover:from-[#365db7] hover:to-[#365db7]/70 transition-all duration-200 flex items-center gap-2 active:scale-95"
                  >
                    {isEditMode ? (
                      <>
                        <Check className="h-4 w-4" />
                        Done Editing
                      </>
                    ) : (
                      <>
                        <Edit2 className="h-4 w-4" />
                        Edit Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Bio section */}
            <div className="bg-[#0a0a0a] border border-[#262626]/60 rounded-2xl p-4 sm:p-6 lg:p-8">
              <label className="block text-sm font-semibold text-[#fafafa] mb-3">
                Bio
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                disabled={!isEditMode}
                className="w-full px-4 py-3 bg-[#0a0a0a]/50 border border-[#262626]/60 rounded-lg text-[#fafafa] placeholder-[#a1a1a1] focus:outline-none focus:ring-2 focus:ring-[#365db7]/50 focus:border-[#365db7]/50 transition-all duration-200 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                rows={4}
                placeholder="Tell us about yourself..."
              />
              <p className="text-xs text-[#a1a1a1] mt-2">
                {form.bio.length}/500 characters
              </p>
            </div>

            <div className="bg-[#0a0a0a] border border-[#262626]/60 rounded-2xl p-4 sm:p-6 lg:p-8">
              <label className="block text-sm font-semibold text-[#fafafa] mb-4">
                Interests
              </label>

              {isEditMode && (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addInterest())
                    }
                    className="flex-1 px-4 py-3 bg-[#0a0a0a]/50 border border-[#262626]/60 rounded-lg text-[#fafafa] placeholder-[#a1a1a1] focus:outline-none focus:ring-2 focus:ring-[#365db7]/50 focus:border-[#365db7]/50 transition-all duration-200"
                    placeholder="Add an interest (e.g., coding, design)"
                  />
                  <button
                    type="button"
                    onClick={addInterest}
                    className="px-4 py-3 bg-gradient-to-r from-[#009a83] to-[#009a83]/80 text-[#0a0a0a] font-medium rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2 active:scale-95"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {form.interests.length > 0 ? (
                  form.interests.map((interest) => (
                    <div
                      key={interest}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#009a83]/10 border border-[#009a83]/30 rounded-full text-[#009a83] hover:bg-[#009a83]/20 transition-colors duration-200"
                    >
                      <span className="text-sm font-medium">{interest}</span>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => removeInterest(interest)}
                          className="p-0.5 hover:bg-[#009a83]/30 rounded-full transition-colors duration-200 ml-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[#a1a1a1] text-sm">
                    No interests added yet. {isEditMode && "Add some!"}
                  </p>
                )}
              </div>
            </div>

            {isEditMode && (
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#365db7] to-[#365db7]/80 text-[#171717] font-semibold rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
              >
                {updateMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#171717]/30 border-t-[#171717] rounded-full animate-spin" />
                    Saving Profile...
                  </span>
                ) : (
                  "Save Profile"
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileForm;
