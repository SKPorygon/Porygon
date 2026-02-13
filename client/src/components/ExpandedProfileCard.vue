<template>
  <div 
    v-if="show" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
    @click.self="closeModal"
  >
    <div 
      class="relative w-full max-w-5xl rounded-lg bg-white shadow-lg overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b p-6">
        <div>
          <h2 class="text-xl font-semibold text-gray-900 truncate">{{ profile.name }}</h2>
          <p class="mt-1 text-sm text-gray-600">Namespace: {{ profile.namespace }}</p>
        </div>
        <button
          @click="closeModal"
          class="rounded-lg bg-gray-100 p-2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-8">
        <!-- Section 1: Testing Profiles -->
        <div>
          <h3 class="text-lg font-medium text-gray-900">Testing Profiles</h3>
          <div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div 
              v-for="testProfile in profile.testingProfiles" 
              :key="testProfile.id"
              class="relative rounded-lg border border-gray-200 p-4 shadow-sm transition-all"
              :class="{
                'bg-blue-50/40 border-blue-300': testProfile.isActive,
                'hover:shadow-md': !testProfile.isActive
              }"
            >
              <h4 
                class="font-medium text-gray-900 truncate"
                :title="testProfile.name"
              >
                {{ testProfile.name }}
              </h4>
              <p class="mt-1 text-sm text-gray-600">
                {{ testProfile.services.length }} service<span v-if="testProfile.services.length > 1">s</span> under test
              </p>

              <div class="mt-3 space-y-2">
                <div 
                  v-for="service in testProfile.services" 
                  :key="service.name"
                  class="flex justify-between text-sm"
                >
                  <span class="font-medium text-gray-700 truncate" :title="service.name">{{ service.name }}</span>
                  <span class="text-gray-500">v{{ service.desiredVersion }}</span>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between">
                <button
                  @click="$emit('activate', testProfile)"
                  class="rounded-lg px-3 py-1.5 text-sm font-medium"
                  :class="testProfile.isActive ? 
                    'bg-gray-100 text-gray-600 hover:bg-gray-200' : 
                    'bg-blue-50 text-blue-600 hover:bg-blue-100'"
                >
                  {{ testProfile.isActive ? 'Deactivate' : 'Activate' }}
                </button>
                <button
                  @click="$emit('delete', testProfile)"
                  class="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <hr class="border-gray-200" />

        <!-- Section 2: Metrics -->
        <div>
          <h3 class="text-lg font-medium text-gray-900">Metrics</h3>
          <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div class="rounded-lg border border-gray-200 p-4 text-center">
              <p class="text-sm text-gray-600">Total Services</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900">
                {{ profile.services.length }}
              </p>
            </div>
            <div class="rounded-lg border border-gray-200 p-4 text-center">
              <p class="text-sm text-gray-600">Active Profiles</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900">
                {{ profile.testingProfiles.filter(tp => tp.isActive).length }}
              </p>
            </div>
            <div class="rounded-lg border border-gray-200 p-4 text-center">
              <p class="text-sm text-gray-600">Last Updated</p>
              <p class="mt-2 text-lg text-gray-900">
                {{ profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'N/A' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t p-4 flex justify-end">
        <button
          @click="closeModal"
          class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExpandedProfileModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    profile: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'activate', 'delete'],
  methods: {
    closeModal() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
/* Smooth fade-in animation */
.modal {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Ensure truncate for long text */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
