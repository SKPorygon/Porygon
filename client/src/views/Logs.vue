<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-65">
      <div class="container mx-auto max-w-6xl">
        <div class="bg-white shadow-xl rounded-2xl overflow-hidden">
          <!-- Header with Title and Refresh -->
          <div class="flex justify-between items-center p-6 bg-gray-50 border-b">
            <h1 class="text-3xl font-extrabold text-gray-800">Activity Logs</h1>
            <button 
              @click="fetchLogs"
              class="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <i class="fas fa-sync"></i>
              Refresh Logs
            </button>
          </div>
  
          <!-- Filters Section -->
          <div class="p-6 bg-white">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="relative">
                <label class="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                <input
                  v-model="filters.userId"
                  placeholder="Filter by User ID"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div class="relative">
                <label class="block text-sm font-medium text-gray-700 mb-2">Profile ID</label>
                <input
                  v-model="filters.profileId"
                  placeholder="Filter by Profile ID"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <select 
                  v-model="filters.action" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">All Actions</option>
                  <option value="Activate Testing Profile">Activate Testing Profile</option>
                  <option value="Update Permissions">Update Permissions</option>
                  <option value="Create Profile">Create Profile</option>
                </select>
              </div>
              <div class="flex items-end">
                <button
                  @click="fetchLogs"
                  class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
  
          <!-- Logs Table -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-100 text-gray-600">
                <tr>
                  <th class="px-6 py-3 text-left">User</th>
                  <th class="px-6 py-3 text-left">Action</th>
                  <th class="px-6 py-3 text-left">Profile</th>
                  <th class="px-6 py-3 text-left">Details</th>
                  <th class="px-6 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="logs?.length">
                  <tr 
                    v-for="log in logs" 
                    :key="log._id" 
                    class="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td class="px-6 py-4">
                      <div class="flex items-center">
                        <!-- <div class="flex-shrink-0 h-10 w-10">
                          <img 
                            class="h-10 w-10 rounded-full" 
                            :src="log.user.avatar || '/default-avatar.png'" 
                            :alt="log.user.name"
                          >
                        </div> -->
                        <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">
                            {{ log.user.name }}
                          </div>
                          <div class="text-sm text-gray-500">
                            {{ log.user.email }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span 
                        class="px-2 py-1 rounded-full text-xs font-semibold"
                        :class="{
                          'bg-green-100 text-green-800': log.action === 'Create Profile',
                          'bg-blue-100 text-blue-800': log.action === 'Update Permissions',
                          'bg-purple-100 text-yellow-800': log.action === 'Activate Testing Profile'
                        }"
                      >
                        {{ log.action }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">
                      {{ log.profileId }}
                    </td>
                    <td class="px-6 py-4">
                      <div v-if="log.details" class="text-sm">
                        <div 
                          v-for="(value, key) in log.details" 
                          :key="key" 
                          class="flex justify-between py-1"
                        >
                          <span class="font-semibold text-gray-600 capitalize mr-4">
                            {{ key }}:
                          </span>
                          <span class="text-gray-800">{{ value }}</span>
                        </div>
                      </div>
                      <div v-else class="text-gray-500 italic">No Details</div>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">
                      {{ formatDate(log.timestamp) }}
                    </td>
                  </tr>
                </template>
                <tr v-else>
                  <td colspan="5" class="text-center py-8 text-gray-500">
                    No logs found. Try adjusting your filters.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
  
          <!-- Pagination -->
          <div class="p-6 bg-white border-t flex justify-between items-center">
            <div class="text-sm text-gray-700">
              Showing {{ logs.length }} of {{ totalLogs }} logs
            </div>
            <div class="flex space-x-2">
              <button 
                :disabled="currentPage === 1"
                @click="changePage(-1)"
                class="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                :disabled="logs.length < pageSize"
                @click="changePage(1)"
                class="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted } from 'vue';
  import { useUserStore } from '../store/userStore';
  
  export default {
    setup() {
      const logs = ref([]);
      const filters = ref({ userId: '', profileId: '', action: '' });
      const userStore = useUserStore();
      const currentPage = ref(1);
      const pageSize = ref(10);
      const totalLogs = ref(0);
  
      const fetchLogs = async () => {
  try {
    const query = new URLSearchParams(filters.value).toString();
    const response = await fetch(`http://localhost:3000/api/logs?${query}`, {
      headers: {
        Authorization: `Bearer ${userStore.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch logs');
    }

    logs.value = await response.json() || [];
  } catch (error) {
    console.error('Logs fetch error:', error);
    logs.value = [];
  }
};
  
      const changePage = (direction) => {
        currentPage.value += direction;
        fetchLogs();
      };
  
      onMounted(fetchLogs);
  
      return { 
        logs, 
        filters, 
        fetchLogs, 
        currentPage, 
        pageSize, 
        totalLogs,
        changePage 
      };
    },
  
    methods: {
      formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      },
    },
  };
  </script>
  
  <style scoped>
  /* Optional: Add subtle hover and focus effects */
  input:focus, select:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
  </style>