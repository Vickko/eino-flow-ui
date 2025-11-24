import axios from 'axios';

const API_BASE = 'http://localhost:52538/eino/devops';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchGraphs = async () => {
  try {
    const response = await apiClient.get('/debug/v1/graphs');
    return response.data;
  } catch (error) {
    console.error('Error fetching graphs:', error);
    throw error;
  }
};

export const fetchGraphCanvas = async (graphId) => {
  try {
    const response = await apiClient.get(`/debug/v1/graphs/${graphId}/canvas`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching graph canvas for ${graphId}:`, error);
    throw error;
  }
};

export const fetchInputTypes = async () => {
  try {
    const response = await apiClient.get('/debug/v1/input_types');
    return response.data;
  } catch (error) {
    console.error('Error fetching input types:', error);
    throw error;
  }
};

export const createDebugThread = async (graphId, input) => {
  try {
    const response = await apiClient.post(`/debug/v1/graphs/${graphId}/threads`, input);
    return response.data;
  } catch (error) {
    console.error(`Error creating debug thread for ${graphId}:`, error);
    throw error;
  }
};

export const streamDebugRun = async (graphId, threadId, input, onChunk) => {
  try {
    const response = await fetch(`${API_BASE}/debug/v1/graphs/${graphId}/threads/${threadId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (onChunk) onChunk(chunk);
    }
  } catch (error) {
    console.error(`Error streaming debug run for ${graphId}/${threadId}:`, error);
    throw error;
  }
};