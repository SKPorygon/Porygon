<template>
  <div class="space-y-6">
    <!-- Access Type Selection -->
    <div>
      <label class="block font-medium text-gray-700 mb-1">Access Method</label>
      <div class="flex space-x-4">
        <label class="flex items-center space-x-2">
          <input type="radio" value="token" v-model="accessType" />
          <span>API Token</span>
        </label>
        <label class="flex items-center space-x-2">
          <input type="radio" value="serviceAccount" v-model="accessType" />
          <span>Service Account Secret</span>
        </label>
      </div>
    </div>

    <!-- API Token Inputs -->
    <div v-if="accessType === 'token'" class="space-y-4">
      <div>
        <label class="block font-medium text-gray-700 mb-1">
          Cluster API URL
        </label>
        <input
          v-model="clusterUrlLocal"
          class="w-full border rounded px-3 py-2"
          placeholder="https://api.your-cluster.example.com:6443"
        />
      </div>

      <div>
        <label class="block font-medium text-gray-700 mb-1">
          API Token
        </label>
        <input
          v-model="userTokenLocal"
          class="w-full border rounded px-3 py-2"
          placeholder="sha256~xxx..."
        />
      </div>
    </div>

    <!-- Service Account Inputs -->
    <div v-if="accessType === 'serviceAccount'" class="space-y-4">
      <div>
        <label class="block font-medium text-gray-700 mb-1">
          Cluster API URL
        </label>
        <input
          v-model="clusterUrlLocal"
          class="w-full border rounded px-3 py-2"
          placeholder="https://api.your-cluster.example.com:6443"
        />
      </div>

      <div>
        <label class="block font-medium text-gray-700 mb-1">
          Secret Name
        </label>
        <input
          v-model="serviceAccountNameLocal"
          class="w-full border rounded px-3 py-2"
          placeholder="porygon-sa-dockercfg-xxxxx"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";

/**
 * Props coming from parent v-model
 */
const props = defineProps<{
  method: string;
  userToken: string;
  clusterUrl: string;
  serviceAccountName: string;
}>();

/**
 * Emits matching v-model names
 */
const emit = defineEmits([
  "update:method",
  "update:userToken",
  "update:clusterUrl",
  "update:serviceAccountName",
  "verified",
]);

/**
 * Local state
 */
const accessType = ref(props.method || "token");

const userTokenLocal = ref(props.userToken || "");
const clusterUrlLocal = ref(props.clusterUrl || "");
const serviceAccountNameLocal = ref(props.serviceAccountName || "");

/**
 * Sync method change
 */
watch(accessType, (val) => {
  emit("update:method", val);
});

/**
 * Sync inputs to parent
 */
watch(userTokenLocal, (val) => {
  emit("update:userToken", val);
});

watch(clusterUrlLocal, (val) => {
  emit("update:clusterUrl", val);
});

watch(serviceAccountNameLocal, (val) => {
  emit("update:serviceAccountName", val);
});

/**
 * Verification logic
 */
const isVerified = computed(() => {
  if (accessType.value === "token") {
    return userTokenLocal.value && clusterUrlLocal.value;
  } else {
    return serviceAccountNameLocal.value && clusterUrlLocal.value;
  }
});

watch(isVerified, (val) => {
  if (val) {
    emit("verified");
  }
});
</script>
