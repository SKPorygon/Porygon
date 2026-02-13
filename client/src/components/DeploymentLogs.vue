<template>
    <div>
      <h2>Deployment Logs</h2>
      <div v-if="loading">Deploying...</div>
      <ul v-if="logs.length">
        <li v-for="(log, index) in logs" :key="index">{{ log }}</li>
      </ul>
    </div>
  </template>
  
  <script lang="ts">
  import { ref, onMounted } from 'vue';
  
  export default {
    props: ['profileName'],
    setup(props) {
      const logs = ref<string[]>([]);
      const loading = ref(true);
  
      const deployProfile = async () => {
        try {
          const response = await fetch(`/deploy-profile/${props.profileName}`, {
            method: 'POST',
          });
          const result = await response.json();
          logs.value = result.logs;
        } catch (error) {
          logs.value = ['Failed to deploy profile.'];
        } finally {
          loading.value = false;
        }
      };
  
      onMounted(deployProfile);
  
      return { logs, loading };
    },
  };
  </script>
  