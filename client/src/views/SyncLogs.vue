<template>
    <div class="mt-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-gray-800 font-bold">Sync history</h3>
        <div class="flex items-center gap-2">
          <router-link
            :to="`/sync-logs?profileName=${encodeURIComponent(profileName)}`"
            class="text-sm text-blue-600 hover:text-blue-800"
          >
            Full history & filters →
          </router-link>
          <button
            type="button"
            @click="fetchLogs"
            :disabled="loading"
            class="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <i class="fas fa-sync-alt mr-1"></i> Refresh
          </button>
        </div>
      </div>
      <div v-if="loading" class="text-gray-500">Loading logs...</div>
      <div v-else-if="logs.length === 0" class="text-gray-500">No logs available.</div>
      <table
        v-else
        class="w-full border-collapse bg-white shadow-md rounded-lg overflow-hidden"
      >
        <thead class="bg-gray-100">
          <tr>
            <th class="border border-gray-300 p-3 text-left text-sm font-semibold">Time</th>
            <th class="border border-gray-300 p-3 text-left text-sm font-semibold">Sync ID</th>
            <th class="border border-gray-300 p-3 text-left text-sm font-semibold">Type</th>
            <th class="border border-gray-300 p-3 text-left text-sm font-semibold">Service</th>
            <th class="border border-gray-300 p-3 text-left text-sm font-semibold">Version</th>
            <th class="border border-gray-300 p-3 text-left text-sm font-semibold">Pods</th>
            <th class="border border-gray-300 p-3 text-left text-sm font-semibold">By</th>
            <th class="border border-gray-300 p-3 text-left text-sm font-semibold">Status</th>
            <th class="border border-gray-300 p-3 text-left text-sm font-semibold">Error</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in logs"
            :key="log._id || log.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="border border-gray-200 p-3 text-sm">{{ formatTimestamp(log.timestamp) }}</td>
            <td class="border border-gray-200 p-3 text-sm">
              <span v-if="log.batchId" :title="log.batchId" class="font-mono text-gray-700">{{ truncateId(log.batchId, 16) }}</span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="border border-gray-200 p-3">
              <span :class="log.type === 'batch' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'" class="text-xs font-medium px-2 py-0.5 rounded-full">{{ log.type === 'batch' ? 'Batch' : 'Single' }}</span>
            </td>
            <td class="border border-gray-200 p-3">{{ log.serviceName }}</td>
            <td class="border border-gray-200 p-3 text-sm">{{ log.oldVersion || '—' }} → {{ log.newVersion }}</td>
            <td class="border border-gray-200 p-3 text-sm">{{ podDisplay(log.oldPodCount) }} → {{ podDisplay(log.newPodCount) }}</td>
            <td class="border border-gray-200 p-3 text-sm">{{ log.userName || '—' }}</td>
            <td class="border border-gray-200 p-3">
              <span :class="log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="text-xs font-semibold px-2 py-0.5 rounded-full">{{ log.status }}</span>
            </td>
            <td class="border border-gray-200 p-3 text-sm text-gray-600" :title="log.errorMessage">{{ log.errorMessage || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <script>
  import { getConfig } from "../config";

  export default {
    props: {
      profileName: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        logs: [],
        loading: false,
      };
    },
    methods: {
      formatTimestamp(ts) {
        if (!ts) return "—";
        const d = new Date(ts);
        return d.toLocaleString();
      },
      podDisplay(n) {
        if (n == null || n === undefined) return "—";
        return String(n);
      },
      truncateId(id, maxLen) {
        if (!id || id.length <= maxLen) return id || "—";
        return id.slice(0, maxLen) + "…";
      },
      async fetchLogs() {
        this.loading = true;
        try {
          const response = await fetch(
            `http://${getConfig().urlHost}/api/services/sync-logs?profileName=${encodeURIComponent(
              this.profileName
            )}`
          );
          if (response.ok) {
            const data = await response.json();
            this.logs = Array.isArray(data) ? data : (data.logs ?? []);
          } else {
            console.error("Failed to fetch logs");
          }
        } catch (error) {
          console.error("Error fetching logs:", error);
        } finally {
          this.loading = false;
        }
      },
    },
    mounted() {
      this.fetchLogs();
    },
  };
  </script>
  
  <style scoped>
  table {
    border-spacing: 0.5rem;
  }
  </style>
  