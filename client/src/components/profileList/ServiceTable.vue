<template>
  <div class="mt-4 overflow-x-auto">
    <table class="w-full border-collapse">
      <thead class="bg-gray-200">
        <tr>
          <th class="border border-gray-300 p-2 text-left">Service Name</th>
          <th class="border border-gray-300 p-2 text-left">Desired Version</th>
          <th class="border border-gray-300 p-2 text-left">Actual Version</th>
          <th class="border border-gray-300 p-2 text-left">Desired Pods</th>
          <th class="border border-gray-300 p-2 text-left">Actual Pods</th>
          <th class="border border-gray-300 p-2 text-left">Status</th>
          <th class="border border-gray-300 p-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(groupServices, appGroup) in groupedServices" :key="appGroup">
          <!-- Group header when multiple services or Standalone -->
          <tr
            v-if="showGroupHeader(appGroup, groupServices)"
            :class="getGroupHeaderRowClass(appGroup)"
          >
            <td :colspan="7" class="border border-gray-300 p-2 font-medium" :class="getGroupHeaderCellClass(appGroup)">
              <span class="inline-flex items-center gap-2">
                <!-- Standalone (no app label) icon -->
                <svg
                  v-if="isStandaloneGroup(appGroup)"
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 shrink-0"
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
                <!-- App group icon -->
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 shrink-0"
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
                {{ getGroupHeaderLabel(appGroup, groupServices) }}
              </span>
            </td>
          </tr>
          <tr v-for="service in groupServices" :key="service.name">
            <td class="border border-gray-300 p-2">{{ service.name }}</td>
            <td class="border border-gray-300 p-2">
              {{ service.desiredVersion }}
            </td>
            <td class="border border-gray-300 p-2">
              {{ service.actualVersion }}
            </td>
            <td class="border border-gray-300 p-2">
              {{ service.desiredPodCount }}
            </td>
            <td class="border border-gray-300 p-2">
              {{ service.actualPodCount }}
            </td>
            <td class="border border-gray-300 p-2">
              <span
                :class="getStatusClass(service)"
                class="inline-block px-2 py-1 rounded text-xs"
              >
                {{ service.status }}
                <span v-if="service.underTest" class="italic">(Under Test)</span>
              </span>
            </td>
            <td class="border border-gray-300 p-2 flex gap-2">
              <button
                :disabled="isSyncUnneeded(service)"
                @click="$emit('sync-service', service)"
                class="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm"
                :class="{ 'opacity-50 cursor-not-allowed': service.underTest }"
              >
                Sync
              </button>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script>
import { defineComponent, computed } from "vue";
import TestingProfiles from "../../views/TestingProfiles.vue";

const STANDALONE_APP_GROUP = "__standalone__";

export default defineComponent({
  props: {
    services: {
      type: Array,
      required: true,
    },
    TestingProfiles: {
      type: Array,
      required: true,
    }
  },
  setup(props) {
    const groupedServices = computed(() => {
      const map = {};
      for (const s of props.services || []) {
        const key = s.appGroup || STANDALONE_APP_GROUP;
        if (!map[key]) map[key] = [];
        map[key].push(s);
      }
      return map;
    });

    const showGroupHeader = (appGroup, groupServices) => {
      if (!groupServices || groupServices.length === 0) return false;
      if (appGroup === STANDALONE_APP_GROUP) return true;
      return groupServices.length > 1;
    };

    const getGroupHeaderRowClass = (appGroup) => {
      if (appGroup === STANDALONE_APP_GROUP) return "bg-amber-50";
      return "bg-blue-50";
    };

    const getGroupHeaderCellClass = (appGroup) => {
      if (appGroup === STANDALONE_APP_GROUP) {
        return "border-l-4 border-l-amber-400 text-amber-800";
      }
      return "border-l-4 border-l-blue-500 text-blue-800";
    };

    const isStandaloneGroup = (appGroup) => appGroup === STANDALONE_APP_GROUP;

    const getGroupHeaderLabel = (appGroup, groupServices) => {
      const n = groupServices ? groupServices.length : 0;
      if (appGroup === STANDALONE_APP_GROUP) {
        return n === 1
          ? "Standalone (no app label)"
          : `Standalone (${n} services, no app label)`;
      }
      return n === 1 ? appGroup : `${appGroup} (${n} services)`;
    };

    const getStatusClass = (service) => {
      if (service.underTest) return "bg-yellow-100 text-yellow-700";
      if (service.status === "In Sync") return "bg-green-200 text-green-800";
      if (service.status === "Out of Sync") return "bg-red-200 text-red-800";
      return "bg-yellow-200 text-yellow-800";
    };

    const isSyncUnneeded = (service) => {
      return service.status === "In Sync" || service.underTest;
    };

    return {
      groupedServices,
      showGroupHeader,
      getGroupHeaderRowClass,
      getGroupHeaderCellClass,
      isStandaloneGroup,
      getGroupHeaderLabel,
      getStatusClass,
      isSyncUnneeded,
    };
  },
});
</script>
