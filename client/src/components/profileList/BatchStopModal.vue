<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('continue')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <div class="flex items-start gap-3">
        <div class="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-6 h-6 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-bold text-gray-800 mb-1">Health issues during batch sync</h2>
          <p class="text-gray-600 text-sm mb-4">
            {{ serviceName }} has health issues after sync. You can stop the entire batch now or let it continue and see a full report at the end.
          </p>
          <div class="flex gap-3 justify-end">
            <button
              @click="$emit('continue')"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Continue sync
            </button>
            <button
              @click="$emit('stop')"
              class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Stop sync
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "BatchStopModal",
  props: {
    show: { type: Boolean, default: false },
    serviceName: { type: String, default: "" },
  },
  emits: ["stop", "continue"],
});
</script>
