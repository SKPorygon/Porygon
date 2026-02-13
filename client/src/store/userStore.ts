import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null') as User | null,
    token: localStorage.getItem('token') || '',
    isAuthenticated: !!localStorage.getItem('token'),
  }),

  actions: {
    setUser(user: User, token: string) {
    console.log("in ze user store wiz user: " + JSON.stringify(user), "token: " + token)
      this.user = user;
      this.token = token;
      this.isAuthenticated = true;

      // Save user data and token to localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    },

    // Clear user data on logout
    logout() {
      this.user = null;
      this.token = '';
      this.isAuthenticated = false;

      // Remove user data and token from localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
  },
});

// Define the User type (if you're using TypeScript)
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}
