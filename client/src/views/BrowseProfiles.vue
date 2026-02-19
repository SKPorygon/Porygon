<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center py-10"
  >
    <div class="w-full max-w-7xl px-4">
      <div class="bg-white shadow-2xl rounded-2xl overflow-hidden">
        <!-- Header -->
        <div
          class="bg-blue-600 text-white p-6 flex justify-between items-center"
        >
          <div>
            <h1 class="text-4xl font-extrabold mb-2">Browse All Profiles</h1>
            <p class="text-blue-100">Discover and request access to profiles</p>
          </div>
          <router-link
            to="/requests"
            class="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-lg transition-all font-medium flex items-center shadow-lg hover:shadow-xl relative"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            View My Requests
            <span v-if="pendingRequestsCount > 0" class="absolute -top-2 -right-2 bg-amber-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {{ pendingRequestsCount > 9 ? '9+' : pendingRequestsCount }}
            </span>
          </router-link>
        </div>

        <!-- Search -->
        <div class="p-6 bg-gray-50 border-b">
          <div class="flex-grow relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search profiles by name or namespace..."
              class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <!-- Profiles Grid -->
        <div class="p-6">
          <div v-if="loading" class="text-center py-10">
            <div
              class="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto"
            ></div>
            <p class="mt-4 text-gray-600">Loading profiles...</p>
          </div>
          <div
            v-else
            class="grid gap-6 lg:grid-cols-2 xl:grid-cols-3"
          >
            <div
              v-for="profile in filteredProfiles"
              :key="profile._id"
              class="bg-white shadow-lg rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 hover:border-blue-300"
            >
              <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                  <h2 class="text-2xl font-bold text-gray-800 mb-1">
                    {{ profile.name }}
                  </h2>
                  <span class="text-sm text-gray-500 font-medium"
                    >{{ profile.namespace }}</span
                  >
                </div>
                <span
                  v-if="profile.hasAccess"
                  class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ml-3"
                  :class="{
                    'bg-blue-100 text-blue-700 border border-blue-200': profile.userRole === 'admin',
                    'bg-blue-50 text-blue-600 border border-blue-100': profile.userRole === 'editor',
                    'bg-gray-100 text-gray-700 border border-gray-200': profile.userRole === 'viewer',
                  }"
                >
                  {{ profile.userRole || 'Member' }}
                </span>
                <span
                  v-else-if="profile.requestPending"
                  class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ml-3 bg-amber-50 text-amber-700 border border-amber-200"
                >
                  Pending
                </span>
              </div>

              <div class="mb-6 flex items-center text-sm text-gray-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-2 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span class="font-medium">
                  <strong class="text-gray-800">{{ profile.services?.length || 0 }}</strong> service{{ profile.services?.length !== 1 ? 's' : '' }}
                </span>
              </div>

              <!-- User has access -->
              <div v-if="profile.hasAccess" class="mt-4">
                <router-link
                  :to="`/profiles`"
                  class="block w-full text-center bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm hover:shadow-md"
                >
                  View Profile
                </router-link>
              </div>
              
              <!-- Request pending -->
              <div v-else-if="profile.requestPending" class="mt-4">
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div class="flex items-center justify-center mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 text-amber-600 mr-2 animate-pulse"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p class="text-amber-800 font-semibold text-sm">
                      Request Pending Approval
                    </p>
                  </div>
                  <p class="text-xs text-amber-600 text-center mb-3">
                    Waiting for admin approval...
                  </p>
                  <router-link
                    to="/requests"
                    class="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-medium text-sm flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    View Request Status
                  </router-link>
                </div>
              </div>
              
              <!-- Can request to join -->
              <div v-else class="mt-4 space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-2">
                    Request Role:
                  </label>
                  <select
                    v-model="requestRoles[profile._id]"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  @click="requestToJoin(profile)"
                  class="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm hover:shadow-md flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Request to Join
                </button>
              </div>
            </div>
          </div>
          <div v-if="!loading && filteredProfiles.length === 0" class="text-center py-10">
            <p class="text-gray-500">No profiles found matching your search.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useUserStore } from "../store/userStore";
import { getConfig } from "../config";

export default {
  name: "BrowseProfiles",
  setup() {
    const toast = useToast();
    const profiles = ref([]);
    const loading = ref(true);
    const searchQuery = ref("");
    const userStore = useUserStore();
    const requestRoles = ref({});
    const pendingRequests = ref(new Set());
    const pendingRequestsCount = ref(0);

    const fetchProfiles = async () => {
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/all`,
          {
            headers: {
              Authorization: `Bearer ${userStore.token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Backend now includes requestPending, so we can use it directly
          profiles.value = data;
          // Count pending requests
          pendingRequestsCount.value = data.filter(
            (p) => p.requestPending
          ).length;
        } else {
          toast.error("Failed to fetch profiles. Please check your connection.");
        }
      } catch (error) {
        console.error("Error fetching profiles:", error);
        toast.error("Network error. Unable to fetch profiles.");
      } finally {
        loading.value = false;
      }
    };

    const fetchPendingRequestsCount = async () => {
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/requests/history`,
          {
            headers: {
              Authorization: `Bearer ${userStore.token}`,
            },
          }
        );

        if (response.ok) {
          const requests = await response.json();
          pendingRequestsCount.value = requests.filter(
            (req) => req.status === "pending"
          ).length;
        }
      } catch (error) {
        console.error("Error fetching pending requests count:", error);
      }
    };

    const filteredProfiles = computed(() => {
      let result = profiles.value;

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
          (profile) =>
            profile.name.toLowerCase().includes(query) ||
            profile.namespace.toLowerCase().includes(query)
        );
      }

      return result;
    });

    const requestToJoin = async (profile) => {
      const requestedRole = requestRoles.value[profile._id] || "viewer";
      
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/${profile._id}/request`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userStore.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requestedRole,
            }),
          }
        );

        if (response.ok) {
          toast.success(`Request sent to join ${profile.name} as ${requestedRole}`);
          // Update the profile's status
          const profileIndex = profiles.value.findIndex((p) => p._id === profile._id);
          if (profileIndex !== -1) {
            profiles.value[profileIndex].requestPending = true;
            profiles.value[profileIndex].canRequest = false;
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(
            errorData.error || "Failed to send join request. Please try again."
          );
        }
      } catch (error) {
        console.error("Error requesting to join:", error);
        toast.error("Network error. Unable to send request.");
      }
    };

    onMounted(() => {
      fetchProfiles();
      fetchPendingRequestsCount();
    });

    return {
      profiles,
      loading,
      searchQuery,
      filteredProfiles,
      requestToJoin,
      requestRoles,
      pendingRequests,
      pendingRequestsCount,
    };
  },
};
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
