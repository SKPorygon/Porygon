<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center py-10"
  >
    <div class="w-full max-w-7xl px-4">
      <div class="bg-white shadow-2xl rounded-2xl overflow-hidden">
        <!-- Header with Stats and Actions -->
        <div
          class="bg-blue-600 text-white p-6 flex justify-between items-center"
        >
          <div>
            <h1 class="text-4xl font-extrabold mb-2">Cluster Profiles</h1>
            <div class="flex space-x-4">
              <div class="bg-blue-500 rounded-lg p-3 text-center">
                <p class="text-sm font-medium">Total Profiles</p>
                <p class="text-2xl font-bold">{{ profiles.length }}</p>
              </div>
            </div>
          </div>
          <div class="flex space-x-4">
            <router-link to="/upload">
              <button
                class="bg-green-600 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                Create Profile
              </button>
            </router-link>
          </div>
        </div>

        <!-- Filters and Search -->
        <div class="p-6 bg-gray-50 border-b">
          <div class="flex justify-between items-center space-x-4">
            <div class="flex-grow relative">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search profiles by name or namespace..."
                class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div class="flex space-x-4">
              <button
                @click="toggleOutOfSyncFilter"
                class="px-4 py-3 rounded-lg transition flex items-center"
                :class="
                  showOutOfSyncOnly
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                {{ showOutOfSyncOnly ? "Show All" : "Out of Sync" }}
              </button>
              <button
                @click="toggleTestingView"
                class="px-4 py-3 rounded-lg transition flex items-center"
                :class="
                  showTestingOnly
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fill-rule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z"
                    clip-rule="evenodd"
                  />
                </svg>
                {{ showTestingOnly ? "Show All" : "Under Test" }}
              </button>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-4">
            <label class="text-sm font-medium text-gray-600">Service name:</label>
            <input
              v-model="serviceNameFilter"
              type="text"
              placeholder="Filter by service name..."
              class="flex-1 min-w-[200px] pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-sm"
            />
          </div>
        </div>

        <!-- Profiles Grid -->
        <div class="p-6">
          <div v-if="loading" class="text-center py-10">
            <div
              class="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto"
            ></div>
            <p class="mt-4 text-gray-600">Loading profiles...</p>
          </div>
          <div
            v-else
            class="grid gap-6"
            :class="
              filteredProfiles.length === 1
                ? 'grid-cols-1'
                : 'lg:grid-cols-2 xl:grid-cols-3'
            "
          >
            <!-- Testing View -->
            <template v-if="showTestingOnly">
              <div
                v-for="profile in filteredProfiles"
                :key="profile.id"
                class="bg-white shadow-lg rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition"
              >
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                  {{ profile.name }}
                  <span class="text-sm text-gray-500 ml-2"
                    >({{ profile.namespace }})</span
                  >
                </h2>
                <div
                  v-for="testingProfile in profile.testingProfiles"
                  :key="testingProfile.id"
                  class="mb-6 bg-gray-50 p-4 rounded-lg"
                >
                  <h3 class="text-lg font-semibold text-gray-700 mb-2">
                    {{ testingProfile.name }}
                  </h3>
                  <div
                    v-for="service in testingProfile.services"
                    :key="service.name"
                    class="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-sm shadow-sm"
                    :class="{
                      'border border-blue-100': testingProfile.isActive,
                    }"
                  >
                    <span class="font-medium text-gray-700">{{
                      service.name
                    }}</span>
                    <span class="text-gray-500"
                      >v{{ service.desiredVersion }}</span
                    >
                  </div>
                </div>
              </div>
            </template>

            <!-- Regular Profiles View -->
            <template v-else>
              <ProfileCard
                v-for="(profile, index) in filteredProfiles"
                :key="index"
                :profile="profile"
                :show-out-of-sync="showOutOfSyncOnly"
                :service-name-filter="serviceNameFilter"
                @sync-all="syncAllServices"
                @sync-service="syncService"
              />
            </template>
          </div>
        </div>
        <SyncAllConfirmModal
          :show="showSyncAllModal"
          :profile-name="selectedProfile?.name || ''"
          :namespace="selectedProfile?.namespace || ''"
          :services-to-sync="servicesToSync"
          @confirm="confirmSyncAll"
          @cancel="cancelSyncAll"
        />
      </div>
    </div>
  </div>
</template>

<script>
import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { websocketClient } from "../websockets/websocketClient";
import { useToast } from "vue-toastification";
import ProfileCard from "../components/profileList/ProfileCard.vue";
import { useUserStore } from "../store/userStore";
import { getConfig } from "../config";
import SyncAllConfirmModal from "../components/profileList/SyncAllConfirmModal.vue";

export default defineComponent({
  components: { ProfileCard, SyncAllConfirmModal },

  setup() {
    const toast = useToast();
    const profiles = ref([]);
    const loading = ref(true);
    const searchQuery = ref("");
    const serviceNameFilter = ref("");
    const showOutOfSyncOnly = ref(false);
    const showTestingOnly = ref(false);
    const userStore = useUserStore();
    const showSyncAllModal = ref(false);
    const selectedProfile = ref(null);

    // ✅ keep unsubscribers so we can cleanup
    let unsubs = [];

    const servicesToSync = computed(() => {
      if (!selectedProfile.value) return [];
      return (selectedProfile.value.services || []).filter(
        (s) => s.status !== "In Sync",
      );
    });

    const fetchProfiles = async () => {
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/get/enriched`,
          {
            headers: {
              Authorization: `Bearer ${userStore.token}`,
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Expires: "0",
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          profiles.value = data.map((profile) => ({
            ...profile,
            lastSynced: new Date().toLocaleString(),
          }));
        } else {
          toast.error("Failed to fetch profiles. Please check your connection.");
        }
      } catch (error) {
        console.error("Error fetching profiles:", error);
        toast.error("Network error. Unable to fetch profiles.");
      } finally {
        loading.value = false;
      }
    };

    const toggleOutOfSyncFilter = () => {
      showOutOfSyncOnly.value = !showOutOfSyncOnly.value;
      showTestingOnly.value = false;
    };

    const toggleTestingView = () => {
      showTestingOnly.value = !showTestingOnly.value;
      showOutOfSyncOnly.value = false;
    };

    const filteredProfiles = computed(() => {
      let result = profiles.value;

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
          (profile) =>
            profile.name.toLowerCase().includes(query) ||
            profile.namespace.toLowerCase().includes(query),
        );
      }

      if (showOutOfSyncOnly.value) {
        result = result
          .map((profile) => ({
            ...profile,
            services: profile.services.filter(
              (service) => service.status === "Out of Sync",
            ),
          }))
          .filter((profile) => profile.services.length > 0);
      }

      if (serviceNameFilter.value.trim()) {
        const q = serviceNameFilter.value.trim().toLowerCase();
        result = result.filter((profile) =>
          (profile.services || []).some((s) =>
            (s.name || "").toLowerCase().includes(q)
          )
        );
      }

      return result;
    });

    const syncService = async (profile, service) => {
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/services/sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              namespace: profile.namespace,
              serviceName: service.name,
              desiredVersion: service.desiredVersion,
              desiredPodCount: service.desiredPodCount,
              saToken: profile.saToken,
              clusterUrl: profile.clusterUrl,
            }),
          },
        );

        if (response.ok) {
          toast.info(`Started sync for ${service.name}. Watch live updates…`);
          // ❗ לא עושים fetchProfiles כאן — ה-WS יעדכן
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(
            `Failed to sync service: ${errorData.error || "Unknown error"}`,
          );
        }
      } catch (error) {
        toast.error("Network error. Unable to sync service.");
      }
    };

    const syncAllServices = (profileName) => {
      const profile = profiles.value.find((p) => p.name === profileName);
      if (!profile) return;

      selectedProfile.value = profile;
      showSyncAllModal.value = true;
    };

    const confirmSyncAll = async (selectedNames) => {
      if (!selectedProfile.value) return;

      showSyncAllModal.value = false;

      const profile = selectedProfile.value;

      const targets = (profile.services || [])
        .filter((s) => (s.status ?? "Out of Sync") !== "In Sync")
        .filter((s) => selectedNames.includes(s.name));

      if (targets.length === 0) {
        toast.info("No services selected.");
        selectedProfile.value = null;
        return;
      }

      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/services/multiple-sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              namespace: profile.namespace,
              servicesData: targets.map((t) => ({
                name: t.name,
                desiredVersion: t.desiredVersion,
                desiredPodCount: t.desiredPodCount,
              })),
              saToken: profile.saToken,
              clusterUrl: profile.clusterUrl,
            }),
          },
        );

        if (response.ok) {
          toast.info(
            `Batch started: syncing ${targets.length} service(s) in ${profile.name}. Watch live updates…`,
          );
          // ❗ לא עושים fetchProfiles כאן — ה-WS יעדכן בסוף באץ'
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(
            `Failed to start sync: ${errorData.error || "Unknown error"}`,
          );
        }
      } catch (error) {
        toast.error("Network error. Unable to start sync.");
      } finally {
        selectedProfile.value = null;
      }
    };

    const cancelSyncAll = () => {
      showSyncAllModal.value = false;
      selectedProfile.value = null;
    };

    onMounted(async () => {
      await fetchProfiles();

      // ✅ subscribe to WS events (connection already created in main.ts)
      unsubs = [
        websocketClient.on("BATCH_SYNC_STARTED", (p) => {
          toast.info(
            `Batch sync started (${p?.total ?? "?"}) in ${p?.namespace ?? ""}`,
          );
        }),

        websocketClient.on("SYNC_STARTED", (p) => {
          // אם זה מציף, תחליף ל-console.log
          toast.info(`Sync started: ${p?.serviceName ?? ""}`);
        }),

        websocketClient.on("SYNC_STEP", (p) => {
          // עדיף לא טוסטים לכל step
          console.log("SYNC_STEP:", p);
        }),

        websocketClient.on("SYNC_COMPLETE", (p) => {
          const name = p?.serviceName ?? "";
          if (p?.status === "success") {
            toast.success(`✅ ${name} synced`);
          } else {
            toast.error(`❌ ${name} failed: ${p?.error ?? "Unknown error"}`);
          }
          // ⚠️ לא מרעננים פה אוטומטית אם זה באץ' — זה כבד.
          // אם זה sync יחיד, SERVICE_SYNCED / BATCH_SYNC_COMPLETE יטפלו ברענון.
        }),

        websocketClient.on("SERVICE_SYNCED", async () => {
          // ✅ מצוין ל-sync יחיד (או אם אתה רוצה רענון מיידי)
          // אם זה כבד, אפשר להסיר ולהסתמך רק על BATCH_SYNC_COMPLETE
          await fetchProfiles();
        }),

        websocketClient.on("BATCH_SYNC_COMPLETE", async (p) => {
          toast.success(
            `Batch complete: ${p?.successCount ?? 0} ok, ${p?.errorCount ?? 0} failed`,
          );
          await fetchProfiles(); // ✅ רענון אחד בסוף הבאץ'
        }),
      ];
    });

    onBeforeUnmount(() => {
      // ✅ cleanup listeners only (DO NOT disconnect global websocket)
      unsubs.forEach((u) => u && u());
      unsubs = [];
    });

    return {
      profiles,
      loading,
      searchQuery,
      serviceNameFilter,
      showOutOfSyncOnly,
      showTestingOnly,
      toggleOutOfSyncFilter,
      toggleTestingView,
      filteredProfiles,
      syncService,
      syncAllServices,
      showSyncAllModal,
      selectedProfile,
      servicesToSync,
      confirmSyncAll,
      cancelSyncAll,
    };
  },
});
</script>


<style scoped>
/* Additional custom styles can be added here */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
