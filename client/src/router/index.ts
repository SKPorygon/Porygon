import { createRouter, createWebHistory } from 'vue-router';
// @ts-ignore
import Home from '../views/Home.vue';
import UploadProfile from '../views/UploadProfile.vue';
// @ts-ignore
import DeployProfile from '../views/DeployProfile.vue';
// @ts-ignore
import ProfileList from '../views/ProfileList.vue';
import tabIcon from "../assets/porygon.png";
import UpdateProfile from '../views/UpdateProfile.vue';
// @ts-ignore
import TestingProfiles from '../views/TestingProfiles.vue';
// @ts-ignore
import Login from '../views/Login.vue';
// @ts-ignore
import Signup from '../views/Signup.vue';
import Logs from '../views/Logs.vue';

const routes = [
  { path: '/', name: 'Home', component: Home, meta: {title:"Home", favicon: tabIcon} },
  { path: '/upload', name: 'UploadProfile', component: UploadProfile, meta: {title:"Upload Profile", favicon: tabIcon}},
  { path: "/profiles", name: "ProfileList", component: ProfileList, meta: {title:"Profiles", favicon: tabIcon}},
  { path: '/deploy/:profileName', name: 'DeployProfile', component: DeployProfile, meta: {title:"Deploy profile", favicon: tabIcon}},
  { path: '/manage-testing', name: 'manageTesting', component: TestingProfiles, meta: {title:"Manage testing", favicon: tabIcon}},
  { path: '/login', name: 'Login', component: Login, meta: {title:"Log-in", favicon: tabIcon}},
  { path: '/sign-up', name: 'SignUp', component: Signup, meta: {title:"Sign-up", favicon: tabIcon}},
  {
    path: '/profiles/update/:id', // Add the update route
    name: 'UpdateProfile',
    component: UpdateProfile,
    props: true, // Pass route params as props to the component
    meta: {title:"Upload Profile", favicon: tabIcon} 
  },
  {
    path: '/profiles/logs/:id', // Add the update route
    name: 'ProfileLogs',
    component: Logs,
    props: true, // Pass route params as props to the component
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
