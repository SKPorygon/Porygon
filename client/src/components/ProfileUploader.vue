<template>
    <div>
      <form @submit.prevent="uploadProfile">
        <label for="profileFile">Select a Profile File (JSON)</label>
        <input type="file" id="profileFile" @change="handleFile" />
        <button type="submit">Upload</button>
      </form>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent } from 'vue';
  
  export default defineComponent({
    data() {
      return {
        file: null as File | null,
      };
    },
    methods: {
      handleFile(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          this.file = target.files[0];
        }
      },
      async uploadProfile() {
        if (!this.file) {
          alert('Please select a file.');
          return;
        }
  
        const formData = new FormData();
        formData.append('profile', this.file);
  
        try {
          await fetch('/upload-profile', {
            method: 'POST',
            body: formData,
          });
          this.$emit('uploaded');
        } catch (error) {
          alert('Failed to upload profile.');
        }
      },
    },
  });
  </script>
  