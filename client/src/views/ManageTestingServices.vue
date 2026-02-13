<template>
  <div class="min-h-screen bg-gray-100 py-10">
    <div class="container mx-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">
        Manage Testing Services
      </h1>

      <!-- Profiles -->
      <div
        v-if="profiles.length"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <div
          v-for="profile in profiles"
          :key="profile.name"
          class="bg-white shadow-md rounded-lg p-4"
        >
          <!-- Profile Header -->
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold text-gray-800">{{ profile.name }}</h2>
            <button
              @click="toggleServicesVisibility(profile.name)"
              class="text-blue-500 hover:text-blue-700"
            >
              {{ profile.showServices ? "Hide Services" : "Show Services" }}
            </button>
          </div>
          <p class="text-sm text-gray-600 mb-2">
            Namespace: {{ profile.namespace }}
          </p>

          <!-- Profile-Specific Search Bar -->
          <div v-show="profile.showServices" class="mb-4">
            <input
              v-model="profile.searchQuery"
              type="text"
              placeholder="Search for a service"
              class="w-full border-gray-300 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Batch Action Buttons -->
          <div
            v-show="profile.showServices"
            class="mb-4 flex items-center gap-4"
          >
            <button
              @click="openNoteModal(profile)"
              class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Mark Selected as Under Test
            </button>
            <button
              @click="toggleGroupedView(profile)"
              class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              {{ profile.showGrouped ? "Ungroup" : "Group by Test Group" }}
            </button>
          </div>

          <!-- Grouped Services -->
          <div v-if="profile.showGrouped">
            <div
              v-for="(group, groupId) in profile.groupedServices"
              :key="groupId"
              class="border border-gray-300 p-4 bg-gray-50 rounded-lg mb-4"
            >
              <h3 class="font-bold text-gray-700 mb-2">
                Testing Reason: {{ group[0]?.note || "No Note Provided" }}
              </h3>
              <input
                v-model="groupSearch[groupId]"
                placeholder="Search within this group..."
                class="w-full border-gray-300 border rounded-lg p-2 mb-2"
              />
              <div class="max-h-40 overflow-y-auto">
                <ul>
                  <li
                    v-for="service in filteredGroupServices(group, groupId)"
                    :key="service.name"
                    class="flex justify-between items-center border-b pb-2"
                  >
                    <div class="flex items-center gap-2">
                      <span>{{ service.name }}</span>
                      <span class="text-green-600 text-sm font-medium"
                        >Under Test</span
                      >
                    </div>
                    <button
                      @click="removeServiceFromTest(profile, service)"
                      class="text-red-500 underline text-sm"
                    >
                      Remove
                    </button>
                  </li>
                </ul>
              </div>
              <button
                @click="removeAllFromGroup(profile, group)"
                class="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
              >
                Remove All in Group
              </button>
            </div>
          </div>

          <div
            v-if="showConfirmationModal"
            class="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50"
          >
            <div class="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 class="text-lg font-bold mb-4">Confirm Action</h2>
              <p class="text-sm mb-4">
                Do you want to synchronize the following services back to their
                desired form?
              </p>
              <ul class="list-disc list-inside text-gray-700 mb-4">
                <li v-for="service in selectedServices" :key="service.name">
                  {{ service.name }}
                </li>
              </ul>
              <div class="flex justify-end gap-4">
                <button
                  @click="showConfirmationModal = false"
                  class="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  @click="confirmGroupRemoval"
                  class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Yes!
                </button>
              </div>
            </div>
          </div>

          <!-- Ungrouped Services -->
          <ul v-else v-show="profile.showServices" class="space-y-2">
            <div class="mb-2 flex justify-between items-center">
              <span
                >Page {{ profile.currentPage }} of
                {{ totalPages(profile) }}</span
              >
              <div v-if="totalPages(profile) > 1" class="flex gap-2">
                <button
                  @click="prevPage(profile)"
                  :disabled="profile.currentPage === 1"
                  class="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                >
                  Prev
                </button>
                <button
                  @click="nextPage(profile)"
                  :disabled="profile.currentPage === totalPages(profile)"
                  class="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
            <li
              v-for="service in paginatedServices(profile)"
              :key="service.name"
              class="flex justify-between items-center border-b pb-2"
            >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  v-model="profile.selectedServices"
                  :disabled="service.underTest"
                  :value="service.name"
                  class="form-checkbox h-5 w-5 text-blue-600"
                />
                <span class="text-gray-700">{{ service.name }}</span>
                <span
                  v-if="service.underTest"
                  class="text-green-600 text-sm font-medium"
                >
                  Under Test
                </span>
              </div>
              <button
                v-if="service.underTest"
                @click="removeServiceFromTest(profile, service)"
                class="text-red-500 underline text-sm"
              >
                Remove
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- No Profiles -->
      <div v-else class="text-gray-600 text-center py-8">
        <p>
          No profiles found. Try adding a new profile or adjusting your search
          query.
        </p>
      </div>

      <!-- Note Input Modal -->
      <div
        v-if="showModal"
        class="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50"
      >
        <div class="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 class="text-lg font-bold mb-4">Add a Testing Reason</h2>
          <p class="text-sm mb-4">
            Add a testing reason for the selected services in
            <strong>{{ modalProfile?.name }}</strong
            >.
          </p>
          <textarea
            v-model="modalNote"
            rows="4"
            placeholder="Enter your reason here..."
            class="w-full border-gray-300 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
          <div class="flex justify-end mt-4">
            <button
              @click="closeNoteModal"
              class="bg-gray-300 text-gray-800 px-4 py-2 rounded mr-2"
            >
              Cancel
            </button>
            <button
              @click="confirmNote"
              class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import { getConfig } from "../config";

export default defineComponent({
  name: "ManageTestingServices",
  setup() {
    const router = useRouter();
    const toast = useToast();
    const profiles = ref<any[]>([]);
    const showModal = ref(false);
    const modalNote = ref("");
    const modalProfile = ref<any>(null);
    const groupSearch = ref<Record<number, string>>({}); // Store group-specific searches
    const showConfirmationModal = ref(false);
    const selectedServices = ref<any[]>([]); // Added reactive selectedServices for confirmation modal

    const fetchProfiles = async () => {
      try {
        const response = await fetch(`${getConfig().apiUrl}/profiles`);
        if (response.ok) {
          profiles.value = (await response.json()).map((profile: any) => ({
            ...profile,
            showServices: true,
            showGrouped: false,
            searchQuery: "",
            selectedServices: [],
            currentPage: 1,
          }));
        } else {
          toast.error("Failed to fetch profiles.");
        }
      } catch (error) {
        toast.error("Error fetching profiles.");
        console.error("Fetch Profiles Error:", error);
      }
    };

    const totalPages = (profile: any) =>
      Math.ceil(filteredServices(profile).length / 10);

    const paginatedServices = (profile: any) =>
      filteredServices(profile).slice(
        (profile.currentPage - 1) * 10,
        profile.currentPage * 10
      );

    const prevPage = (profile: any) => {
      if (profile.currentPage > 1) profile.currentPage--;
    };

    const nextPage = (profile: any) => {
      if (profile.currentPage < totalPages(profile)) profile.currentPage++;
    };

    const filteredServices = (profile: any) => {
      const query = profile.searchQuery.toLowerCase();
      return profile.services.filter((service: any) =>
        service.name.toLowerCase().includes(query)
      );
    };

    const filteredGroupServices = (group: any, groupId: number) => {
      const query = groupSearch.value[groupId]?.toLowerCase() || "";
      return group.filter((service: any) =>
        service.name.toLowerCase().includes(query)
      );
    };

    const toggleServicesVisibility = (profileName: string) => {
      const profile = profiles.value.find((p: any) => p.name === profileName);
      if (profile) profile.showServices = !profile.showServices;
    };

    const toggleGroupedView = (profile: any) => {
      if (!profile.showGrouped) {
        profile.groupedServices = Object.values(
          profile.services.reduce((groups: any, service: any) => {
            if (service.underTest && service.note) {
              if (!groups[service.note]) {
                groups[service.note] = [];
              }
              groups[service.note].push(service);
            }
            return groups;
          }, {})
        );
      }
      profile.showGrouped = !profile.showGrouped;
    };

    const openNoteModal = (profile: any) => {
      if (!profile.selectedServices.length){
        toast.warning("Please choose the tested services before writing the Testing Reason")
      }
      else {
        modalProfile.value = profile;
      modalNote.value = "";
      showModal.value = true;
      }
    };

    const closeNoteModal = () => {
      showModal.value = false;
    };

    const confirmNote = async () => {
      const selectedServicesLocal = modalProfile.value.selectedServices;
      const namespace = modalProfile.value.namespace;
      try {
        const response = await fetch(
          `${getConfig().apiUrl}/services/update-testing`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              namespace,
              services: selectedServicesLocal,
              note: modalNote.value,
              underTest: true,
            }),
          }
        );

        if (response.ok) {
          toast.success("Services updated with note successfully.");
          selectedServicesLocal.forEach((serviceName: string) => {
            const service = modalProfile.value.services.find(
              (s: any) => s.name === serviceName
            );
            if (service) {
              service.underTest = true;
              service.note = modalNote.value;
            }
          });
        } else {
          toast.error("Failed to update services.");
        }
      } catch (error) {
        toast.error("An error occurred while updating services.");
        console.error("Update Service Status Error:", error);
      } finally {
        modalProfile.value.selectedServices = [];
        closeNoteModal();
      }
    };

    const removeServiceFromTest = async (profile: any, service: any) => {
      try {
        const response = await fetch(
          `${getConfig().apiUrl}/services/update-testing`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              namespace: profile.namespace,
              services: [service.name],
              note: "",
              underTest: false,
            }),
          }
        );

        if (response.ok) {
          service.underTest = false;
          service.note = "";
          toast.success(`Removed "${service.name}" from testing.`);
          // populate confirmation list and show modal
          selectedServices.value = [service];
          showConfirmationModal.value = true;
        } else {
          toast.error("Failed to remove service from testing.");
        }
      } catch (error) {
        toast.error("An error occurred while removing service.");
        console.error("Error:", error);
      }
    };

    const removeAllFromGroup = async (profile: any, group: any) => {
      const servicesToRemove = group;
      try {
        const response = await fetch(
          `${getConfig().apiUrl}/services/update-testing`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              namespace: profile.namespace,
              services: servicesToRemove.map((s: any) => s.name),
              note: "",
              underTest: false,
            }),
          }
        );

        if (response.ok) {
          servicesToRemove.forEach((service: any) => {
            service.underTest = false;
            service.note = "";
          });
          toast.success("Removed all services from group testing.");
          // populate confirmation list and show modal
          selectedServices.value = servicesToRemove;
          showConfirmationModal.value = true;
        } else {
          toast.error("Failed to remove group from testing.");
        }
      } catch (error) {
        toast.error("An error occurred while removing group.");
        console.error("Error:", error);
      }
    };

    const confirmGroupRemoval = () => {
      // Redirect to the profiles page after confirmation
      showConfirmationModal.value = true;
      router.push("/profiles");
      toast.success("Group services synchronized and removed successfully.");
    };

    onMounted(fetchProfiles);

    return {
      profiles,
      groupSearch,
      filteredServices,
      filteredGroupServices,
      paginatedServices,
      totalPages,
      prevPage,
      nextPage,
      toggleServicesVisibility,
      toggleGroupedView,
      showModal,
      modalNote,
      modalProfile,
      showConfirmationModal,
      selectedServices,
      openNoteModal,
      closeNoteModal,
      confirmNote,
      removeServiceFromTest,
      removeAllFromGroup,
      confirmGroupRemoval,
    };
  },
});
</script>

<style scoped>
.grid {
  gap: 1.5rem;
}

.form-checkbox {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #cbd5e1;
  border-radius: 0.25rem;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.form-checkbox:checked {
  background-color: #02a5e6;
  border-color: #c9c9c9;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.max-h-40 {
  max-height: 10rem;
}
</style>
