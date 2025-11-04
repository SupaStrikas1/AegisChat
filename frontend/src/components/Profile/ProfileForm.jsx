import { useState, useContext, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { UserIcon, PlusIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-toastify';

const ProfileForm = () => {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    bio: authUser?.bio || '',
    interests: authUser?.interests || [],
    profilePic: authUser?.profilePic || '',
  });
  const [newInterest, setNewInterest] = useState('');

  const updateMutation = useMutation({
    mutationFn: (data) => api.put('/user/profile', data),
    onSuccess: (res) => {
      const updatedUser = res.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      queryClient.setQueryData(['user'], updatedUser);
      toast.success('Profile updated!');
      navigate('/chats');
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

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/user/upload', fd);
    },
    onSuccess: (res) => {
      setForm({ ...form, profilePic: res.data.url });
      toast.success('Photo uploaded!');
    },
    onError: (err) => {
      setError(err.response?.data?.msg || 'Upload failed');
    },
  });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error('Image must be < 5MB');
      return;
    }
    uploadMutation.mutate(file);
  };

  const addInterest = () => {
    if (newInterest && !form.interests.includes(newInterest)) {
      setForm({ ...form, interests: [...form.interests, newInterest] });
      setNewInterest('');
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
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-center mb-6">
          <UserIcon className="h-12 w-12 text-blue-500 mr-2" />
          <h2 className="text-2xl font-bold">Edit Profile</h2>
        </div>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium">Profile Picture</label>
            {form.profilePic ? (
              <img src={form.profilePic} alt="Profile" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-200 dark:bg-gray-700" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring focus:ring-blue-300"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Interests</label>
            <div className="flex items-center mt-1">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
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
              {form.interests.map((i) => (
                <span
                  key={i}
                  className="bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center"
                >
                  {i}
                  <button
                    type="button"
                    onClick={() => removeInterest(i)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-200 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileForm;