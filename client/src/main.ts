import { createApp } from "vue";
// @ts-ignore
import App from "./App.vue";
import { createPinia } from "pinia";
import router from "./router";
import "./index.css";
import "./style.css";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import socketClient from "./websockets/websocketClient";
import { loadConfig } from "./config";

const pinia = createPinia();
const app = createApp(App);

await loadConfig();

app.use(Toast, {
  position: "top-right",
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
  rtl: false,
});

app.use(pinia);

socketClient.connect("ws://localhost:3000");

router.afterEach((to) => {
  // שינוי title
  if (to.meta?.title) {
    document.title = `${to.meta.title} ‣ Porygon`;
  }

  // שינוי favicon
  if (to.meta?.favicon) {
    // מחפש favicon קיים
    let link =
      (document.querySelector("link[rel~='icon']") as HTMLLinkElement | null) ||
      (document.createElement("link") as HTMLLinkElement);

    link.rel = "icon";
    link.href = to.meta.favicon as string;
    link.type = "image/x-icon";

    // מוחק כל favicon קיים
    document.head
      .querySelectorAll("link[rel~='icon']")
      .forEach((el) => el.remove());

    // מוסיף את החדש
    document.head.appendChild(link);
  }
});

app.use(router);
app.mount("#app");

export default socketClient;
