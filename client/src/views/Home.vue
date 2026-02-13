<template>
  <div class="bg-gray-100 min-h-screen">
    <!-- Hero Section -->
    <header class="bg-blue-500 text-white relative overflow-hidden">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between py-12 relative z-10"
      >
        <!-- Text Content -->
        <div class="text-center md:text-left mb-6 md:mb-0">
          <h1 class="text-4xl font-bold tracking-tight mb-4">
            <h1 v-if="userStore.user"> Hi {{ userStore.user.name }}</h1> Welcome to Porygon!
          </h1>
          <p class="text-lg mb-6">
            Simplify your integration testing with dynamic profiles and
            effortless management.
          </p>
          <router-link
            :to="userStore.user ? `/upload`: `/sign-up`"
            class="cta-button px-6 py-3 font-semibold rounded shadow"
          >
            Get Started
          </router-link>
        </div>
        <!-- Hero Image -->
        <div>
          <img
            src="../assets/porygon.png"
            alt="Porygon"
            class="h-64 w-auto mx-auto"
          />
        </div>
      </div>
      <!-- Background SVG Wave -->
      <div class="absolute bottom-0 left-0 w-full pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          class="w-full h-auto"
        >
          <path
            fill="#ffffff"
            fill-opacity="0.1"
            d="M0,288L1440,160L1440,320L0,320Z"
          ></path>
        </svg>
      </div>
    </header>

    <!-- Features Section -->
    <section class="py-16 bg-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-gray-800 text-center mb-10">
          Why Choose Porygon?
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Feature 1 -->
          <div
            class="feature-card bg-white shadow-md rounded-lg p-6 text-center"
          >
            <img
              src="https://img.icons8.com/fluency/96/group.png"
              alt="Dynamic Profiles"
              class="h-12 w-12 mx-auto mb-4"
            />
            <h3 class="text-xl font-semibold mb-2">Dynamic Profiles</h3>
            <p class="text-gray-600">
              Create and manage profiles for seamless integration testing across
              environments.
            </p>
          </div>
          <!-- Feature 2 -->
          <div
            class="feature-card bg-white shadow-md rounded-lg p-6 text-center"
          >
            <img
              src="https://img.icons8.com/ios-filled/64/4facfe/cloud.png"
              alt="OpenShift Integration"
              class="h-12 w-12 mx-auto mb-4"
            />
            <h3 class="text-xl font-semibold mb-2">OpenShift Integration</h3>
            <p class="text-gray-600">
              Deploy and manage microservices effortlessly with OpenShift
              compatibility.
            </p>
          </div>
          <!-- Feature 3 -->
          <div
            class="feature-card bg-white shadow-md rounded-lg p-6 text-center"
          >
            <img
              src="https://img.icons8.com/ios-filled/64/4facfe/settings.png"
              alt="Easy Configurations"
              class="h-12 w-12 mx-auto mb-4"
            />
            <h3 class="text-xl font-semibold mb-2">Easy Configurations</h3>
            <p class="text-gray-600">
              Enjoy a user-friendly interface for managing configurations and
              testing profiles.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section
      class="bg-gray-50 py-12"
      data-aos="fade-up"
      data-aos-duration="1000"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-gray-800 text-center mb-8">
          What Our Users Say
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white shadow-md rounded-lg p-6 text-center">
            <p class="text-gray-600 italic">
              "Porygon has revolutionized how we handle integration testing."
            </p>
            <h3 class="text-lg font-semibold mt-4">- Leider</h3>
          </div>
          <div class="bg-white shadow-md rounded-lg p-6 text-center">
            <p class="text-gray-600 italic">
              "The best tool for OpenShift deployments by far!"
            </p>
            <h3 class="text-lg font-semibold mt-4">- Giora Glotzer</h3>
          </div>
          <div class="bg-white shadow-md rounded-lg p-6 text-center">
            <p class="text-gray-600 italic">
              "I love how easy it is to manage configurations."
            </p>
            <h3 class="text-lg font-semibold mt-4">- Martina Sherlin</h3>
          </div>
        </div>
      </div>
    </section>

    <!-- Newsletter Signup Section -->
    <section class="bg-blue-500 text-white py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-2xl font-semibold mb-4">Stay Updated</h2>
        <p class="mb-6">
          Subscribe to our newsletter for the latest updates and features.
        </p>
        <form class="flex flex-col sm:flex-row items-center justify-center">
          <input
            type="email"
            placeholder="Enter your email"
            class="rounded-l-md p-3 w-full sm:w-96 text-gray-800"
          />
          <button
            type="submit"
            class="bg-white text-blue-500 font-semibold px-6 py-3 rounded-r-md hover:bg-gray-200"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-blue-500 text-white py-6 relative z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p>&copy; 2025 Porygon. All rights reserved.</p>
        <div class="flex justify-center space-x-4 mt-4">
          <a href="https://mi/api/v1/people/image/s8664220" class="social-icon hover:text-gray-200">
            <img
              src="https://mi/api/v1/people/image/s8664220"
              alt="Facebook"
            />
          </a>
          <a href="https://mi/api/v1/people/image/s8664420" class="social-icon hover:text-gray-200">
            <img
              src="https://mi/api/v1/people/image/s8664420"
              alt="Twitter"
            />
          </a>
          <a href="https://mi/api/v1/people/image/s7086424" class="social-icon hover:text-gray-200">
            <img
              src="https://mi/api/v1/people/image/s7086424"
              alt="LinkedIn"
            />
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { useUserStore } from "../store/userStore";
import { getConfig } from "../config.js";

export default {
  name: "Home",
  data() {
    return {
      userStore: useUserStore(),
    };
  },
};
</script>

<style scoped>
.cta-button {
  background: linear-gradient(to right, #4facfe, #00f2fe);
  color: #fff;
  transition: transform 0.2s, background 0.3s;
}
.cta-button:hover {
  transform: scale(1.05);
  background: linear-gradient(to right, #00f2fe, #4facfe);
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.social-icon:hover {
  transform: scale(1.2);
  transition: transform 0.2s;
}
</style>
