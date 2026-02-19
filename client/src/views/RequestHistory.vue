<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center py-10"
  >
    <div class="w-full max-w-6xl px-4">
      <div class="bg-white shadow-2xl rounded-2xl overflow-hidden">
        <!-- Header -->
        <div
          class="bg-blue-600 text-white p-6 flex justify-between items-center"
        >
          <div>
            <h1 class="text-4xl font-extrabold mb-2">My Requests</h1>
            <p class="text-blue-100">Track your profile access requests</p>
          </div>
          <div class="flex space-x-2">
            <button
              @click="filterStatus = 'all'"
              class="px-4 py-2 rounded-lg transition"
              :class="filterStatus === 'all' ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'"
            >
              All
            </button>
            <button
              @click="filterStatus = 'pending'"
              class="px-4 py-2 rounded-lg transition"
              :class="filterStatus === 'pending' ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'"
            >
              Pending
            </button>
            <button
              @click="filterStatus = 'approved'"
              class="px-4 py-2 rounded-lg transition"
              :class="filterStatus === 'approved' ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'"
            >
              Approved
            </button>
            <button
              @click="filterStatus = 'rejected'"
              class="px-4 py-2 rounded-lg transition"
              :class="filterStatus === 'rejected' ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'"
            >
              Rejected
            </button>
          </div>
        </div>

        <!-- Requests List -->
        <div class="p-6">
          <div v-if="loading" class="text-center py-10">
            <div
              class="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto"
            ></div>
            <p class="mt-4 text-gray-600">Loading requests...</p>
          </div>
          <div v-else-if="filteredRequests.length === 0" class="text-center py-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-16 w-16 text-gray-400 mx-auto mb-4"
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
            <p class="text-gray-500 text-lg">No requests found</p>
            <p class="text-gray-400 text-sm mt-2">
              {{ filterStatus === 'all' ? 'You haven\'t made any requests yet' : `No ${filterStatus} requests` }}
            </p>
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="request in filteredRequests"
              :key="request._id"
              class="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
              :class="{
                'border-amber-300 bg-amber-50': request.status === 'pending',
                'border-green-300 bg-green-50': request.status === 'approved',
                'border-red-300 bg-red-50': request.status === 'rejected',
              }"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center mb-3">
                    <h3 class="text-xl font-bold text-gray-800 mr-3">
                      {{ request.profile?.name || 'Unknown Profile' }}
                    </h3>
                    <span
                      class="px-3 py-1 rounded-full text-xs font-semibold"
                      :class="{
                        'bg-amber-100 text-amber-700 border border-amber-200': request.status === 'pending',
                        'bg-green-100 text-green-700 border border-green-200': request.status === 'approved',
                        'bg-red-100 text-red-700 border border-red-200': request.status === 'rejected',
                      }"
                    >
                      {{ request.status.charAt(0).toUpperCase() + request.status.slice(1) }}
                    </span>
                    <span
                      class="ml-3 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200"
                    >
                      {{ request.requestedRole }}
                    </span>
                  </div>
                  
                  <div class="text-sm text-gray-600 space-y-1">
                    <p>
                      <span class="font-medium">Namespace:</span>
                      {{ request.profile?.namespace || 'N/A' }}
                    </p>
                    <p>
                      <span class="font-medium">Requested:</span>
                      {{ formatDate(request.requestedAt) }}
                    </p>
                    <p v-if="request.reviewedAt">
                      <span class="font-medium">Reviewed:</span>
                      {{ formatDate(request.reviewedAt) }}
                      <span v-if="request.reviewedBy" class="ml-2">
                        by {{ request.reviewedBy?.name || 'Admin' }}
                      </span>
                    </p>
                  </div>
                </div>

                <div class="ml-4 flex items-center">
                  <svg
                    v-if="request.status === 'pending'"
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-8 w-8 text-amber-500 animate-pulse"
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
                  <svg
                    v-else-if="request.status === 'approved'"
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-8 w-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <svg
                    v-else-if="request.status === 'rejected'"
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-8 w-8 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              <div v-if="request.status === 'approved'" class="mt-4 pt-4 border-t border-green-200">
                <router-link
                  :to="`/profiles`"
                  class="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span>View Profile</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </router-link>
              </div>
            </div>
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
  name: "RequestHistory",
  setup() {
    const toast = useToast();
    const requests = ref([]);
    const loading = ref(true);
    const filterStatus = ref("all");
    const userStore = useUserStore();

    const fetchRequests = async () => {
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
          requests.value = await response.json();
        } else {
          toast.error("Failed to fetch requests. Please check your connection.");
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast.error("Network error. Unable to fetch requests.");
      } finally {
        loading.value = false;
      }
    };

    const filteredRequests = computed(() => {
      if (filterStatus.value === "all") {
        return requests.value;
      }
      return requests.value.filter(
        (req) => req.status === filterStatus.value
      );
    });

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    onMounted(() => {
      fetchRequests();
    });

    return {
      requests,
      loading,
      filterStatus,
      filteredRequests,
      formatDate,
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
