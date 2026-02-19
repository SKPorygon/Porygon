<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
    >
      <div class="px-6 py-4 border-b bg-amber-50 border-amber-200 flex justify-between items-center">
        <h2 class="text-xl font-bold text-gray-800">Batch sync report</h2>
        <button
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <p class="text-gray-600 mb-4">
          {{ summaryText }}
        </p>

        <div class="space-y-6">
          <div
            v-for="item in failingServices"
            :key="item.serviceName"
            class="border border-red-200 rounded-lg overflow-hidden"
          >
            <div
              class="px-4 py-3 flex items-center justify-between"
              :class="item.severity === 'error' ? 'bg-red-50' : 'bg-yellow-50'"
            >
              <span class="font-semibold text-gray-800">{{ item.serviceName }}</span>
              <span
                class="text-xs px-2 py-1 rounded"
                :class="item.severity === 'error' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'"
              >
                {{ item.severity }}
              </span>
            </div>
            <div class="px-4 py-3 bg-white border-t border-gray-100">
              <p class="text-sm text-gray-700 mb-3">{{ item.summary }}</p>
              <div v-if="item.report?.issues?.length" class="space-y-2">
                <div
                  v-for="(issue, idx) in item.report.issues"
                  :key="idx"
                  class="text-sm bg-gray-50 rounded p-2 border-l-2 border-red-300"
                >
                  <span class="font-medium text-red-800">{{ issue.type }}</span>
                  <span v-if="issue.podName" class="text-gray-500 ml-2">({{ issue.podName }})</span>
                  <p class="text-gray-600 mt-0.5">{{ issue.message }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 border-t bg-gray-50">
        <button
          @click="$emit('close')"
          class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "BatchSummaryReportModal",
  props: {
    show: { type: Boolean, default: false },
    namespace: { type: String, default: "" },
    total: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    failingServices: {
      type: Array,
      default: () => [],
    },
  },
  emits: ["close"],
  setup(props) {
    const summaryText = computed(() => {
      const n = props.failingServices?.length ?? 0;
      if (n === 0) return "No health issues reported.";
      return `Batch sync finished. ${props.successCount ?? 0} succeeded, ${props.errorCount ?? 0} failed. ${n} service(s) have health issues:`;
    });
    return { summaryText };
  },
});
</script>
