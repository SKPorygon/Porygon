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
        <template v-for="(groupServices, appGroup) in servicesByApp" :key="appGroup">
          <tr
            v-if="appGroup && groupServices.length > 1"
            class="bg-blue-50 border-l-4 border-blue-500"
          >
            <td colspan="7" class="border border-gray-300 p-2 font-semibold text-gray-800">
              <span class="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 mr-2 text-blue-600"
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
                {{ appGroup }}
                <span class="ml-2 text-gray-500 font-normal text-sm">({{ groupServices.length }} service{{ groupServices.length !== 1 ? 's' : '' }})</span>
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

export default defineComponent({
  props: {
    services: {
      type: Array,
      required: true,
    },
    testingProfiles: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {
    const getStatusClass = (service) => {
      if (service.underTest) return "bg-yellow-100 text-yellow-700";
      if (service.status === "In Sync") return "bg-green-200 text-green-800";
      if (service.status === "Out of Sync") return "bg-red-200 text-red-800";
      return "bg-yellow-200 text-yellow-800";
    };

    const isSyncUnneeded = (service) => {
      return service.status === "In Sync" || service.underTest;
    };

    /** Group services by OpenShift app (appGroup). Preserves order: groups by first occurrence. */
    const servicesByApp = computed(() => {
      const list = props.services || [];
      const groupOrder = [];
      const map = {};
      for (const s of list) {
        const key = s.appGroup != null ? String(s.appGroup) : s.name;
        if (!map[key]) {
          groupOrder.push(key);
          map[key] = [];
        }
        map[key].push(s);
      }
      const result = {};
      for (const key of groupOrder) {
        result[key] = map[key];
      }
      return result;
    });

    return {
      getStatusClass,
      isSyncUnneeded,
      servicesByApp,
    };
  },
});
</script>
