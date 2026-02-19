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
                :health-alerts="healthAlerts"
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
        <HealthAlertModal
          :show="showHealthAlertModal"
          :report="currentHealthAlert"
          @close="showHealthAlertModal = false"
          @dont-show-again="handleDontShowAgain"
        />
        <BatchStopModal
          :show="showBatchStopModal"
          :service-name="firstBatchAlertServiceName"
          @stop="handleBatchStop"
          @continue="handleBatchContinue"
        />
        <BatchSummaryReportModal
          :show="showBatchSummaryModal"
          :namespace="batchSummaryData?.namespace || ''"
          :total="batchSummaryData?.total || 0"
          :success-count="batchSummaryData?.successCount || 0"
          :error-count="batchSummaryData?.errorCount || 0"
          :failing-services="batchSummaryData?.failingServices || []"
          @close="showBatchSummaryModal = false"
        />
        <!-- Inactivity modal: after 5 min with no activity, offer to refresh -->
        <div
          v-if="showInactivityModal"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          @click.self="refreshPage"
        >
          <div class="bg-white rounded-xl shadow-2xl max-w-md mx-4 p-6 text-center">
            <div class="text-amber-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-800 mb-2">You've been inactive</h3>
            <p class="text-gray-600 mb-6">
              You haven't interacted with this page for a while. Refresh to get the latest profiles and sync status.
            </p>
            <button
              type="button"
              @click="refreshPage"
              class="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Refresh page
            </button>
          </div>
        </div>
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
import HealthAlertModal from "../components/profileList/HealthAlertModal.vue";
import BatchStopModal from "../components/profileList/BatchStopModal.vue";
import BatchSummaryReportModal from "../components/profileList/BatchSummaryReportModal.vue";

export default defineComponent({
  components: {
    ProfileCard,
    SyncAllConfirmModal,
    HealthAlertModal,
    BatchStopModal,
    BatchSummaryReportModal,
  },

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
    const healthAlerts = ref(new Map());
    const currentHealthAlert = ref(null);
    const showHealthAlertModal = ref(false);
    const dismissedAlerts = ref(new Set());

    const batchId = ref(null);
    const lastCompletedBatchId = ref(null); // do NOT clear on STARTED so late BATCH_HEALTH_SUMMARY still matches
    const lastShownSummaryBatchId = ref(null); // prevent showing same batch summary twice
    const batchInProgress = ref(false);
    const showBatchStopModal = ref(false);
    const firstBatchAlertServiceName = ref("");
    const batchStopModalAlreadyShownThisBatch = ref(false);
    const showBatchSummaryModal = ref(false);
    const batchSummaryData = ref({
      namespace: "",
      total: 0,
      successCount: 0,
      errorCount: 0,
      failingServices: [],
    });

    const showInactivityModal = ref(false);
    const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes
    let inactivityTimerId = null;

    const refreshPage = () => {
      window.location.reload();
    };

    const resetInactivityTimer = () => {
      if (showInactivityModal.value) return;
      if (inactivityTimerId) clearTimeout(inactivityTimerId);
      inactivityTimerId = setTimeout(() => {
        showInactivityModal.value = true;
        inactivityTimerId = null;
      }, INACTIVITY_MS);
    };

    const clearInactivityTimer = () => {
      if (inactivityTimerId) {
        clearTimeout(inactivityTimerId);
        inactivityTimerId = null;
      }
    };

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    const onActivity = () => resetInactivityTimer();

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

    const handleDontShowAgain = (serviceName) => {
      dismissedAlerts.value.add(serviceName);
    };

    const handleBatchStop = async () => {
      const id = batchId.value;
      showBatchStopModal.value = false;
      if (!id) return;
      try {
        await fetch(`http://${getConfig().urlHost}/api/services/sync/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId: id }),
        });
        toast.info("Batch sync cancel requested.");
      } catch (e) {
        toast.error("Failed to request cancel.");
      }
    };

    const handleBatchContinue = async () => {
      const id = batchId.value;
      showBatchStopModal.value = false;
      if (!id) return;
      try {
        await fetch(`http://${getConfig().urlHost}/api/services/sync/resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId: id }),
        });
        toast.info("Batch sync continuing...");
      } catch (e) {
        toast.error("Failed to request resume.");
      }
    };

    const syncService = async (profile, service) => {
      const payload = {
        namespace: profile.namespace,
        serviceName: service.name,
        desiredVersion: service.desiredVersion,
        desiredPodCount: service.desiredPodCount,
        saToken: profile.saToken,
        clusterUrl: profile.clusterUrl,
      };
      // [SYNC_DEBUG] temporary - remove after debugging
      console.log("[SYNC_DEBUG] client syncService sending:", {
        namespace: payload.namespace,
        serviceName: payload.serviceName,
        desiredVersion: payload.desiredVersion,
        desiredPodCount: payload.desiredPodCount,
        hasSaToken: !!payload.saToken,
        hasClusterUrl: !!payload.clusterUrl,
        clusterUrl: payload.clusterUrl ? String(payload.clusterUrl).slice(0, 50) + "..." : undefined,
      });
      try {
        const url = `http://${getConfig().urlHost}/api/services/sync`;
        console.log("[SYNC_DEBUG] client POST url:", url);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        console.log("[SYNC_DEBUG] client response:", {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        });

        if (response.ok) {
          toast.info(`Started sync for ${service.name}. Watch live updates…`);
          // ❗ לא עושים fetchProfiles כאן — ה-WS יעדכן
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log("[SYNC_DEBUG] client error body:", errorData);
          toast.error(
            `Failed to sync service: ${errorData.error || "Unknown error"}`,
          );
        }
      } catch (error) {
        console.error("[SYNC_DEBUG] client syncService error:", error);
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
      resetInactivityTimer();
      activityEvents.forEach((ev) => window.addEventListener(ev, onActivity));

      // ✅ subscribe to WS events (connection already created in main.ts)
      unsubs = [
        websocketClient.on("BATCH_SYNC_STARTED", (p) => {
          const newBatchId = p?.batchId ?? null;
          console.log("[BATCH_REPORT] BATCH_SYNC_STARTED", { newBatchId, hadSummaryModal: showBatchSummaryModal.value });
          // Do NOT clear lastCompletedBatchId - so a late BATCH_HEALTH_SUMMARY from the previous batch can still be shown
          batchId.value = newBatchId;
          batchInProgress.value = true;
          showBatchStopModal.value = false;
          batchStopModalAlreadyShownThisBatch.value = false;
          showBatchSummaryModal.value = false;
          batchSummaryData.value = {
            namespace: "",
            total: 0,
            successCount: 0,
            errorCount: 0,
            failingServices: [],
          };
          // Defer clearing healthAlerts so a late BATCH_HEALTH_SUMMARY from previous batch can still build the report
          setTimeout(() => { healthAlerts.value.clear(); }, 3000);
          firstBatchAlertServiceName.value = "";
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
          const payloadBatchId = p?.batchId ?? null;
          const currentBatchIdWhenReceived = batchId.value;
          // Always record which batch completed (so late BATCH_HEALTH_SUMMARY can still match)
          lastCompletedBatchId.value = payloadBatchId;
          // Only clear "in progress" state if this COMPLETE is for the batch we think is current
          if (payloadBatchId === currentBatchIdWhenReceived) {
            batchInProgress.value = false;
            batchId.value = null;
          }
          console.log("[BATCH_REPORT] BATCH_SYNC_COMPLETE", {
            payloadBatchId,
            currentBatchIdWhenReceived,
            hadStopModal: batchStopModalAlreadyShownThisBatch.value,
            alreadyShowingSummary: showBatchSummaryModal.value,
            healthAlertsSize: healthAlerts.value.size,
          });
          toast.success(
            `Batch complete: ${p?.successCount ?? 0} ok, ${p?.errorCount ?? 0} failed`,
          );
          // Fallback: show summary only for the batch that just completed (current) and we didn't already show from BATCH_HEALTH_SUMMARY
          const alreadyShowedForThisBatch = lastShownSummaryBatchId.value === payloadBatchId;
          const isCompleteForCurrentBatch = payloadBatchId === currentBatchIdWhenReceived;
          if (isCompleteForCurrentBatch && batchStopModalAlreadyShownThisBatch.value && !showBatchSummaryModal.value && !alreadyShowedForThisBatch) {
            const failingFromAlerts = [];
            if (firstBatchAlertServiceName.value) {
              const report = healthAlerts.value.get(firstBatchAlertServiceName.value);
              if (report) {
                failingFromAlerts.push({
                  serviceName: firstBatchAlertServiceName.value,
                  severity: report.severity ?? "warning",
                  summary: report.summary ?? "Health issue during sync",
                  issueCount: report.issues?.length ?? 0,
                  report,
                });
              } else {
                failingFromAlerts.push({
                  serviceName: firstBatchAlertServiceName.value,
                  severity: "warning",
                  summary: "Health issue was reported during sync",
                  issueCount: 0,
                  report: { severity: "warning", summary: "Health issue was reported during sync", issues: [] },
                });
              }
            }
            for (const [name, report] of healthAlerts.value) {
              if (name !== firstBatchAlertServiceName.value && report) {
                failingFromAlerts.push({
                  serviceName: name,
                  severity: report.severity ?? "warning",
                  summary: report.summary ?? "Health issue during sync",
                  issueCount: report.issues?.length ?? 0,
                  report,
                });
              }
            }
            if (failingFromAlerts.length > 0) {
              console.log("[BATCH_REPORT] Showing fallback summary, failingCount:", failingFromAlerts.length);
              lastShownSummaryBatchId.value = payloadBatchId;
              batchSummaryData.value = {
                batchId: payloadBatchId,
                namespace: p?.namespace ?? "",
                total: p?.total ?? 0,
                successCount: p?.successCount ?? 0,
                errorCount: p?.errorCount ?? 0,
                failingServices: failingFromAlerts,
              };
              showBatchSummaryModal.value = true;
              healthAlerts.value.clear();
            } else {
              console.log("[BATCH_REPORT] Fallback skipped: no failingFromAlerts (healthAlerts may have been cleared)");
            }
          }
          batchStopModalAlreadyShownThisBatch.value = false;
          firstBatchAlertServiceName.value = "";
          await fetchProfiles();
        }),

        websocketClient.on("POST_SYNC_HEALTH_OK", (p) => {
          // Health check passed - no action needed, just log
          console.log(`Health check OK for ${p?.serviceName}`);
        }),

        websocketClient.on("POST_SYNC_HEALTH_ALERT", (p) => {
          const serviceName = p?.serviceName;
          const report = p?.report;
          if (!serviceName || !report) return;

          healthAlerts.value.set(serviceName, report);

          if (batchInProgress.value) {
            if (!batchStopModalAlreadyShownThisBatch.value) {
              batchStopModalAlreadyShownThisBatch.value = true;
              firstBatchAlertServiceName.value = serviceName;
              showBatchStopModal.value = true;
              toast.warning(`Health issue in ${serviceName}. You can stop the batch or continue.`, {
                timeout: 5000,
              });
            }
          } else if (!dismissedAlerts.value.has(serviceName)) {
            currentHealthAlert.value = report;
            showHealthAlertModal.value = true;
            toast.warning(`⚠️ Health issue detected: ${serviceName}`, {
              timeout: 5000,
            });
          }
        }),

        websocketClient.on("BATCH_HEALTH_SUMMARY", (p) => {
          const summaryBatchId = p?.batchId ?? null;
          const failingServices = p?.failingServices || [];
          const hadResumeNoList = p?.hadResumeThisBatch === true && failingServices.length === 0;
          // If server sends batchId, only show for current or just-completed batch. If no batchId (old server), show only when no batch in progress (avoid stale report after new batch started).
          const isForCurrentBatch =
            summaryBatchId == null
              ? !batchInProgress.value
              : summaryBatchId === batchId.value || summaryBatchId === lastCompletedBatchId.value;
          console.log("[BATCH_REPORT] BATCH_HEALTH_SUMMARY received", {
            summaryBatchId,
            currentBatchId: batchId.value,
            lastCompletedBatchId: lastCompletedBatchId.value,
            isForCurrentBatch,
            failingCount: failingServices.length,
            hadResumeNoList,
          });
          if (!isForCurrentBatch) {
            if (failingServices.length > 0 || hadResumeNoList) {
              console.log("[BATCH_REPORT] Ignoring stale BATCH_HEALTH_SUMMARY (wrong batch)");
            }
            return;
          }
          // Never show the same batch's summary twice
          if (lastShownSummaryBatchId.value === summaryBatchId) {
            console.log("[BATCH_REPORT] Skipping duplicate BATCH_HEALTH_SUMMARY for same batch (already shown)");
            return;
          }
          if (failingServices.length > 0) {
            lastShownSummaryBatchId.value = summaryBatchId;
            batchSummaryData.value = {
              batchId: summaryBatchId,
              namespace: p?.namespace ?? "",
              total: p?.total ?? 0,
              successCount: p?.successCount ?? 0,
              errorCount: p?.errorCount ?? 0,
              failingServices,
            };
            showBatchSummaryModal.value = true;
            healthAlerts.value.clear();
          } else if (hadResumeNoList) {
            // Server says user had resumed but re-check passed → build summary from client-side healthAlerts
            const failingFromAlerts = [];
            if (firstBatchAlertServiceName.value) {
              const report = healthAlerts.value.get(firstBatchAlertServiceName.value);
              failingFromAlerts.push({
                serviceName: firstBatchAlertServiceName.value,
                severity: report?.severity ?? "warning",
                summary: report?.summary ?? "Health issue was reported during sync (you chose to continue)",
                issueCount: report?.issues?.length ?? 0,
                report: report ?? { severity: "warning", summary: "Health issue was reported during sync", issues: [] },
              });
            }
            for (const [name, report] of healthAlerts.value) {
              if (name !== firstBatchAlertServiceName.value && report) {
                failingFromAlerts.push({
                  serviceName: name,
                  severity: report.severity ?? "warning",
                  summary: report.summary ?? "Health issue during sync",
                  issueCount: report.issues?.length ?? 0,
                  report,
                });
              }
            }
            // Show even when empty (late summary, healthAlerts already cleared) so user gets at least one report
            if (failingFromAlerts.length === 0) {
              failingFromAlerts.push({
                serviceName: "(previous batch)",
                severity: "warning",
                summary: "Health issues were reported during this batch (you chose to continue).",
                issueCount: 0,
                report: { severity: "warning", summary: "Health issues were reported during this batch (you chose to continue).", issues: [] },
              });
            }
            lastShownSummaryBatchId.value = summaryBatchId;
            batchSummaryData.value = {
              batchId: summaryBatchId,
              namespace: p?.namespace ?? "",
              total: p?.total ?? 0,
              successCount: p?.successCount ?? 0,
              errorCount: p?.errorCount ?? 0,
              failingServices: failingFromAlerts,
            };
            showBatchSummaryModal.value = true;
            healthAlerts.value.clear();
          }
        }),

        websocketClient.on("BATCH_SYNC_PAUSED", (p) => {
          console.log("[BATCH_DEBUG] BATCH_SYNC_PAUSED:", p);
          // Modal should already be showing from POST_SYNC_HEALTH_ALERT
        }),

        websocketClient.on("BATCH_SYNC_CANCELLED", () => {
          batchInProgress.value = false;
          batchId.value = null;
          batchStopModalAlreadyShownThisBatch.value = false;
          toast.info("Batch sync was cancelled.");
        }),
      ];
    });

    onBeforeUnmount(() => {
      clearInactivityTimer();
      activityEvents.forEach((ev) => window.removeEventListener(ev, onActivity));
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
      healthAlerts,
      currentHealthAlert,
      showHealthAlertModal,
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
      handleBatchStop,
      handleBatchContinue,
      batchId,
      batchInProgress,
      showBatchStopModal,
      firstBatchAlertServiceName,
      showBatchSummaryModal,
      batchSummaryData,
      handleDontShowAgain,
      showInactivityModal,
      refreshPage,
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
