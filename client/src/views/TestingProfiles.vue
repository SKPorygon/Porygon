<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
    <div class="container mx-auto max-w-7xl px-4">
      <!-- Header Section -->
      <div
        class="mb-10 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0"
      >
        <div>
          <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight">
            Testing Profiles
            <span class="text-blue-600">Management</span>
          </h1>
          <p class="mt-2 text-gray-600 text-lg">
            Streamline and control your testing environments with precision
          </p>
        </div>

        <div class="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <!-- Search Input -->
          <div class="relative flex-grow">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search profiles by name or namespace..."
              class="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 pl-12 transition duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div
              class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <!-- Status Dropdown -->
          <select
            v-model="filterStatus"
            class="rounded-xl border-2 border-gray-300 bg-white px-4 py-3 transition duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Namespaces</option>
            <option value="active">Active Testing</option>
            <option value="inactive">No Active Tests</option>
          </select>
        </div>
      </div>

      <!-- Profiles Grid -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="profile in filteredProfiles"
          :key="profile._id"
          class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all hover:scale-105 hover:shadow-2xl"
        >
          <div class="p-6">
            <!-- Profile Header -->
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2
                  class="text-2xl font-bold text-gray-900 flex items-center gap-2"
                >
                  {{ profile.name }}
                  <span
                    v-if="hasActiveTests(profile)"
                    class="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full"
                  >
                    Active
                  </span>
                </h2>
                <p class="text-sm text-gray-500 mt-1">
                  Namespace: {{ profile.namespace }}
                </p>
              </div>

              <div class="flex space-x-2">
                <button
                  @click="openExpandedModal(profile)"
                  class="rounded-lg bg-blue-50 text-blue-600 px-3 py-2 hover:bg-blue-100 transition"
                >
                  Details
                </button>
                <button
                  @click="toggleExpand(profile._id)"
                  class="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 transform transition-transform"
                    :class="{ 'rotate-180': expandedProfiles[profile._id] }"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Expanded Content -->
            <div
              v-if="expandedProfiles[profile._id]"
              class="mt-6 space-y-4 transition-all duration-300 ease-in-out"
            >
              <div v-if="profile.testingProfiles.length > 0">
                <h3 class="mb-3 text-lg font-medium text-gray-900">
                  Testing Profiles
                </h3>

                <!-- Pagination Controls -->
                <div class="mb-4 flex justify-between items-center">
                  <button
                    class="px-4 py-2 bg-gray-100 text-gray-600 rounded-md disabled:opacity-50"
                    :disabled="currentPage(profile._id) === 1"
                    @click="prevPage(profile._id)"
                  >
                    Previous
                  </button>
                  <span class="text-sm text-gray-500">
                    Page {{ currentPage(profile._id) }} of
                    {{ totalPages(profile._id) }}
                  </span>
                  <button
                    class="px-4 py-2 bg-gray-100 text-gray-600 rounded-md disabled:opacity-50"
                    :disabled="
                      currentPage(profile._id) === totalPages(profile._id)
                    "
                    @click="nextPage(profile._id)"
                  >
                    Next
                  </button>
                </div>

                <!-- Testing Profile Cards -->
                <div class="space-y-5">
                  <div
                    v-for="testProfile in paginatedTestingProfiles(profile)"
                    :key="testProfile._id"
                    class="relative rounded-lg border border-gray-200 p-4 bg-white shadow-sm transition-all duration-200"
                    :class="{
                      'bg-blue-50/40 border-blue-200': testProfile.isActive,
                      'hover:shadow-md': !testProfile.isActive,
                    }"
                  >
                    <!-- Testing Profile Name and Buttons -->
                    <div class="flex items-center justify-between">
                      <h4 class="font-medium text-gray-900">
                        {{ testProfile.name }}
                      </h4>
                      <div
                        v-if="canUserEditTestingProfile(profile, testProfile)"
                        class="flex items-center gap-2"
                      >
                        <button
                          @click="activateTestingProfile(profile, testProfile)"
                          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                          :class="
                            testProfile.isActive
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          "
                        >
                          {{ testProfile.isActive ? "Deactivate" : "Activate" }}
                        </button>
                        <button
                          @click="deleteTestingProfile(profile, testProfile)"
                          class="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <!-- Expand/Collapse Services -->
                    <div>
                      <button
                        @click="toggleTestProfileExpand(testProfile._id)"
                        class="mt-3 text-sm text-blue-500 hover:underline"
                      >
                        {{
                          expandedTestProfiles[testProfile._id]
                            ? "Collapse"
                            : "Expand"
                        }}
                        Services
                      </button>
                    </div>

                    <!-- Services List -->
                    <div
                      v-if="expandedTestProfiles[testProfile._id]"
                      class="mt-4 space-y-2"
                    >
                      <div
                        v-for="service in testProfile.services"
                        :key="service.name"
                        class="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-sm shadow-sm"
                        :class="{
                          'border border-blue-100': testProfile.isActive,
                        }"
                      >
                        <span class="font-medium text-gray-700">{{
                          service.name
                        }}</span>
                        <span class="text-gray-500"
                          >v{{ service.desiredVersion }}</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Create New Profile Button -->
              <button
                @click="openCreateModal(profile)"
                class="w-full rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
              >
                + Create New Testing Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modals -->
      <CreateTestingProfileModal
        v-if="showCreateModal"
        :show="showCreateModal"
        :profile="modalProfile"
        @close="closeCreateModal"
        @created="handleProfileCreated"
      />

      <ExpandedProfileCard
        v-if="selectedProfile"
        :show="!!selectedProfile"
        :profile="selectedProfile"
        @close="selectedProfile = null"
        @activate="activateTestingProfile"
        @delete="deleteTestingProfile"
      />
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useUserStore } from "../store/userStore";
import ExpandedProfileCard from "../components/ExpandedProfileCard.vue";
import CreateTestingProfileModal from "../components/testingProfiles/CreateTestingProfileModal.vue";
import { getConfig } from "../config";

export default {
  name: "TestingProfiles",
  components: { ExpandedProfileCard, CreateTestingProfileModal },
  setup() {
    const toast = useToast();
    const profiles = ref([]);
    const expandedProfiles = reactive({});
    const selectedProfile = ref(null);
    const showCreateModal = ref(false);
    const modalProfile = ref(null);
    const newTestingProfile = reactive({ name: "", services: [] });
    const expandedTestProfiles = reactive({});
    const currentPages = reactive({});
    const pageSize = 3;
    const userStore = useUserStore();
    const searchQuery = ref("");
    const filterStatus = ref("all");

    const fetchProfiles = async () => {
      try {
        const response = await fetch(`${getConfig().apiUrl}/profiles`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userStore.token}`,
          },
        });
        if (response.ok) {
          profiles.value = await response.json();
        } else {
          toast.error("Failed to fetch profiles.");
        }
      } catch (error) {
        console.error("Error fetching profiles:", error);
      }
    };

    const filteredProfiles = computed(() => {
      let filtered = profiles.value;

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(
          (profile) =>
            profile.name.toLowerCase().includes(query) ||
            profile.namespace.toLowerCase().includes(query)
        );
      }

      if (filterStatus.value !== "all") {
        filtered = filtered.filter((profile) => {
          const hasTests = profile.testingProfiles?.length > 0;
          return filterStatus.value === "active" ? hasTests : !hasTests;
        });
      }

      return filtered;
    });

    const hasActiveTests = (profile) => {
      return profile.testingProfiles.some(
        (testingProfile) => testingProfile.isActive
      );
    };

    const toggleExpand = (profileId) => {
      expandedProfiles[profileId] = !expandedProfiles[profileId];
    };

    const openCreateModal = (profile) => {
      modalProfile.value = profile;
      newTestingProfile.name = "";
      newTestingProfile.services = [];
      showCreateModal.value = true;
    };

    const closeCreateModal = () => {
      showCreateModal.value = false;
      modalProfile.value = null;
    };

    const createTestingProfile = async (profile) => {
      if (newTestingProfile.services.length === 0) {
        toast.warning("Please add at least one service");
        return;
      }

      try {
        const response = await fetch(
          `${getConfig().apiUrl}/testing-profiles`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newTestingProfile.name,
              profileId: modalProfile.value._id,
              services: newTestingProfile.services,
              createdBy: userStore.user.id,
            }),
          }
        );

        if (response.ok) {
          const createdProfile = await response.json();
          modalProfile.value.testingProfiles.push(createdProfile);
          closeCreateModal();
          toast.success("Testing profile created successfully");
        } else {
          toast.error("Failed to create testing profile");
        }
      } catch (error) {
        console.error("Error creating testing profile:", error);
        toast.error("An error occurred while creating the profile");
      }
    };

    const canUserEditTestingProfile = (profile, testingProfile) => {
      const userPermissions = profile.permissions.find(
        (permission) => permission.user === userStore.user.id
      );

      const isProfileEditor = userPermissions.role !== "viewer";
      const isTestingProfileCreator =
        testingProfile.createdBy === userStore.user.id;

      return isProfileEditor || isTestingProfileCreator;
    };

    const activateTestingProfile = async (profile, testingProfile) => {
      try {
        const endpoint = testingProfile.isActive ? "deactivate" : "activate";
        const response = await fetch(
          `${getConfig().apiUrl}/testing-profiles/${endpoint}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userStore.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              profileId: profile._id,
              testingProfileId: testingProfile._id,
            }),
          }
        );

        if (response.ok) {
          const updatedProfileResponse = await fetch(
            `${getConfig().apiUrl}/profiles/${profile._id}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${userStore.token}`,
              },
            }
          );
          if (!updatedProfileResponse.ok) {
            toast.error("Failed to fetch updated profile data.");
            return;
          }

          const updatedProfile = await updatedProfileResponse.json();
          const profileIndex = profiles.value.findIndex(
            (p) => p._id === profile._id
          );
          if (profileIndex > -1) {
            profiles.value[profileIndex] = updatedProfile;
          }

          toast.success(
            `Testing profile ${
              testingProfile.isActive ? "deactivated" : "activated"
            } successfully`
          );
        } else {
          toast.error("Failed to update testing profile");
        }
      } catch (error) {
        console.error("Error updating testing profile:", error);
        toast.error("An error occurred while updating the profile");
      }
    };

    const deleteTestingProfile = async (profile, testingProfile) => {
      try {
        const response = await fetch(
          `${getConfig().apiUrl}/testing-profiles/${testingProfile._id}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profileId: profile._id,
            }),
          }
        );

        if (response.ok) {
          const profileIndex = profiles.value.findIndex(
            (p) => p._id === profile._id
          );
          if (profileIndex > -1) {
            const updatedTestingProfiles = profiles.value[
              profileIndex
            ].testingProfiles.filter((tp) => tp._id !== testingProfile._id);
            profiles.value[profileIndex].testingProfiles =
              updatedTestingProfiles;
          }
          toast.success("Testing profile deleted successfully");
        } else {
          toast.error("Failed to delete testing profile");
        }
      } catch (error) {
        console.error("Error deleting testing profile:", error);
        toast.error("An error occurred while deleting the profile");
      }
    };

    const openExpandedModal = (profile) => {
      selectedProfile.value = profile;
    };

    const initPagination = (profileId) => {
      if (!currentPages[profileId]) {
        currentPages[profileId] = 1;
      }
    };

    const currentPage = (profileId) => currentPages[profileId] || 1;

    const totalPages = (profileId) => {
      const profile = profiles.value.find((p) => p._id === profileId);
      if (profile && profile.testingProfiles) {
        return Math.ceil(profile.testingProfiles.length / pageSize);
      }
      return 1;
    };

    const nextPage = (profileId) => {
      if (currentPage(profileId) < totalPages(profileId)) {
        currentPages[profileId]++;
      }
    };

    const prevPage = (profileId) => {
      if (currentPage(profileId) > 1) {
        currentPages[profileId]--;
      }
    };

    const paginatedTestingProfiles = (profile) => {
      initPagination(profile._id);
      const start = (currentPage(profile._id) - 1) * pageSize;
      const end = start + pageSize;
      return profile.testingProfiles.slice(start, end);
    };

    const toggleTestProfileExpand = (testProfileId) => {
      expandedTestProfiles[testProfileId] =
        !expandedTestProfiles[testProfileId];
    };

    const handleProfileCreated = (createdProfile) => {
      const profile = profiles.value.find(
        (p) => p._id === createdProfile.profileId
      );
      if (profile) {
        profile.testingProfiles.push(createdProfile);
      }
    };

    onMounted(fetchProfiles);

    return {
      profiles,
      expandedProfiles,
      selectedProfile,
      showCreateModal,
      modalProfile,
      newTestingProfile,
      searchQuery,
      filterStatus,
      filteredProfiles,
      hasActiveTests,
      toggleExpand,
      openCreateModal,
      closeCreateModal,
      createTestingProfile,
      activateTestingProfile,
      deleteTestingProfile,
      openExpandedModal,
      expandedTestProfiles,
      currentPages,
      pageSize,
      currentPage,
      totalPages,
      nextPage,
      prevPage,
      paginatedTestingProfiles,
      toggleTestProfileExpand,
      handleProfileCreated,
      canUserEditTestingProfile,
    };
  },
};
</script>

<style scoped>
/* Transition and Interactive States */
.transform {
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}

/* Focus States */
input:focus,
select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

/* Button Hover Effects */
button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Expand/Collapse Animations */
.transition-all {
  transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
}

/* Disabled State */
.disabled\:opacity-50:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Active Profile Styling */
.bg-blue-50\/40 {
  background-color: rgba(59, 130, 246, 0.1);
}

/* Shadow and Hover Enhancements */
.hover\:shadow-md:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Card Transition */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

/* Responsive Design Adjustments */
@media (max-width: 640px) {
  .flex-col {
    flex-direction: column;
  }

  .w-full {
    width: 100%;
  }
}
</style>
