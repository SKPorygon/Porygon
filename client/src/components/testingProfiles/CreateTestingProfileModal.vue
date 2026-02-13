<template>
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      @click.self="closeModal"
    >
      <div class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900">Create Testing Profile</h2>
          <button
            @click="closeModal"
            class="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
  
        <form @submit.prevent="submitForm" class="space-y-6">
          <!-- Profile Name -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">
              Profile Name
            </label>
            <input
              v-model="profileData.name"
              type="text"
              required
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter a descriptive name for this testing profile"
            />
          </div>
  
          <!-- Services Selection -->
          <div>
            <div class="mb-2 flex items-center justify-between">
              <label class="text-sm font-medium text-gray-700">Services</label>
              <button
                type="button"
                @click="addService"
                class="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                + Add Service
              </button>
            </div>
  
            <div class="space-y-3">
              <div
                v-for="(service, index) in profileData.services"
                :key="index"
                class="flex items-center gap-3"
              >
                <select
                  v-model="service.name"
                  required
                  class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option disabled value="">Select a service</option>
                  <option
                    v-for="availableService in profile.services"
                    :key="availableService.name"
                    :value="availableService.name"
                  >
                    {{ availableService.name }}
                  </option>
                </select>
  
                <input
                  v-model="service.desiredVersion"
                  type="text"
                  required
                  placeholder="Version"
                  class="w-32 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
  
                <button
                  type="button"
                  @click="removeService(index)"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
  
          <!-- Form Actions -->
          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="closeModal"
              class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  </template>
  
  <script>
  import { ref } from "vue";
  import { getConfig } from "../../config";
  
  export default {
    props: {
      show: {
        type: Boolean,
        required: true,
      },
      profile: {
        type: Object,
        required: true,
      },
    },
    emits: ["close", "created"],
    setup(props, { emit }) {
      const profileData = ref({
        name: "",
        services: [],
      });
  
      const addService = () => {
        profileData.value.services.push({ name: "", desiredVersion: "" });
      };
  
      const removeService = (index) => {
        profileData.value.services.splice(index, 1);
      };
  
      const closeModal = () => {
        emit("close");
      };
  
      const submitForm = async () => {
        if (profileData.value.services.length === 0) {
          console.warn("Please add at least one service.");
          return;
        }
  
        try {
          const response = await fetch(`${getConfig().apiUrl}/testing-profiles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: profileData.value.name,
              profileId: props.profile._id,
              services: profileData.value.services,
            }),
          });
  
          if (!response.ok) {
            console.error("Failed to create testing profile.");
            return;
          }
  
          const createdProfile = await response.json();
          emit("created", createdProfile);
          closeModal();
        } catch (error) {
          console.error("Error creating testing profile:", error);
        }
      };
  
      return {
        profileData,
        addService,
        removeService,
        closeModal,
        submitForm,
      };
    },
  };
  </script>
  
<style scoped>
/* Smooth transitions for all state changes */
.test-profile-card {
  transition: all 0.3s ease;
}

/* Active profile styling */
.active-profile {
  position: relative;
  border-color: rgb(191, 219, 254);
  background-color: rgb(239, 246, 255);
}

/* Left border indicator animation */
.active-profile::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: rgb(59, 130, 246);
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  transform: scaleY(0);
  transform-origin: top;
  animation: slide-in 0.3s ease forwards;
}

@keyframes slide-in {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

/* Activation glow effect */
.activation-glow {
  animation: glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes glow-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
  }
}

/* Service item transitions */
.service-item {
  transition: all 0.2s ease;
}

.service-item:hover {
  transform: translateX(4px);
}

/* Active service badges */
.active-badge {
  position: relative;
  overflow: hidden;
}

.active-badge::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: rgb(59, 130, 246);
  animation: badge-slide 0.3s ease forwards;
}

@keyframes badge-slide {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Deactivation transition */
.deactivating {
  opacity: 0.7;
  transform: scale(0.99);
  transition: all 0.3s ease;
}

/* Focus states for interactive elements */
.interactive-element:focus {
  outline: 2px solid rgb(59, 130, 246);
  outline-offset: 2px;
}

/* Status indicator dot */
.status-indicator {
  position: relative;
  padding-left: 16px;
}

.status-indicator::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(59, 130, 246);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: translateY(-50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-50%) scale(1.5);
    opacity: 0.5;
  }
  100% {
    transform: translateY(-50%) scale(1);
    opacity: 1;
  }
}

/* Card Styling Tweaks */
.card {
  border-radius: 12px;
  padding: 16px;
}

/* Buttons are visually consistent */
button {
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

button:hover {
  transform: scale(1.02);
}

.service-item {
  border-radius: 6px;
  padding: 8px 12px;
}

/* Cleaner hover effects */
.hover\:shadow-md:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>