<template>
  <div
    class="profile-card bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl"
  >
    <!-- Header Section -->
    <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-semibold text-gray-800">
            {{ profile.name }}
          </h2>
          <div class="flex items-center space-x-2 mt-1">
            <span class="text-gray-500 text-sm">
              <i class="fas fa-layer-group mr-1"></i>
              Namespace: {{ profile.namespace }}
            </span>
            <span class="text-gray-500 text-sm">
              <i class="fas fa-cubes mr-1"></i>
              Services: {{ filteredServices.length }}{{ serviceFilter ? ` (filtered from ${profile.services.length})` : '' }}
            </span>
          </div>
        </div>

        <button
          @click="toggleDetails"
          class="btn-toggle text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span class="flex items-center">
            {{ showDetails ? "Hide Details" : "View Details" }}
            <i
              :class="
                showDetails
                  ? 'fas fa-chevron-up ml-2'
                  : 'fas fa-chevron-down ml-2'
              "
            ></i>
          </span>
        </button>
      </div>
    </div>

    <!-- Synchronization Status -->
    <div class="px-6 py-3 bg-gray-50 border-b">
      <div
        :class="[
          'p-2 rounded-md text-sm flex items-center',
          outOfSyncCount > 0
            ? 'bg-red-50 text-red-600'
            : 'bg-green-50 text-green-600',
        ]"
      >
        <i
          :class="
            outOfSyncCount > 0
              ? 'fas fa-exclamation-triangle mr-2'
              : 'fas fa-check-circle mr-2'
          "
        ></i>
        {{
          outOfSyncCount > 0
            ? `${outOfSyncCount} service(s) are out of sync`
            : "All services are in sync"
        }}
      </div>
    </div>

    <!-- Service Filter Info -->
    <div v-if="showDetails && serviceFilter && filteredServices.length === 0" class="px-6 py-4 bg-amber-50 border-b border-amber-200">
      <p class="text-amber-800 text-sm flex items-center">
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        No services found matching "{{ serviceFilter }}"
      </p>
    </div>

    <!-- Service Table -->
    <ServiceTable
      v-if="showDetails && filteredServices.length > 0"
      :services="filteredServices"
      :testing-profiles="profile.testingProfiles"
      @sync-service="$emit('sync-service', profile, $event)"
      class="transition-all duration-300 ease-in-out"
    />

    <!-- Action Buttons -->
    <div
      class="p-6 bg-gray-100 flex flex-col md:flex-row md:justify-between items-center space-y-3 md:space-y-0"
    >
      <div
        class="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3 w-full md:w-auto"
      >
        <button
          @click="$emit('sync-all', profile.name)"
          class="btn btn-success flex items-center justify-center"
        >
          <i class="fas fa-sync mr-2"></i>
          Sync All
        </button>

        <router-link
        v-if="canUserEditProfile()"
          :to="`/profiles/update/${profile._id}`"
          class="btn btn-primary flex items-center justify-center"
        >
          <i class="fas fa-edit mr-2"></i>
          Edit Profile
        </router-link>
        <router-link
          :to="`/profiles/logs/${profile._id}`"
          class="btn btn-purple flex items-center justify-center"
        >
        <i class="fa-regular fa-eye"></i>
          View Activity Logs
        </router-link>
      </div>

      <button
        @click="openPermissionsModal"
        class="btn btn-accent flex items-center justify-center w-full md:w-auto"
      >
        <i class="fas fa-user-shield mr-2"></i>
        {{ canUserEditProfile() ? "Manage Permissions" : "View profile Participants" }}
      </button>
    </div>

    <!-- Permissions Modal -->
    <PermissionsModal
      :show="showPermissionsModal"
      :profile-id="profile._id"
      :profile-name="profile.name"
      @close="showPermissionsModal = false"
    />
  </div>
</template>

<script>
import { ref, computed } from "vue";
import { useUserStore } from "../../store/userStore";
import ServiceTable from "./ServiceTable.vue";
import PermissionsModal from "./PermissionsModal.vue";

export default {
  components: { ServiceTable, PermissionsModal },
  props: {
    profile: {
      type: Object,
      required: true,
    },
    serviceFilter: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    const showDetails = ref(false);
    const showPermissionsModal = ref(false);
    const userStore = useUserStore();

    const toggleDetails = () => {
      showDetails.value = !showDetails.value;
    };

    const openPermissionsModal = () => {
      showPermissionsModal.value = true;
    };

    const canUserEditProfile = () => {
      const userPermissions = props.profile.permissions.find(
        (permission) => permission.user === userStore.user.id
      );

      return userPermissions.role !== "viewer";
    };

    const filteredServices = computed(() => {
      if (!props.serviceFilter) {
        return props.profile.services;
      }
      const filter = props.serviceFilter.toLowerCase();
      return props.profile.services.filter((service) =>
        service.name.toLowerCase().includes(filter)
      );
    });

    const outOfSyncCount = computed(() => {
      return filteredServices.value.filter(
        (service) => service.status === "Out of Sync"
      ).length;
    });

    return {
      showDetails,
      toggleDetails,
      showPermissionsModal,
      openPermissionsModal,
      filteredServices,
      outOfSyncCount,
      canUserEditProfile,
    };
  },
};
</script>
<style scoped>
/* Custom button styles */
.btn {
  @apply px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 hover:scale-105;
}

.btn-success {
  @apply bg-green-500 text-white hover:bg-green-600;
}

.btn-primary {
  @apply bg-blue-500 text-white hover:bg-blue-600;
}

.btn-accent {
  @apply bg-indigo-500 text-white hover:bg-indigo-600;
}

.btn-toggle {
  @apply bg-transparent border border-blue-200 rounded-md px-3 py-1 hover:bg-blue-50;
}

/* Card hover and transition effects */
.profile-card {
  @apply transform transition-all duration-300 hover:-translate-y-1;
}

/* Responsive spacing for action buttons */
@media (max-width: 768px) {
  .btn {
    @apply w-full;
  }
}
</style>
