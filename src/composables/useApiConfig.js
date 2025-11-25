import { ref } from 'vue';
import { setBaseUrl } from '@/api';

const STORAGE_KEY = 'devops_api_base_url';
const DEFAULT_API_BASE = 'http://localhost:52538/eino/devops';

// Initialize state from localStorage or default
const storedUrl = localStorage.getItem(STORAGE_KEY);
const initialUrl = storedUrl || DEFAULT_API_BASE;

// Set initial URL in axios immediately when module loads
setBaseUrl(initialUrl);

// Global state
const apiBaseUrl = ref(initialUrl);

export function useApiConfig() {
  const updateApiBaseUrl = (newUrl) => {
    if (!newUrl) return;
    
    // Update state
    apiBaseUrl.value = newUrl;
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, newUrl);
    
    // Update axios instance
    setBaseUrl(newUrl);
  };

  const resetApiBaseUrl = () => {
    updateApiBaseUrl(DEFAULT_API_BASE);
  };

  return {
    apiBaseUrl,
    updateApiBaseUrl,
    resetApiBaseUrl,
    DEFAULT_API_BASE
  };
}