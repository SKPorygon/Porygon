<template>
  <nav class="bg-blue-500 text-white shadow-md">
    <div class="relative max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-14">
        <!-- Logo -->
        <div class="flex items-center justify-start space-x-2">
          <img src="../assets/porygon.png" alt="Porygon Logo" class="h-8 w-8" />
          <span class="text-lg font-semibold tracking-wide">Porygon</span>
        </div>

        <!-- Desktop Menu -->
        <div
          class="hidden md:flex space-x-4 absolute left-1/2 transform -translate-x-1/2"
        >
          <router-link
          v-if="userStore.user"
            to="/"
            class="px-3 py-1 text-sm font-medium rounded-md hover:bg-blue-600 transition"
            active-class="bg-blue-700"
          >
            Home
          </router-link>
          <router-link
          v-if="userStore.user"
            to="/profiles"
            class="px-3 py-1 text-sm font-medium rounded-md hover:bg-blue-600 transition"
            active-class="bg-blue-700"
          >
            Profiles
          </router-link>
          <router-link
          v-if="userStore.user"
            to="/browse-profiles"
            class="px-3 py-1 text-sm font-medium rounded-md hover:bg-blue-600 transition"
            active-class="bg-blue-700"
          >
            Browse Profiles
          </router-link>
          <router-link
          v-if="userStore.user"
            to="/requests"
            class="px-3 py-1 text-sm font-medium rounded-md hover:bg-blue-600 transition relative"
            active-class="bg-blue-700"
          >
            My Requests
            <span v-if="pendingRequestsCount > 0" class="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {{ pendingRequestsCount > 9 ? '9+' : pendingRequestsCount }}
            </span>
          </router-link>
          <router-link
          v-if="userStore.user"
            to="/manage-testing"
            class="px-3 py-1 text-sm font-medium rounded-md hover:bg-blue-600 transition"
            active-class="bg-blue-700"
          >
            Manage Testing
          </router-link>
          <router-link
          v-if="userStore.user"
            to="/sync-logs"
            class="px-3 py-1 text-sm font-medium rounded-md hover:bg-blue-600 transition"
            active-class="bg-blue-700"
          >
            Sync history
          </router-link>
          <router-link
          v-if="userStore.user"
            to="/upload"
            class="px-3 py-1 text-sm font-medium rounded-md hover:bg-blue-600 transition"
            active-class="bg-blue-700"
          >
            Create Profile
          </router-link>
        </div>
        <router-link
          v-if="!userStore.user"
          to="/login"
          class="px-3 py-1 text-sm font-medium rounded-md justify-end hover:bg-blue-600 transition"
          active-class="bg-blue-700"
        >
          <i class="fa-regular fa-user"></i>
        </router-link>
        <div
          v-else
          @click="logoutUser"
          class="px-3 py-1 text-sm font-medium rounded-md justify-end hover:bg-blue-600 transition"
          active-class="bg-blue-700"
        >
        log out
        </div>
        <!-- Mobile Menu Button -->
        <div class="md:hidden">
          <button
            @click="toggleMenu"
            class="text-white hover:bg-blue-600 p-2 rounded-md focus:outline-none"
          >
            <svg
              class="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-if="isMenuOpen" class="md:hidden bg-blue-600">
      <router-link
        to="/"
        class="block px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        active-class="bg-blue-700"
      >
        Home
      </router-link>
      <router-link
        to="/upload"
        class="block px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        active-class="bg-blue-700"
      >
        Upload Profile
      </router-link>
    </div>
  </nav>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from "vue";
import { useUserStore } from "../store/userStore";
import { getConfig } from "../config";

export default defineComponent({
  setup() {
    const isMenuOpen = ref(false);
    const userStore = useUserStore();
    const pendingRequestsCount = ref(0);
    let intervalId: number | null = null;

    const toggleMenu = () => {
      isMenuOpen.value = !isMenuOpen.value;
    };

    const fetchPendingRequestsCount = async () => {
      if (!userStore.user || !userStore.token) return;
      
      try {
        const response = await fetch(
          `http://${getConfig().urlHost}/api/profiles/requests/history`,
          {
            headers: {
              Authorization: `Bearer ${userStore.token}`,
            },
          }
        );

        if (response.ok) {
          const requests = await response.json();
          pendingRequestsCount.value = requests.filter(
            (req: any) => req.status === "pending"
          ).length;
        }
      } catch (error) {
        console.error("Error fetching pending requests count:", error);
      }
    };

    onMounted(() => {
      fetchPendingRequestsCount();
      // Refresh every 30 seconds
      intervalId = window.setInterval(fetchPendingRequestsCount, 30000);
    });

    onBeforeUnmount(() => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    });

    return { isMenuOpen, toggleMenu, userStore, pendingRequestsCount };
  },
  methods: {
    logoutUser() {
      this.userStore.logout();
      this.$router.push("/");
    }
  }
});
</script>

<style scoped>
img {
  filter: drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.5));
}

nav .md\\:hidden button:focus {
  outline: none;
}
</style>
