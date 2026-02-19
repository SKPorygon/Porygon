<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
    <div class="max-w-7xl mx-auto px-4">
      <div class="bg-white shadow-xl rounded-2xl overflow-hidden">
        <!-- Header -->
        <div class="bg-blue-600 text-white p-6">
          <h1 class="text-3xl font-bold">Sync history</h1>
          <p class="text-blue-100 mt-1">View and search all service sync operations. Filter by batch ID to see all services from one sync.</p>
        </div>

        <!-- Filters -->
        <div class="p-6 border-b border-gray-200 bg-gray-50">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div class="lg:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Sync / Batch ID</label>
              <input
                v-model="filters.batchId"
                type="text"
                placeholder="Paste batch ID to see all changes from one sync"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                @keyup.enter="fetchLogs"
              />
              <p class="text-xs text-gray-500 mt-1">Find the ID in the table below (batch syncs only), then paste here and search.</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Profile</label>
              <input
                v-model="filters.profileName"
                type="text"
                placeholder="Profile name"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                @keyup.enter="fetchLogs"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Service</label>
              <input
                v-model="filters.serviceName"
                type="text"
                placeholder="Service name"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                @keyup.enter="fetchLogs"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">User</label>
              <input
                v-model="filters.userName"
                type="text"
                placeholder="User name"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                @keyup.enter="fetchLogs"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                v-model="filters.status"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">From date</label>
              <input
                v-model="filters.from"
                type="datetime-local"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">To date</label>
              <input
                v-model="filters.to"
                type="datetime-local"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              @click="fetchLogs"
              :disabled="loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              <i class="fas fa-search"></i>
              Search
            </button>
            <button
              type="button"
              @click="clearFilters"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Clear filters
            </button>
            <span v-if="total !== null" class="text-sm text-gray-600">
              {{ total }} result(s)
            </span>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <div v-if="loading" class="p-12 text-center text-gray-500">
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Loading sync logs...</p>
          </div>
          <div v-else-if="logs.length === 0" class="p-12 text-center text-gray-500">
            <p>No sync logs match your filters.</p>
            <p class="text-sm mt-1">Try broadening the search or clear filters.</p>
          </div>
          <table v-else class="w-full border-collapse">
            <thead class="bg-gray-100 text-gray-700 text-left sticky top-0 z-10">
              <tr>
                <th class="px-4 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">Time</th>
                <th class="px-4 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">Sync ID</th>
                <th class="px-4 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">Type</th>
                <th class="px-4 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">Profile</th>
                <th class="px-4 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">Service</th>
                <th class="px-4 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">Version</th>
                <th class="px-4 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">Pods</th>
                <th class="px-4 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">By</th>
                <th class="px-4 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">Status</th>
                <th class="px-4 py-3 border-b border-gray-200 font-semibold whitespace-nowrap">Error</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in logs"
                :key="log._id"
                class="border-b border-gray-100 hover:bg-blue-50/50 transition-colors"
              >
                <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {{ formatTimestamp(log.timestamp) }}
                </td>
                <td class="px-4 py-3">
                  <div v-if="log.batchId" class="flex items-center gap-2">
                    <code
                      class="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-800"
                      :title="log.batchId"
                    >
                      {{ truncateId(log.batchId, 20) }}
                    </code>
                    <button
                      type="button"
                      @click="copyBatchId(log.batchId)"
                      class="text-gray-500 hover:text-blue-600 p-1 rounded"
                      :title="copyFeedback === log.batchId ? 'Copied!' : 'Copy batch ID'"
                    >
                      <i :class="copyFeedback === log.batchId ? 'fas fa-check text-green-600' : 'far fa-copy'"></i>
                    </button>
                  </div>
                  <span v-else class="text-gray-400 text-sm">—</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="log.type === 'batch' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'"
                    class="text-xs font-medium px-2 py-1 rounded-full"
                  >
                    {{ log.type === 'batch' ? 'Batch' : 'Single' }}
                  </span>
                </td>
                <td class="px-4 py-3 font-medium text-gray-800">{{ log.profileName }}</td>
                <td class="px-4 py-3 text-gray-800">{{ log.serviceName }}</td>
                <td class="px-4 py-3 text-sm">
                  <span class="text-gray-600">{{ log.oldVersion ?? '—' }}</span>
                  <span class="text-gray-400 mx-1">→</span>
                  <span class="text-gray-800 font-medium">{{ log.newVersion }}</span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span class="text-gray-600">{{ podDisplay(log.oldPodCount) }}</span>
                  <span class="text-gray-400 mx-1">→</span>
                  <span class="text-gray-800">{{ podDisplay(log.newPodCount) }}</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ log.userName ?? '—' }}</td>
                <td class="px-4 py-3">
                  <span
                    :class="log.status === 'success'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'"
                    class="text-xs font-semibold px-2.5 py-1 rounded-full"
                  >
                    {{ log.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 max-w-[220px]">
                  <span
                    v-if="log.errorMessage"
                    class="truncate block cursor-help"
                    :title="log.errorMessage"
                  >
                    {{ log.errorMessage }}
                  </span>
                  <span v-else class="text-gray-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="total !== null && total > 0"
          class="p-4 border-t flex flex-wrap items-center justify-between gap-2 bg-gray-50"
        >
          <span class="text-sm text-gray-600">
            Showing {{ skip + 1 }}–{{ Math.min(skip + limit, total) }} of {{ total }}
          </span>
          <div class="flex gap-2">
            <button
              type="button"
              @click="prevPage"
              :disabled="skip === 0"
              class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Previous
            </button>
            <button
              type="button"
              @click="nextPage"
              :disabled="skip + limit >= total"
              class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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
import { ref, reactive, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { getConfig } from "../config";

const LIMIT = 50;

export default {
  name: "SyncLogsPage",
  setup() {
    const route = useRoute();
    const loading = ref(false);
    const logs = ref([]);
    const total = ref(null);
    const skip = ref(0);
    const limit = LIMIT;
    const copyFeedback = ref(null);

    const filters = reactive({
      batchId: "",
      profileName: "",
      serviceName: "",
      userName: "",
      status: "",
      from: "",
      to: "",
    });

    function buildQuery() {
      const q = new URLSearchParams();
      if (filters.batchId.trim()) q.set("batchId", filters.batchId.trim());
      if (filters.profileName.trim()) q.set("profileName", filters.profileName.trim());
      if (filters.serviceName.trim()) q.set("serviceName", filters.serviceName.trim());
      if (filters.userName.trim()) q.set("userName", filters.userName.trim());
      if (filters.status) q.set("status", filters.status);
      if (filters.from) q.set("from", new Date(filters.from).toISOString());
      if (filters.to) q.set("to", new Date(filters.to).toISOString());
      q.set("limit", String(limit));
      q.set("skip", String(skip.value));
      return q.toString();
    }

    async function fetchLogs() {
      loading.value = true;
      try {
        const base = `http://${getConfig().urlHost}/api/services/sync-logs`;
        const url = `${base}?${buildQuery()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch sync logs");
        const data = await res.json();
        logs.value = data.logs ?? [];
        total.value = data.total ?? 0;
      } catch (e) {
        console.error(e);
        logs.value = [];
        total.value = 0;
      } finally {
        loading.value = false;
      }
    }

    function clearFilters() {
      filters.batchId = "";
      filters.profileName = "";
      filters.serviceName = "";
      filters.userName = "";
      filters.status = "";
      filters.from = "";
      filters.to = "";
      skip.value = 0;
      fetchLogs();
    }

    function formatTimestamp(ts) {
      if (!ts) return "—";
      return new Date(ts).toLocaleString();
    }

    function podDisplay(n) {
      if (n == null || n === undefined) return "—";
      return String(n);
    }

    function truncateId(id, maxLen) {
      if (!id || id.length <= maxLen) return id || "—";
      return id.slice(0, maxLen) + "…";
    }

    function copyBatchId(id) {
      if (!id) return;
      navigator.clipboard.writeText(id).then(() => {
        copyFeedback.value = id;
        setTimeout(() => { copyFeedback.value = null; }, 2000);
      });
    }

    function prevPage() {
      skip.value = Math.max(0, skip.value - limit);
      fetchLogs();
    }

    function nextPage() {
      skip.value += limit;
      fetchLogs();
    }

    onMounted(() => {
      if (route.query.profileName) {
        filters.profileName = String(route.query.profileName);
      }
      if (route.query.batchId) {
        filters.batchId = String(route.query.batchId);
      }
      fetchLogs();
    });

    watch(
      () => [route.query.profileName, route.query.batchId],
      ([profile, batch]) => {
        if (profile) filters.profileName = String(profile);
        if (batch) filters.batchId = String(batch);
      }
    );

    return {
      loading,
      logs,
      total,
      skip,
      limit,
      filters,
      copyFeedback,
      fetchLogs,
      clearFilters,
      formatTimestamp,
      podDisplay,
      truncateId,
      copyBatchId,
      prevPage,
      nextPage,
    };
  },
};
</script>
