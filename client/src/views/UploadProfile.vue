<template>
  <div class="min-h-screen bg-gray-100 flex flex-col items-center py-10">
    <div class="bg-white shadow-md rounded-lg p-8 w-full max-w-3xl">
      <h1 class="text-3xl font-bold text-gray-800 mb-4">
        Create and Upload Profile
      </h1>

      <!-- Step 1: Connection Method -->
      <OpenShiftAccessSelector
        v-model:method="connectionMethod"
        v-model:serviceAccountName="profile.serviceAccountName"
        v-model:role="profile.role"
        v-model:userToken="profile.userToken"
        v-model:clusterUrl="profile.clusterUrl"
        :namespace="profile.namespace"
        @verified="connectionVerified = true"
        :errors="errors"
      />

      <!-- Step 2: Profile Details -->
      <ProfileDetails
        :profile="profile"
        :errors="errors"
        @update-profile="updateProfileDetails"
        :disabled="!connectionVerified"
      />

      <!-- Step 3: Fetch Services -->
      <div class="my-4">
        <button
          @click="fetchServices"
          :disabled="fetching || !connectionVerified"
          class="px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 transition disabled:bg-blue-300"
        >
          {{
            fetching ? "Fetching Services..." : "Fetch Services from Namespace"
          }}
        </button>
      </div>

      <!-- Step 4: Services Table -->
      <ServicesTable
        :services="profile.services"
        :errors="errors.services"
        :enable-pod-count="enablePodCount"
        @add-service="addService"
        @remove-service="removeService"
        @update-service="updateService"
      />

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
          :disabled="loading || !connectionVerified"
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
import { useUserStore } from "../store/userStore";
import ProfileDetails from "../components/uploadProfile/ProfileDetails.vue";
import ServicesTable from "../components/uploadProfile/ServicesTable.vue";
import OpenShiftAccessSelector from "../components/uploadProfile/OpenShiftAccessSelector.vue";
import { getConfig } from "../config";

export default defineComponent({
  components: { ProfileDetails, ServicesTable, OpenShiftAccessSelector },
  setup() {
    const toast = useToast();
    const userStore = useUserStore();

    const profile = reactive({
      name: "",
      namespace: "",
      userToken: "",
      clusterUrl: "",
      serviceAccountName: "",
      role: "viewer",
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

    const connectionMethod = ref("default");
    const connectionVerified = ref(false);
    const enablePodCount = ref(false);
    const loading = ref(false);
    const fetching = ref(false);

    const updateProfileDetails = (details: any) => {
      Object.assign(profile, details);
    };

    const fetchServices = async () => {
      fetching.value = true;
      try {
        const response = await fetch(`${getConfig().apiUrl}/services`, {
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

        if (!response.ok) throw new Error("Failed to fetch services.");

        const data = await response.json();
        profile.services = data.serviceNames.map((name: string) => ({
          name,
          version: "",
          podCount: 1,
          underTest: false,
        }));
        toast.success("Services fetched successfully!");
      } catch (error) {
        toast.error("Error fetching services. Please try again.");
      } finally {
        fetching.value = false;
      }
    };

    const addService = () => {
      profile.services.push({ name: "", version: "", podCount: 1, underTest: false });
      errors.services.push({});
    };

    const removeService = (index: number) => {
      profile.services.splice(index, 1);
      errors.services.splice(index, 1);
    };

    const updateService = (index: number, service: any) => {
      profile.services[index] = service;
    };

    const saveDraft = () => {
      localStorage.setItem("draftProfile", JSON.stringify(profile));
      toast.success("Draft saved successfully!");
    };

    const submitProfile = async () => {
      if (!validate()) {
        toast.error("Validation failed. Please correct the errors and try again.");
        return;
      }
      loading.value = true;
      try {
        const response = await fetch(`${getConfig().apiUrl}/profiles`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userStore.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profile),
        });
        if (!response.ok) throw new Error();

        const data = await response.json();
        toast.success(`Profile "${data.profile.name}" uploaded successfully!`);
        Object.assign(profile, { name: "", namespace: "", userToken: "", clusterUrl: "", services: [] });
        errors.services = [];
      } catch (error) {
        toast.error("Error uploading profile.");
      } finally {
        loading.value = false;
      }
    };

    const validate = (): boolean => {
      let valid = true;
      errors.profileName = profile.name ? "" : "Profile name is required.";
      errors.namespace = profile.namespace ? "" : "Namespace is required.";
      errors.userToken = profile.userToken ? "" : "API Token is required.";
      errors.clusterUrl = profile.clusterUrl ? "" : "Cluster URL is required.";
      errors.services = profile.services.map((service) => {
        const error: any = {};
        if (!service.name) error.name = "Service name is required.";
        if (!service.version) error.version = "Version is required.";
        if (enablePodCount.value && (!service.podCount || service.podCount < 1)) {
          error.podCount = "Pod count must be at least 1.";
        }
        if (Object.keys(error).length > 0) valid = false;
        return error;
      });
      return valid;
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
      connectionMethod,
      connectionVerified,
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
