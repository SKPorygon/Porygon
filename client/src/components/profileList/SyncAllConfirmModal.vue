<template>
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        @click.self="$emit('cancel')"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
          <!-- Header -->
          <div class="p-6 flex justify-between items-start border-b">
            <div>
              <h2 class="text-2xl font-bold text-gray-800">
                Confirm Sync All
              </h2>
              <p class="text-sm text-gray-500 mt-1">
                Choose which services to sync in
                <span class="font-semibold text-gray-700">{{ profileName }}</span>
                (namespace: <span class="font-semibold">{{ namespace }}</span>).
              </p>
            </div>

            <button
              @click="$emit('cancel')"
              class="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-gray-100"
              aria-label="Close"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6 space-y-4">
            <div
              v-if="servicesToSync.length === 0"
              class="bg-green-50 text-green-700 border border-green-200 rounded-xl p-4"
            >
              Everything is already in sync. No actions needed.
            </div>

            <div v-else>
              <!-- Top controls -->
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 class="text-lg font-semibold text-gray-800">
                    Services to sync ({{ servicesToSync.length }})
                  </h3>
                  <p class="text-xs text-gray-500 mt-1">
                    Selected: <span class="font-semibold text-gray-700">{{ selectedCount }}</span>
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    @click="selectAll"
                    class="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm"
                    type="button"
                  >
                    Select all
                  </button>
                  <button
                    @click="clearAll"
                    class="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm"
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <!-- List -->
              <div class="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
                <label
                  v-for="svc in servicesToSync"
                  :key="svc.name"
                  class="flex items-start justify-between bg-gray-50 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition"
                >
                  <div class="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      class="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300"
                      :value="svc.name"
                      v-model="localSelected"
                    />

                    <div class="min-w-0">
                      <p class="font-medium text-gray-800 truncate">
                        {{ svc.name }}
                      </p>
                      <p class="text-xs text-gray-500 mt-0.5 truncate">
                        Actual: <span class="font-mono">{{ svc.actualVersion }}</span>
                        • Desired: <span class="font-mono">{{ svc.desiredVersion }}</span>
                        <span v-if="svc.actualPodCount != null && svc.desiredPodCount != null">
                          • Pods: <span class="font-mono">{{ svc.actualPodCount }}</span> → <span class="font-mono">{{ svc.desiredPodCount }}</span>
                        </span>
                      </p>
                    </div>
                  </div>

                  <div class="ml-4 shrink-0">
                    <span class="text-xs px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                      sync
                    </span>
                  </div>
                </label>
              </div>

              <div class="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm">
                Heads up: syncing many services can trigger multiple rollouts and consume resources.
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-6 pt-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              @click="$emit('cancel')"
              class="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              type="button"
            >
              Cancel
            </button>

            <button
              @click="onConfirm"
              class="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="servicesToSync.length === 0 || selectedCount === 0"
              type="button"
            >
              Yes, Sync Selected
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
export default {
  name: "SyncAllConfirmModal",
  props: {
    show: { type: Boolean, required: true },
    profileName: { type: String, required: true },
    namespace: { type: String, required: true },
    servicesToSync: { type: Array, required: true },
    /** optional: allow parent to pre-select */
    initialSelected: { type: Array, default: () => [] },
  },
  emits: ["confirm", "cancel"],
  data() {
    return {
      localSelected: [],
    };
  },
  computed: {
    selectedCount() {
      return this.localSelected.length;
    },
    allNames() {
      return (this.servicesToSync || []).map((s) => s.name);
    },
  },
  watch: {
    // When modal opens or services change — default select all (or use initialSelected if provided)
    show(newVal) {
      if (newVal) this.resetSelection();
    },
    servicesToSync: {
      handler() {
        if (this.show) this.resetSelection();
      },
      deep: true,
    },
  },
  methods: {
    resetSelection() {
      const initial = (this.initialSelected && this.initialSelected.length > 0)
        ? this.initialSelected
        : this.allNames;
      // keep only names that still exist
      this.localSelected = initial.filter((n) => this.allNames.includes(n));
    },
    selectAll() {
      this.localSelected = [...this.allNames];
    },
    clearAll() {
      this.localSelected = [];
    },
    onConfirm() {
      this.$emit("confirm", [...this.localSelected]);
    },
  },
};
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.99);
}
</style>
