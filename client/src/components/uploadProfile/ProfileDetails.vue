<template>
  <div>
    <!-- Profile Name -->
    <div class="mb-6">
      <label class="block text-gray-600 font-semibold mb-2">Profile Name</label>
      <input
        v-model="profile.name"
        type="text"
        placeholder="Enter profile name"
        class="w-full border-gray-300 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span v-if="errors.profileName" class="text-red-500 text-sm">{{ errors.profileName }}</span>
    </div>

    <!-- Namespace -->
    <div class="mb-6">
      <label class="block text-gray-600 font-semibold mb-2">Namespace (Project)</label>
      <input
        v-model="profile.namespace"
        type="text"
        placeholder="Enter namespace"
        class="w-full border-gray-300 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span v-if="errors.namespace" class="text-red-500 text-sm">{{ errors.namespace }}</span>
    </div>

     <!-- Cluster API URL -->
     <!-- <div class="mb-6 relative">
    <label class="block text-gray-600 font-semibold mb-2 flex items-center">
      Cluster API URL
      <span class="ml-2 text-blue-500 cursor-pointer relative group">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M12 4.75a7.5 7.5 0 11-7.5 7.5 7.5 7.5 0 017.5-7.5z"
          />
        </svg>
         Tooltip
        <div
          class="absolute left-8 bottom-1/2 transform translate-y-1/2 bg-gray-800 text-white text-xs rounded p-2 shadow-lg z-10 hidden group-hover:block w-64"
        >
          To get the Cluster API URL:
          <ul class="list-disc ml-4">
            <li>Open the OpenShift Web Console.</li>
            <li>Click your username (top-right corner).</li>
            <li>Select <strong>Copy Login Command</strong>.</li>
            <li>
              Find the <code>--server</code> value in the command
              (e.g., <code>https://api.your-cluster.example.com:6443</code>).
            </li>
            <li>Copy and paste it here.</li>
          </ul>
        </div>
      </span>
    </label>
    <input
      v-model="profile.clusterUrl"
      type="text"
      placeholder="Enter Cluster API URL"
      class="w-full border-gray-300 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <span v-if="errors.clusterUrl" class="text-red-500 text-sm">{{ errors.clusterUrl }}</span>
  </div> -->

    <!-- OpenShift API Token -->
    <!-- <div class="mb-6 relative">
      <label class="block text-gray-600 font-semibold mb-2 flex items-center">
        OpenShift API Token
        <span
          class="ml-2 text-blue-500 cursor-pointer relative group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M12 4.75a7.5 7.5 0 11-7.5 7.5 7.5 7.5 0 017.5-7.5z"
            />
          </svg>
          Tooltip
          <div
            class="absolute left-8 bottom-1/2 transform translate-y-1/2 bg-gray-800 text-white text-xs rounded p-2 shadow-lg z-10 hidden group-hover:block w-64"
          >
            Get your API token by running: 
            <br />
            <code class="bg-gray-700 text-yellow-300 p-1 rounded">oc whoami -t</code> in the OpenShift Web Terminal,
            <br />
            Copy the result and paste it here!
          </div>
        </span>
      </label>
      <input
        v-model="profile.userToken"
        type="password"
        placeholder="Enter your OpenShift API Token"
        class="w-full border-gray-300 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span v-if="errors.userToken" class="text-red-500 text-sm">{{ errors.userToken }}</span>
    </div> -->
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

export default defineComponent({
  props: {
    profile: {
      type: Object as PropType<{ name: string; namespace: string; userToken: string, clusterUrl: string }>,
      required: true,
    },
    errors: {
      type: Object as PropType<{ profileName: string; namespace: string; userToken: string, clusterUrl: string }>,
      required: true,
    },
  },
});
</script>
