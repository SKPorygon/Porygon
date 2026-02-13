<template>
  <div class="min-h-screen bg-gray-100 py-10">
    <div class="container mx-auto max-w-4xl bg-white p-6 rounded-lg shadow-md">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Update Profile</h1>
        <button
          @click="navigateBack"
          class="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm"
        >
          Back to Profiles
        </button>
      </div>

      <!-- Profile Details -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-4">Profile Details</h2>
        <form class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Profile Name
            </label>
            <input
              v-model="profile.name"
              type="text"
              class="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter profile name"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Namespace
            </label>
            <input
              v-model="profile.namespace"
              type="text"
              class="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter namespace"
            />
          </div>
        </form>
      </div>

      <!-- Existing Services -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-4">Existing Services</h2>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead class="bg-gray-200">
              <tr>
                <th class="border border-gray-300 p-2 text-left">
                  Service Name
                </th>
                <th class="border border-gray-300 p-2 text-left">
                  Desired Version
                </th>
                <th class="border border-gray-300 p-2 text-left">
                  Desired Pods
                </th>
                <th class="border border-gray-300 p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(service, index) in profile.services"
                :key="index"
                class="hover:bg-gray-50"
              >
                <td class="border border-gray-300 p-2">
                  <input
                    v-model="service.name"
                    type="text"
                    class="w-full border border-gray-300 rounded-lg px-2 py-1"
                  />
                </td>
                <td class="border border-gray-300 p-2">
                  <input
                    v-model="service.version"
                    type="text"
                    class="w-full border border-gray-300 rounded-lg px-2 py-1"
                  />
                </td>
                <td class="border border-gray-300 p-2">
                  <input
                    v-model="service.podCount"
                    type="number"
                    class="w-full border border-gray-300 rounded-lg px-2 py-1"
                    min="1"
                  />
                </td>
                <td class="border border-gray-300 p-2 text-center">
                  <button
                    @click="removeService(index)"
                    class="text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add New Service -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-4">Add New Service</h2>
        <form class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Service Name
            </label>
            <input
              v-model="newService.name"
              type="text"
              class="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter service name"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Desired Version
            </label>
            <input
              v-model="newService.version"
              type="text"
              class="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter desired version"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Desired Pods
            </label>
            <input
              v-model="newService.podCount"
              type="number"
              class="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter desired pod count"
              min="1"
            />
          </div>
          <div>
            <button
              @click.prevent="addService"
              class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add Service
            </button>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-4">
        <button
          @click="navigateBack"
          class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
        >
          Cancel
        </button>
        <button
          @click="saveProfile"
          class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useUserStore } from "../store/userStore";
import { getConfig } from "../config";

export default defineComponent({
  name: "UpdateProfile",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const toast = useToast();
    const userStore = useUserStore();

    const profile = ref({
      name: "",
      namespace: "",
      services: <any[]>[],
    });

    const newService = ref({
      name: "",
      version: "",
      podCount: 1,
    });

    const fetchProfile = async () => {
      try {
        const response = await fetch(
          `${getConfig().apiUrl}/profiles/${route.params.id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${userStore.token}`,
            },
          }
        );
        if (response.ok) {
          profile.value = await response.json();
        } else {
          toast.error("Failed to fetch profile.");
          router.push("/profiles");
        }
      } catch (error) {
        toast.error("An error occurred while fetching the profile.");
        router.push("/profiles");
      }
    };

    const addService = () => {
      if (!newService.value.name || !newService.value.version) {
        toast.error("Please provide valid service details.");
        return;
      }
      profile.value.services.push({ ...newService.value });
      newService.value = { name: "", version: "", podCount: 1 };
    };

    const removeService = (index: number) => {
      profile.value.services.splice(index, 1);
    };

    const saveProfile = async () => {
      try {
        const response = await fetch(
          `${getConfig().apiUrl}/profiles/${route.params.id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${userStore.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(profile.value),
          }
        );
        if (response.ok) {
          toast.success("Profile updated successfully!");
          router.push("/profiles");
        } else {
          toast.error("Failed to update profile.");
        }
      } catch (error) {
        toast.error("An error occurred while updating the profile.");
      }
    };

    const navigateBack = () => {
      router.push("/profiles");
    };

    onMounted(fetchProfile);

    return {
      profile,
      newService,
      addService,
      removeService,
      saveProfile,
      navigateBack,
    };
  },
});
</script>

<style scoped>
.container {
  max-width: 768px;
  margin: 0 auto;
}
</style>
