<template>
  <div>
    <table class="w-full border-collapse border border-gray-300 mb-4">
      <thead class="bg-gray-200">
        <tr>
          <th class="border border-gray-300 p-2 text-left">Service Name</th>
          <th class="border border-gray-300 p-2 text-left">Desired Version</th>
          <th v-if="enablePodCount" class="border border-gray-300 p-2 text-left">Desired Pod Count</th>
          <th class="border border-gray-300 p-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(service, index) in services" :key="index">
          <td class="border border-gray-300 p-2">
            <input
              v-model="service.name"
              type="text"
              class="w-full border border-gray-300 rounded p-1"
              placeholder="Service Name"
            />
            <span v-if="errors[index]?.name" class="text-red-500 text-sm">{{ errors[index].name }}</span>
          </td>
          <td class="border border-gray-300 p-2">
            <input
              v-model="service.version"
              type="text"
              class="w-full border border-gray-300 rounded p-1"
              placeholder="Version"
            />
            <span v-if="errors[index]?.version" class="text-red-500 text-sm">{{ errors[index].version }}</span>
          </td>
          <td v-if="enablePodCount" class="border border-gray-300 p-2">
            <input
              v-model.number="service.podCount"
              type="number"
              min="1"
              class="w-full border border-gray-300 rounded p-1"
              placeholder="Pod Count"
            />
            <span v-if="errors[index]?.podCount" class="text-red-500 text-sm">{{ errors[index].podCount }}</span>
          </td>
          <td class="border border-gray-300 p-2 text-center">
            <button
              @click="$emit('remove-service', index)"
              class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
            >
              Remove
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <button
      type="button"
      @click="$emit('add-service')"
      class="px-4 py-2 bg-green-500 text-white font-bold rounded hover:bg-green-600 transition"
    >
      Add Service
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

export default defineComponent({
  props: {
    services: {
      type: Array as PropType<
        Array<{ name: string; version: string; podCount?: number }>
      >,
      required: true,
    },
    errors: {
      type: Array as PropType<
        Array<{ name?: string; version?: string; podCount?: string }>
      >,
      required: true,
    },
    enablePodCount: {
      type: Boolean,
      required: true,
    },
  },
  emits: ["add-service", "remove-service", "update-service"],
});
</script>
