<template>
  <div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-gray-600 font-semibold mb-2">Service Name</label>
        <input
          v-model="service.name"
          type="text"
          placeholder="Enter service name"
          class="w-full border-gray-300 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-gray-600 font-semibold mb-2">Version</label>
        <input
          v-model="service.version"
          type="text"
          placeholder="Enter version (e.g., prod)"
          class="w-full border-gray-300 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-gray-600 font-semibold mb-2">Manifest Path</label>
        <input
          v-model="service.manifestPath"
          type="text"
          placeholder="Enter manifest path"
          class="w-full border-gray-300 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-gray-600 font-semibold mb-2">Namespace</label>
        <input
          v-model="service.namespace"
          type="text"
          placeholder="Enter namespace"
          class="w-full border-gray-300 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
    <div class="mt-4 text-right">
      <button
        @click="removeService"
        type="button"
        class="px-4 py-2 bg-red-500 text-white font-bold rounded hover:bg-red-600 transition"
      >
        Remove Service
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

export default defineComponent({
  props: {
    service: {
      type: Object as PropType<{ name: string; version: string; manifestPath: string; namespace: string }>,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
  },
  emits: ['update', 'remove'],
  methods: {
    removeService() {
      this.$emit('remove', this.index);
    },
  },
});
</script>
