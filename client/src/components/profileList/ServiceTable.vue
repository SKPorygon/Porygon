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
        <tr v-for="service in services" :key="service.name">
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
      </tbody>
    </table>
  </div>
</template>

<script>
import { defineComponent } from "vue";
import TestingProfiles from "../../views/TestingProfiles.vue";

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
      getStatusClass,
      isSyncUnneeded,
    };
  },
});
</script>
