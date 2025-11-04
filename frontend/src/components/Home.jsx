import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { UserPlusIcon } from '@heroicons/react/24/solid';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Fetch recommendations
  const { data: recommendations, isLoading: recLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.get('/user/recommendations').then((res) => res.data),
  });

  // Search users
  const searchMutation = useMutation({
    mutationFn: (query) => api.get(`/user/search/${query}`).then((res) => res.data),
    onSuccess: (data) => setSearchResults(data),
    onError: (err) => alert(err.response?.data?.msg || 'Search failed'),
  });

  const handleSearch = () => {
    if (searchQuery.trim()) searchMutation.mutate(searchQuery.trim());
  };

  // Send friend request
  const requestMutation = useMutation({
    mutationFn: (toId) => api.post('/user/friend/request', { toId }),
    onSuccess: () => alert('Request sent'),
    onError: (err) => alert(err.response?.data?.msg || 'Error'),
  });

  const handleRequest = (toId) => {
    requestMutation.mutate(toId);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <UserPlusIcon className="h-8 w-8 text-blue-500 mr-2" />
          <h1 className="text-2xl font-bold">Home</h1>
        </div>

        {/* Search */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Search Users</h2>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search by username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring focus:ring-blue-300"
            />
            <button
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              className="ml-2 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-200 disabled:opacity-50"
            >
              Search
            </button>
          </div>

          {searchResults.length > 0 && (
            <ul className="mt-4 space-y-2">
              {searchResults.map((user) => (
                <li
                  key={user._id}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
                >
                  <div className="flex items-center">
                    {user.profilePic ? (
                      <img
                        src={user.profilePic}
                        alt={user.name}
                        className="w-10 h-10 rounded-full mr-3 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 mr-3" />
                    )}
                    <span className="font-medium">
                      {user.name} (@{user.username})
                    </span>
                  </div>
                  <button
                    onClick={() => handleRequest(user._id)}
                    disabled={requestMutation.isPending}
                    className="bg-green-500 text-white px-4 py-1 rounded-md hover:bg-green-600 text-sm disabled:opacity-50"
                  >
                    Send Request
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recommendations */}
        <h2 className="text-xl font-semibold mb-2">Recommended Users</h2>
        {recLoading ? (
          <p className="text-gray-500">Loading recommendations...</p>
        ) : recommendations?.length ? (
          <ul className="space-y-2">
            {recommendations.map((user) => (
              <li
                key={user._id}
                className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
              >
                <div className="flex items-center">
                  {user.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt={user.name}
                      className="w-10 h-10 rounded-full mr-3 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 mr-3" />
                  )}
                  <div>
                    <span className="font-medium">
                      {user.name} (@{user.username})
                    </span>
                    <p className="text-sm text-gray-500">
                      {user.commonInterests} common interest{user.commonInterests > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRequest(user._id)}
                  disabled={requestMutation.isPending}
                  className="bg-green-500 text-white px-4 py-1 rounded-md hover:bg-green-600 text-sm disabled:opacity-50"
                >
                  Send Request
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No recommendations yet. Add interests to your profile!</p>
        )}
      </div>
    </div>
  );
};

export default Home;