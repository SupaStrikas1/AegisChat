import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../services/api";
import { Search, Send, Sparkles, Users } from "lucide-react";
import { UserPlusIcon } from "@heroicons/react/24/solid";

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Fetch recommendations
  const { data: recommendations, isLoading: recLoading } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api.get("/user/recommendations").then((res) => res.data),
  });

  // Search users
  const searchMutation = useMutation({
    mutationFn: (query) =>
      api.get(`/user/search/${query}`).then((res) => res.data),
    onSuccess: (data) => setSearchResults(data),
    onError: (err) => alert(err.response?.data?.msg || "Search failed"),
  });

  const handleSearch = () => {
    if (searchQuery.trim()) searchMutation.mutate(searchQuery.trim());
  };

  // Send friend request
  const requestMutation = useMutation({
    mutationFn: (toId) => api.post("/user/friend/request", { toId }),
    onSuccess: () => alert("Request sent"),
    onError: (err) => alert(err.response?.data?.msg || "Error"),
  });

  const handleRequest = (toId) => {
    requestMutation.mutate(toId);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-pretty leading-tight text-white">
            Discover New{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#365db7] to-[#009a83]">
              Connections
            </span>
          </h2>
          <p className="text-base sm:text-lg text-[#6f7278] max-w-2xl leading-relaxed">
            Find people with shared interests and build meaningful
            relationships. Search or explore our personalized recommendations.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 my-6 sm:my-8">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#365db7]/20 to-[#009a83]/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center bg-[#0a0a0a] border border-[#262626]/60 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-[#365db7]/50 transition-all">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-[#6f7278] mr-2 sm:mr-3 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 bg-transparent border-0 outline-none text-sm sm:text-base text-[#fafafa] placeholder:text-[#a1a1a1] min-w-0"
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#365db7] to-[#365db7]/80 text-[#171717] font-medium rounded-xl hover:shadow-lg hover:from-[#365db7] hover:to-[#365db7]/70 transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap text-sm sm:text-base"
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <section className="mb-12 sm:mb-16">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <Sparkles className="h-5 w-5 text-[#365db7] flex-shrink-0" />
                <h3 className="text-lg sm:text-xl font-semibold text-white">
                  Search Results
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {searchResults.map((user) => (
                  <div
                    key={user._id}
                    className="group relative bg-[#0a0a0a] border border-[#262626]/60 rounded-xl p-4 sm:p-5 hover:border-[#365db7]/40 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#365db7]/5 to-[#262626]/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <img
                          src={user.profilePic || "/placeholder.svg"}
                          alt={user.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-[#365db7]/20 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm sm:text-base text-[#fafafa] truncate">
                            {user.name}
                          </p>
                          <p className="text-xs sm:text-sm text-[#a1a1a1]">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRequest(user._id)}
                        disabled={requestMutation.isPending}
                        className="w-full sm:w-auto px-4 py-2 bg-[#365db7] text-[#171717] rounded-lg font-medium text-sm sm:text-base hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0"
                      >
                        <Send className="h-4 w-4 flex-shrink-0" />
                        Send Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Recommendations */}
        <h3 className="text-xl sm:text-2xl font-bold text-white">
          Recommended For You
        </h3>
        <p className="text-xs sm:text-sm text-[#a1a1a1] mt-1">
          People matched by shared interests
        </p>
        {recLoading ? (
          <p className="text-[#a1a1a1]">Loading recommendations...</p>
        ) : recommendations?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {recommendations.map((user) => (
              <div
                key={user._id}
                className="group relative bg-[#0a0a0a] border border-[#262626]/60 rounded-xl p-4 sm:p-6 hover:border-[#365db7]/40 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Gradient background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#365db7]/5 via-transparent to-[#262626]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative space-y-4 sm:space-y-5">
                  {/* User Header */}
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={user.profilePic || "/placeholder.svg"}
                          alt={user.name}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover ring-2 ring-[#365db7]/20 group-hover:ring-[#365db7]/40 transition-all duration-200"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-[#365db7] rounded-full border-2 border-[#0a0a0a]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-base sm:text-lg text-[#fafafa] truncate">
                          {user.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-[#a1a1a1]">
                          @{user.username}
                        </p>
                        <div className="mt-2 inline-flex items-center gap-2 px-2 sm:px-3 py-1 bg-[#365db7]/10 rounded-full">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#365db7] rounded-full flex-shrink-0" />
                          <span className="text-xs font-medium text-[#365db7] whitespace-nowrap">
                            {user.commonInterests} common interest
                            {user.commonInterests > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleRequest(user._id)}
                    disabled={requestMutation.isPending}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-[#365db7] to-[#365db7]/80 text-[#171717] font-medium text-sm sm:text-base rounded-lg hover:shadow-lg hover:from-[#365db7] hover:to-[#365db7]/70 transition-all duration-200 flex items-center justify-center gap-2 group/btn"
                  >
                    <Send className="h-4 w-4 flex-shrink-0" />
                    Send Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16 px-4 sm:px-6">
            <div className="inline-flex p-2 sm:p-3 bg-[#262626] rounded-full mb-3 sm:mb-4">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-[#a1a1a1]" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">No recommendations yet</h3>
            <p className="text-sm sm:text-base text-[#a1a1a1]">
              Add interests to your profile to see recommendations
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
