<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="handleDismiss"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <div
        class="px-6 py-4 border-b flex justify-between items-center"
        :class="headerClass"
      >
        <div class="flex items-center gap-3">
          <!-- Error icon -->
          <svg
            v-if="headerSeverity === 'error'"
            xmlns="http://www.w3.org/2000/svg"
            class="w-6 h-6 text-red-600 shrink-0"
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
          <!-- Warning icon -->
          <svg
            v-else-if="headerSeverity === 'warning'"
            xmlns="http://www.w3.org/2000/svg"
            class="w-6 h-6 text-yellow-600 shrink-0"
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
          <!-- OK icon -->
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="w-6 h-6 text-green-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 class="text-xl font-bold">{{ title }}</h2>
        </div>
        <button
          @click="handleDismiss"
          class="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <!-- Summary -->
        <div class="mb-6">
          <p class="text-gray-700 text-lg">{{ report.summary }}</p>
          <div class="mt-2 text-sm text-gray-500">
            <span>Service: <strong>{{ report.serviceName }}</strong></span>
            <span class="ml-4">Namespace: <strong>{{ report.namespace }}</strong></span>
          </div>
        </div>

        <!-- Issues -->
        <div v-if="report.issues && report.issues.length > 0" class="mb-6">
          <h3 class="text-lg font-semibold mb-3 text-gray-800">Detected Issues</h3>
          <div class="space-y-3">
            <div
              v-for="(issue, idx) in report.issues"
              :key="idx"
              class="bg-red-50 border-l-4 border-red-400 p-4 rounded"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-semibold text-red-800">{{ issue.type }}</span>
                    <span
                      v-if="issue.podName"
                      class="text-xs bg-red-200 text-red-700 px-2 py-1 rounded"
                    >
                      Pod: {{ issue.podName }}
                    </span>
                    <span
                      v-if="issue.containerName"
                      class="text-xs bg-red-200 text-red-700 px-2 py-1 rounded"
                    >
                      Container: {{ issue.containerName }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-700">{{ issue.message }}</p>
                  <div v-if="issue.reason" class="mt-1 text-xs text-gray-600">
                    Reason: {{ issue.reason }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            v-model="dontShowAgain"
            type="checkbox"
            class="rounded"
          />
          <span>Don't show again for this run</span>
        </label>
        <div class="flex gap-2">
          <button
            @click="handleDismiss"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from "vue";

export default defineComponent({
  name: "HealthAlertModal",
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    report: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ["close", "dont-show-again"],
  setup(props, { emit }) {
    const dontShowAgain = ref(false);

    const title = computed(() => {
      if (!props.report || !props.report.serviceName) return "Deployment Health Alert";
      return `We detected a deployment issue after sync: ${props.report.serviceName}`;
    });

    const headerClass = computed(() => {
      const severity = props.report?.severity || "error";
      if (severity === "error") return "bg-red-50 border-red-200";
      if (severity === "warning") return "bg-yellow-50 border-yellow-200";
      return "bg-green-50 border-green-200";
    });

    const headerSeverity = computed(() => {
      return props.report?.severity || "error";
    });

    const handleDismiss = () => {
      if (dontShowAgain.value) {
        emit("dont-show-again", props.report?.serviceName);
      }
      emit("close");
    };

    return {
      title,
      headerClass,
      headerSeverity,
      dontShowAgain,
      handleDismiss,
    };
  },
});
</script>

<style scoped>
code {
  word-break: break-all;
}
</style>
