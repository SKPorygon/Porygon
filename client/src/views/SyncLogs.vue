<template>
    <div class="mt-4">
      <h3 class="text-gray-800 font-bold mb-2">Sync Logs</h3>
      <div v-if="loading" class="text-gray-500">Loading logs...</div>
      <div v-else-if="logs.length === 0" class="text-gray-500">No logs available.</div>
      <table
        v-else
        class="w-full border-collapse bg-white shadow-md rounded-lg overflow-hidden"
      >
        <thead class="bg-gray-100">
          <tr>
            <th class="border border-gray-300 p-4 text-left">Timestamp</th>
            <th class="border border-gray-300 p-4 text-left">Service</th>
            <th class="border border-gray-300 p-4 text-left">Old Version</th>
            <th class="border border-gray-300 p-4 text-left">New Version</th>
            <th class="border border-gray-300 p-4 text-left">Status</th>
            <th class="border border-gray-300 p-4 text-left">Error Message</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in logs"
            :key="log.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="border border-gray-300 p-4">{{ log.timestamp }}</td>
            <td class="border border-gray-300 p-4">{{ log.serviceName }}</td>
            <td class="border border-gray-300 p-4">{{ log.oldVersion }}</td>
            <td class="border border-gray-300 p-4">{{ log.newVersion }}</td>
            <td
              class="border border-gray-300 p-4"
              :class="{ 'text-green-600': log.status === 'success', 'text-red-600': log.status === 'failure' }"
            >
              {{ log.status }}
            </td>
            <td class="border border-gray-300 p-4">
              {{ log.errorMessage || 'N/A' }}
            </td>
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
      async fetchLogs() {
        this.loading = true;
        try {
          const response = await fetch(
            `${getConfig().apiUrl}/sync-logs?profileName=${encodeURIComponent(
              this.profileName
            )}`
          );
          if (response.ok) {
            this.logs = await response.json();
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
  