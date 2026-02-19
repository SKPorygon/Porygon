<template>
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col transform transition-all"
        >
          <!-- Modal Header -->
          <div
            class="p-6 pb-0 flex justify-between items-center border-b dark:border-gray-700"
          >
            <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Permissions for {{ profileName }}
            </h2>
            <button
              @click="$emit('close')"
              class="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
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

          <!-- Permissions Content -->
          <div class="p-6 overflow-y-auto flex-grow">
            <!-- Current Permissions Section -->
            <section v-if="permissions.length" class="space-y-4">
              <h3
                class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3"
              >
                Current Permissions
              </h3>
              <div class="grid gap-3">
                <div
                  v-for="permission in permissions"
                  :key="permission.user._id"
                  class="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm"
                >
                  <div class="flex items-center space-x-4">
                    <div
                      class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center"
                    >
                      <span class="text-blue-600 dark:text-blue-300 font-bold">
                        {{
                          (permission.user.name ||
                            permission.user.email)[0].toUpperCase()
                        }}
                      </span>
                    </div>
                    <div>
                      <p class="font-medium text-gray-800 dark:text-gray-200">
                        {{ permission.user.name || permission.user.email }}
                      </p>
                      <span
                        class="text-sm capitalize px-2 py-1 rounded-full"
                        :class="{
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300':
                            permission.role === 'admin',
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300':
                            permission.role === 'editor',
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300':
                            permission.role === 'viewer',
                        }"
                      >
                        {{ permission.role }}
                      </span>
                    </div>
                  </div>
                  <button
                    v-if="canUserEditProfile()"
                    @click="removePermission(permission.user._id)"
                    class="text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/20 p-2 rounded-full hover:bg-red-100 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </section>
            <p v-else class="text-gray-500 dark:text-gray-400 text-center py-6">
              No permissions set for this profile
            </p>

            <!-- Pending Requests Section -->
            <section v-if="canUserEditProfile()" class="space-y-4 mt-6">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  Pending Join Requests
                  <span v-if="pendingRequests.length" class="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    {{ pendingRequests.length }}
                  </span>
                </h3>
                <div v-if="selectedRequests.length > 0" class="flex items-center space-x-2">
                  <span class="text-sm text-gray-600">{{ selectedRequests.length }} selected</span>
                  <button
                    @click="bulkApprove"
                    class="text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/20 p-2 rounded-full hover:bg-green-100 transition-colors"
                    :title="`Approve ${selectedRequests.length} request(s)`"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    @click="bulkReject"
                    class="text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/20 p-2 rounded-full hover:bg-red-100 transition-colors"
                    :title="`Reject ${selectedRequests.length} request(s)`"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div v-if="pendingRequests.length" class="grid gap-3">
                <div
                  v-for="request in pendingRequests"
                  :key="request._id"
                  class="flex items-center space-x-3 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg shadow-sm border border-amber-200 dark:border-amber-800"
                  :class="{ 'ring-2 ring-blue-500': selectedRequests.includes(request._id) }"
                >
                  <input
                    type="checkbox"
                    :value="request._id"
                    v-model="selectedRequests"
                    class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div class="flex items-center space-x-4 flex-1">
                    <div
                      class="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center flex-shrink-0"
                    >
                      <span class="text-amber-600 dark:text-amber-300 font-bold">
                        {{
                          (request.user.name ||
                            request.user.email)[0].toUpperCase()
                        }}
                      </span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {{ request.user.name || request.user.email }}
                      </p>
                      <div class="flex items-center space-x-2 mt-1 flex-wrap">
                        <span
                          class="text-sm capitalize px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                        >
                          {{ request.requestedRole }}
                        </span>
                        <span class="text-xs text-gray-500">
                          {{ formatDate(request.requestedAt) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="flex space-x-2 flex-shrink-0">
                    <button
                      @click="approveRequest(request._id)"
                      class="text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/20 p-2 rounded-full hover:bg-green-100 transition-colors"
                      title="Approve"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      @click="rejectRequest(request._id)"
                      class="text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/20 p-2 rounded-full hover:bg-red-100 transition-colors"
                      title="Reject"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <p v-else class="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                No pending requests
              </p>
            </section>
          </div>

          <!-- Add User / Invite Section -->
          <div
            v-if="canUserEditProfile()"
            class="p-6 pt-0 border-t dark:border-gray-700 space-y-4"
          >
            <!-- Tabs -->
            <div class="flex border-b dark:border-gray-600">
              <button
                @click="addUserMode = 'add'"
                class="px-4 py-2 font-medium text-sm transition"
                :class="addUserMode === 'add' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
              >
                Add Existing User
              </button>
              <button
                @click="addUserMode = 'invite'"
                class="px-4 py-2 font-medium text-sm transition"
                :class="addUserMode === 'invite' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
              >
                Invite by Email
              </button>
            </div>

            <!-- Add Existing User -->
            <div v-if="addUserMode === 'add'" class="flex space-x-3">
              <input
                v-model="newUserName"
                type="text"
                placeholder="Enter user email or name"
                class="flex-grow border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition-all"
                :class="{ 'border-red-500': validationError }"
              />
              <select
                v-model="newUserRole"
                class="border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option v-if="isUserAdmin()" value="admin">Admin</option>
              </select>
              <button
                @click="addPermission"
                class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!newUserName.trim()"
              >
                Add User
              </button>
            </div>

            <!-- Invite by Email -->
            <div v-else class="flex space-x-3">
              <input
                v-model="inviteEmail"
                type="email"
                placeholder="Enter user email"
                class="flex-grow border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 transition-all"
                :class="{ 'border-red-500': validationError }"
              />
              <select
                v-model="inviteRole"
                class="border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option v-if="isUserAdmin()" value="admin">Admin</option>
              </select>
              <button
                @click="inviteUser"
                class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                :disabled="!inviteEmail.trim()"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Invite
              </button>
            </div>
            <p v-if="validationError" class="text-red-500 text-sm mt-2 ml-1">
              {{ validationError }}
            </p>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useUserStore } from "../../store/userStore";
import { getConfig } from "../../config";

export default {
  props: {
    profileId: {
      type: String,
      required: true,
    },
    profileName: {
      type: String,
      required: true,
    },
    show: {
      type: Boolean,
      required: true,
    },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const permissions = ref([]);
    const pendingRequests = ref([]);
    const selectedRequests = ref([]);
    const newUserName = ref("");
    const newUserRole = ref("viewer");
    const inviteEmail = ref("");
    const inviteRole = ref("viewer");
    const addUserMode = ref("add");
    const validationError = ref("");
    const userStore = useUserStore();
    const toast = useToast();

    const fetchPermissions = async () => {
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/${props.profileId}/permissions`,
          {
            headers: { Authorization: `Bearer ${userStore.token}` },
          }
        );
        if (response.ok) {
          permissions.value = await response.json();
        }
      } catch (error) {
        console.error("Failed to fetch permissions:", error);
      }
    };

    const fetchPendingRequests = async () => {
      // Wait for permissions to load first
      if (permissions.value.length === 0) {
        await fetchPermissions();
      }
      
      if (!canUserEditProfile()) return;
      
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/${props.profileId}/requests`,
          {
            headers: { Authorization: `Bearer ${userStore.token}` },
          }
        );
        if (response.ok) {
          pendingRequests.value = await response.json();
        }
      } catch (error) {
        console.error("Failed to fetch pending requests:", error);
      }
    };

    const approveRequest = async (requestId) => {
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/${props.profileId}/requests/${requestId}/approve`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userStore.token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          toast.success("Join request approved!");
          // Remove from pending requests
          pendingRequests.value = pendingRequests.value.filter(
            (r) => r._id !== requestId
          );
          // Refresh permissions to show the new user
          await fetchPermissions();
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.error || "Failed to approve request");
        }
      } catch (error) {
        console.error("Error approving request:", error);
        toast.error("Network error. Please try again.");
      }
    };

    const rejectRequest = async (requestId) => {
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/${props.profileId}/requests/${requestId}/reject`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userStore.token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          toast.success("Join request rejected");
          // Remove from pending requests
          pendingRequests.value = pendingRequests.value.filter(
            (r) => r._id !== requestId
          );
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.error || "Failed to reject request");
        }
      } catch (error) {
        console.error("Error rejecting request:", error);
        toast.error("Network error. Please try again.");
      }
    };

    const bulkApprove = async () => {
      if (selectedRequests.value.length === 0) return;
      
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/${props.profileId}/requests/bulk-approve`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userStore.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requestIds: selectedRequests.value,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          toast.success(`Approved ${data.results.approved.length} request(s)`);
          selectedRequests.value = [];
          await fetchPendingRequests();
          await fetchPermissions();
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.error || "Failed to approve requests");
        }
      } catch (error) {
        console.error("Error bulk approving:", error);
        toast.error("Network error. Please try again.");
      }
    };

    const bulkReject = async () => {
      if (selectedRequests.value.length === 0) return;
      
      if (!confirm(`Are you sure you want to reject ${selectedRequests.value.length} request(s)?`)) {
        return;
      }
      
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/${props.profileId}/requests/bulk-reject`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userStore.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requestIds: selectedRequests.value,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          toast.success(`Rejected ${data.results.rejected.length} request(s)`);
          selectedRequests.value = [];
          await fetchPendingRequests();
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.error || "Failed to reject requests");
        }
      } catch (error) {
        console.error("Error bulk rejecting:", error);
        toast.error("Network error. Please try again.");
      }
    };

    const inviteUser = async () => {
      validationError.value = "";

      if (!inviteEmail.value.trim()) {
        validationError.value = "Please enter an email address";
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteEmail.value)) {
        validationError.value = "Please enter a valid email address";
        return;
      }

      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/${props.profileId}/invite`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userStore.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: inviteEmail.value,
              role: inviteRole.value,
            }),
          }
        );

        if (response.ok) {
          toast.success(`User invited successfully!`);
          inviteEmail.value = "";
          inviteRole.value = "viewer";
          await fetchPermissions();
        } else {
          const errorData = await response.json().catch(() => ({}));
          validationError.value = errorData.error || "Failed to invite user";
        }
      } catch (error) {
        console.error("Error inviting user:", error);
        validationError.value = "Network error. Please try again.";
      }
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const addPermission = async () => {
      validationError.value = "";

      if (!newUserName.value.trim()) {
        validationError.value = "Please enter a user email or name";
        return;
      }

      if (newUserName.value.length < 2) {
        validationError.value = "Please enter a valid name";
        return;
      }

      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/${props.profileId}/permissions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userStore.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: newUserName.value,
              role: newUserRole.value,
            }),
          }
        );

        if (response.ok) {
          const newPermission = await response.json();
          permissions.value.push(newPermission);
          newUserName.value = "";
          toast.success("added user successfully!");
        } else {
          const errorData = await response.json();
          validationError.value = errorData.message || "Failed to add user";
        }
      } catch (error) {
        console.error("Error adding permission:", error);
        validationError.value = "Network error. Please try again.";
      }
    };

    const removePermission = async (userId) => {
      try {
        await fetch(
          `http://${getConfig().urlHost}/api/profiles/${props.profileId}/permissions/${userId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${userStore.token}` },
          }
        );
        permissions.value = permissions.value.filter(
          (p) => p.user._id !== userId
        );
      } catch (error) {
        console.error("Failed to remove permission:", error);
      }
    };

    const canUserEditProfile = () => {
      return getUserPermissions().role !== "viewer";
    };

    const isUserAdmin = () => {
      return getUserPermissions().role === "admin";
    };

    const getUserPermissions = () => {
      return permissions.value.find(
        (permission) => permission.user._id === userStore.user.id
      );
    };

    const close = () => emit("close");

    onMounted(async () => {
      await fetchPermissions();
      await fetchPendingRequests();
    });

    return {
      permissions,
      pendingRequests,
      selectedRequests,
      newUserName,
      newUserRole,
      inviteEmail,
      inviteRole,
      addUserMode,
      addPermission,
      removePermission,
      approveRequest,
      rejectRequest,
      bulkApprove,
      bulkReject,
      inviteUser,
      formatDate,
      close,
      validationError,
      canUserEditProfile,
      isUserAdmin,
    };
  },
};
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
