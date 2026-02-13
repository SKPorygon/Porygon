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
        <div class="relative">
          <label class="block font-medium text-gray-700 mb-1 flex items-center">
            Cluster API URL
            <Tooltip text="To get the Cluster API URL:
            1. Open OpenShift Console.
            2. Click your username > Copy Login Command.
            3. Use the value after --server in the command." />
          </label>
          <input
            v-model="apiTokenInputs.clusterUrl"
            class="w-full border rounded px-3 py-2"
            placeholder="https://api.your-cluster.example.com:6443"
          />
        </div>
        <div class="relative">
          <label class="block font-medium text-gray-700 mb-1 flex items-center">
            API Token
            <Tooltip text="From the Copy Login Command in OpenShift, the token is the value after --token." />
          </label>
          <input
            v-model="apiTokenInputs.userToken"
            class="w-full border rounded px-3 py-2"
            placeholder="sha256~xxx..."
          />
        </div>
      </div>
  
      <!-- Service Account Inputs -->
      <div v-if="accessType === 'serviceAccount'" class="space-y-4">
        <div class="relative">
          <label class="block font-medium text-gray-700 mb-1 flex items-center">
            Cluster API URL
            <Tooltip text="Same as API token method: Get from --server value in OpenShift login command." />
          </label>
          <input
            v-model="saInputs.clusterUrl"
            class="w-full border rounded px-3 py-2"
            placeholder="https://api.your-cluster.example.com:6443"
          />
        </div>
        <div class="relative">
          <label class="block font-medium text-gray-700 mb-1 flex items-center">
            Secret Name
            <Tooltip text="In OpenShift UI: Go to Workloads > Secrets in your namespace and copy the name of the sa secret." />
          </label>
          <input
            v-model="saInputs.secretName"
            class="w-full border rounded px-3 py-2"
            placeholder="porygon-sa-dockercfg-xxxxx"
          />
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, defineEmits, watch } from 'vue';
  
  const emit = defineEmits(['update']);
  
  const accessType = ref<'token' | 'serviceAccount'>('token');
  
  const apiTokenInputs = ref({
    clusterUrl: '',
    userToken: ''
  });
  
  const saInputs = ref({
    clusterUrl: '',
    secretName: ''
  });
  
  watch([accessType, apiTokenInputs, saInputs], () => {
    if (accessType.value === 'token') {
      emit('update', {
        method: 'token',
        ...apiTokenInputs.value
      });
    } else {
      emit('update', {
        method: 'serviceAccount',
        ...saInputs.value
      });
    }
  });
  </script>
  
  <!-- Tooltip Sub-Component -->
  <script lang="ts">
  export default {
    components: {
      Tooltip: {
        props: { text: String },
        template: `
          <span class="ml-2 text-blue-500 cursor-pointer relative group">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M12 4.75a7.5 7.5 0 11-7.5 7.5 7.5 7.5 0 017.5-7.5z" />
            </svg>
            <div
              class="absolute left-8 bottom-1/2 transform translate-y-1/2 bg-gray-800 text-white text-xs rounded p-2 shadow-lg z-10 hidden group-hover:block w-64 whitespace-pre-line"
            >
              {{ text }}
            </div>
          </span>
        `
      }
    }
  };
  </script>
  