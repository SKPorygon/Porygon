// config.ts

export interface AppConfig {
  apiUrl: string;
}

let config: AppConfig;

export async function loadConfig() {
  console.log('Loading config...');
  
  // שינוי הכתובת לכתובת אבסולוטית מה-Root של האתר
  const response = await fetch('/config/config.json'); 
  
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.statusText}`);
  }

  config = await response.json();
  console.log('Config loaded. Response:', config);
}

export function getConfig() {
  return config;
}