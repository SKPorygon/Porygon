<template>
  <div class="min-h-screen bg-gray-100 flex flex-col items-center py-10">
    <div class="bg-white shadow-md rounded-lg p-8 w-full max-w-3xl">
      <h1 class="text-3xl font-bold text-gray-800 mb-4">
        Create and Upload Profile
      </h1>

      <!-- Profile Details -->
      <ProfileDetails
        :profile="profile"
        :errors="errors"
        @update-profile="updateProfileDetails"
      />

      <!-- Fetch Services Button -->
      <div class="my-4">
        <button
          @click="fetchServices"
          :disabled="fetching"
          class="px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 transition disabled:bg-blue-300"
        >
          {{
            fetching ? "Fetching Services..." : "Fetch Services from Namespace"
          }}
        </button>
      </div>

      <!-- Services Table -->
      <ServicesTable
        :services="profile.services"
        :errors="errors.services"
        :enable-pod-count="enablePodCount"
        @add-service="addService"
        @remove-service="removeService"
        @update-service="updateService"
      />

      <!-- Toggle Pod Count -->
      <div class="mt-6 mb-4">
        <label class="flex items-center space-x-2">
          <input
            type="checkbox"
            v-model="enablePodCount"
            class="form-checkbox h-5 w-5 text-blue-600"
          />
          <span class="text-gray-800">Enable Desired Pod Count</span>
        </label>
      </div>

      <!-- Save and Submit Buttons -->
      <div class="flex flex-col md:flex-row mt-6 gap-4">
        <button
          @click="saveDraft"
          type="button"
          class="flex-1 px-4 py-2 bg-gray-500 text-white font-bold rounded hover:bg-gray-600 transition"
        >
          Save Draft
        </button>
        <button
          @click="submitProfile"
          :disabled="loading"
          class="flex-1 px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 transition disabled:bg-blue-300"
        >
          {{ loading ? "Submitting..." : "Submit Profile" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import ProfileDetails from "../components/uploadProfile/ProfileDetails.vue";
import ServicesTable from "../components/uploadProfile/ServicesTable.vue";
import { useUserStore } from "../store/userStore";

export default defineComponent({
  components: { ProfileDetails, ServicesTable },
  setup() {
    const toast = useToast();
    const userStore = useUserStore();

    const profile = reactive({
      name: "",
      namespace: "",
      userToken: "",
      clusterUrl: "",
      services: [] as Array<{
        name: string;
        version: string;
        podCount?: number;
        underTest: boolean;
      }>,
    });

    const errors = reactive({
      profileName: "",
      namespace: "",
      userToken: "",
      clusterUrl: "",
      services: [] as Array<{
        name?: string;
        version?: string;
        podCount?: string;
      }>,
    });

    const enablePodCount = ref(false); // Toggle for pod count
    const loading = ref(false);
    const fetching = ref(false);

    const updateProfileDetails = (details: {
      name: string;
      namespace: string;
      userToken: string;
      clusterUrl: string;
    }) => {
      profile.name = details.name;
      profile.namespace = details.namespace;
      profile.userToken = details.userToken;
      profile.clusterUrl = details.clusterUrl;
    };

    const fetchServices = async () => {
      if (!profile.namespace || !profile.userToken || !profile.clusterUrl) {
        toast.error(
          "Namespace, Cluster URL, and API Token are required to fetch services."
        );
        return;
      }

      fetching.value = true;
      try {
        const response = await fetch("http://localhost:3000/api/services", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userStore.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            namespace: profile.namespace,
            userToken: profile.userToken,
            clusterUrl: profile.clusterUrl,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch services.");
        }

        const data = await response.json();
        profile.services = data.serviceNames.map((name: string) => ({
          name,
          version: "",
          podCount: 1, // Default pod count
          underTest: false,
        }));
        toast.success("Services fetched successfully!");
      } catch (error) {
        console.error(error);
        toast.error("Error fetching services. Please try again.");
      } finally {
        fetching.value = false;
      }
    };

    const addService = () => {
      profile.services.push({
        name: "",
        version: "",
        podCount: 1,
        underTest: false,
      });
      errors.services.push({});
    };

    const removeService = (index: number) => {
      profile.services.splice(index, 1);
      errors.services.splice(index, 1);
    };

    const updateService = (
      index: number,
      service: { name: string; version: string; podCount?: number }
    ) => {
      profile.services[index] = service;
    };

    const saveDraft = () => {
      localStorage.setItem("draftProfile", JSON.stringify(profile));
      toast.success("Draft saved successfully!");
    };

    const validate = (): boolean => {
      let valid = true;

      errors.profileName = profile.name ? "" : "Profile name is required.";
      errors.namespace = profile.namespace ? "" : "Namespace is required.";
      errors.userToken = profile.userToken ? "" : "API Token is required.";
      errors.clusterUrl = profile.clusterUrl ? "" : "Cluster URL is required.";

      errors.services = profile.services.map((service) => {
        const error: { name?: string; version?: string; podCount?: string } =
          {};
        if (!service.name) error.name = "Service name is required.";
        if (!service.version) error.version = "Version is required.";
        if (
          enablePodCount.value &&
          (!service.podCount || service.podCount < 1)
        ) {
          error.podCount = "Pod count must be at least 1.";
        }
        if (Object.keys(error).length > 0) valid = false;
        return error;
      });

      return valid;
    };

    const submitProfile = async () => {
      if (!validate()) {
        toast.error(
          "Validation failed. Please correct the errors and try again."
        );
        return;
      }

      loading.value = true;
      try {
        const response = await fetch("http://localhost:3000/api/profiles", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userStore.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profile),
        });
        if (response.ok) {
          const data = await response.json();
          toast.success(
            `Profile "${data.profile.name}" uploaded successfully!`
          );
          profile.name = "";
          profile.namespace = "";
          profile.userToken = "";
          profile.clusterUrl = "";
          profile.services = [];
          errors.services = [];
        } else {
          toast.error("Failed to upload profile.");
        }
      } catch (error) {
        toast.error("Error uploading profile.");
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      const draft = localStorage.getItem("draftProfile");
      if (draft) Object.assign(profile, JSON.parse(draft));
    });

    return {
      profile,
      errors,
      loading,
      fetching,
      enablePodCount,
      updateProfileDetails,
      fetchServices,
      addService,
      removeService,
      updateService,
      saveDraft,
      submitProfile,
    };
  },
});
</script>
