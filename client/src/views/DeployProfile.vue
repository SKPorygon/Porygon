<template>
    <div>
      <h1>Deploy Profile: {{ profileName }}</h1>
      <DeploymentLogs :profileName="profileName" />
    </div>
  </template>
  
  <script>
  import { defineComponent } from 'vue';
  import DeploymentLogs from '../components/DeploymentLogs.vue';
  
  export default defineComponent({
    components: {
      DeploymentLogs,
    },
    props: ['profileName'],
    setup(props) {
      return { profileName: props.profileName };
    },
  });
  </script>
  