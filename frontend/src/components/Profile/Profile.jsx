import React, { useState, useContext } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { UserIcon, PlusIcon } from '@heroicons/react/24/solid';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    interests: user?.interests || [],
    profilePic: user?.profilePic || '',
  });
  const [newInterest, setNewInterest] = useState('');
  const [error, setError] = useState('');

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data) => api.put('/user/profile', data),
    onSuccess: (data) => {
      setForm({
        name: data.data.name,
        username: data.data.username,
        bio: data.data.bio,
        interests: data.data.interests,
        profilePic: data.data.profilePic,
      });
    },
    onError: (err) => {
      const msg = err.response?.data?.msg || 'Update failed';
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      } else {
        setError(msg);
      }
    },
  });

  // Handle file upload
  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/user/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`, // Explicitly set Authorization header
        },
      });
    },
    onSuccess: (data) => {
      setForm({ ...form, profilePic: data.data.url });
    },
    onError: (err) => {
      const msg = err.response?.data?.msg || err.message || 'Upload failed';
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      } else {
        setError(msg);
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
    navigate('/');
  };

  const addInterest = () => {
    if (newInterest && !form.interests.includes(newInterest)) {
      setForm({ ...form, interests: [...form.interests, newInterest] });
      setNewInterest('');
    }
  };

  const removeInterest = (interest) => {
    setForm({ ...form, interests: form.interests.filter((i) => i !== interest) });
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-center mb-6">
          <UserIcon className="h-12 w-12 text-blue-500 mr-2" />
          <h2 className="text-2xl font-bold">Edit Profile</h2>
        </div>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="profilePic" className="block text-sm font-medium">Profile Picture</label>
            {form.profilePic && (
              <img src={form.profilePic} alt="Profile" className="w-24 h-24 rounded-full mx-auto mb-4" />
            )}
            <input
              id="profilePic"
              type="file"
              accept="image/*"
              onChange={(e) => uploadMutation.mutate(e.target.files[0])}
              className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium">Name</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring focus:ring-blue-300"
              required
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium">Username</label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring focus:ring-blue-300"
              required
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium">Bio</label>
            <textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring focus:ring-blue-300"
              rows="4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Interests</label>
            <div className="flex items-center mt-1">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                placeholder="Add interest (e.g., coding)"
              />
              <button
                type="button"
                onClick={addInterest}
                className="ml-2 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {form.interests.map((interest) => (
                <span
                  key={interest}
                  className="bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="ml-2 text-red-500"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-200"
          >
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;