<template>
  <div>
    <NavBar />
    <router-view />
  </div>
</template>

<script>
import NavBar from "./components/NavBar.vue";

export default {
  components: {
    NavBar,
  },
};
</script>
<style>

@font-face {
  font-family: "Lexend-Regular";
  src: url('./assets/Lexend-Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

#app {
  font-family: "Lexend-Regular", sans-serif;
}
</style>
