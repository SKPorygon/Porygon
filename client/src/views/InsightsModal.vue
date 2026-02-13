<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-4xl rounded-xl bg-white shadow-lg overflow-hidden">
      <!-- Header -->
      <div class="bg-blue-500 text-white px-6 py-4 flex justify-between items-center">
        <h2 class="text-2xl font-semibold">Insights for {{ profile.name }}</h2>
        <button
          @click="$emit('close')"
          class="rounded-full bg-white text-blue-500 p-2 hover:bg-gray-200"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Summary Section -->
        <div class="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 rounded-lg shadow-sm">
          <div class="flex flex-col items-start">
            <p class="text-sm text-gray-600">Namespace</p>
            <h3 class="text-lg font-medium text-gray-800">{{ profile.namespace }}</h3>
          </div>
          <div class="flex flex-col items-start mt-4 md:mt-0">
            <p class="text-sm text-gray-600">Total Services</p>
            <h3 class="text-lg font-medium text-gray-800">{{ profile.services.length }}</h3>
          </div>
          <div class="flex flex-col items-start mt-4 md:mt-0">
            <p class="text-sm text-gray-600">Active Testing Profiles</p>
            <h3 class="text-lg font-medium text-gray-800">
              {{
                activeTestingProfiles.length
              }}
            </h3>
          </div>
        </div>

        <!-- Active Testing Profiles -->
        <div v-if="activeTestingProfiles.length" class="space-y-4">
          <h3 class="text-xl font-semibold text-gray-900">Active Testing Profiles</h3>
          <div
            v-for="testingProfile in activeTestingProfiles"
            :key="testingProfile._id"
            class="border border-gray-300 rounded-lg p-4 bg-gray-50 shadow-sm"
          >
            <h4 class="text-lg font-medium text-gray-800 mb-2">{{ testingProfile.name }}</h4>
            <p class="text-sm text-gray-600 mb-4">
              {{ testingProfile.services.length }} services under test
            </p>
            <!-- Services List -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="service in testingProfile.services"
                :key="service.name"
                class="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm"
              >
                <div class="text-gray-800 font-medium">{{ service.name }}</div>
                <div class="text-sm text-gray-500">v{{ service.desiredVersion }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Active Testing Profiles -->
        <div v-else class="text-center py-6">
          <p class="text-gray-600">No active testing profiles for this profile.</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-100 px-6 py-4 flex justify-end">
        <button
          @click="$emit('close')"
          class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { getConfig } from "../config";

export default {
  name: "InsightsModal",
  props: {
    profileId: {
      type: String,
      required: true,
    },
  },
  setup(props, { emit }) {
    const profile = ref(null);
    const activeTestingProfiles = ref([]);

    const fetchProfileWithInsights = async () => {
      try {
        const response = await fetch(
          `${getConfig().apiUrl}/profiles/${props.profileId}`
        );
        if (!response.ok) {
          console.error("Failed to fetch profile insights.");
          return;
        }

        const data = await response.json();
        profile.value = data;

        // Filter active testing profiles
        activeTestingProfiles.value = profile.value.testingProfiles.filter(
          (tp) => tp.isActive
        );
      } catch (error) {
        console.error("Error fetching profile insights:", error);
      }
    };

    onMounted(fetchProfileWithInsights);

    return {
      profile,
      activeTestingProfiles,
    };
  },
};
</script>

<style scoped>
/* Smooth transitions for modal display */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
