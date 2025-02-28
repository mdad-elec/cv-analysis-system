import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, 
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    
    if (error.response) {
      error.message = `Server error: ${error.response.status} ${error.response.statusText}`;
      if (error.response.data && error.response.data.detail) {
        error.message += ` - ${error.response.data.detail}`;
      }
    } else if (error.request) {
      error.message = `No response received: ${error.message}`;
    }
    
    return Promise.reject(error);
  }
);

export const cvService = {
  getDocuments: async () => {
    try {
      const response = await api.get('/documents/list');
      return response.data;
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  },
  
  getDocument: async (id) => {
    try {
      const response = await api.get(`/documents/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting document ${id}:`, error);
      throw error;
    }
  },
  
  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },
  
  getDocumentStatus: async (id) => {
    try {
      const response = await api.get(`/documents/status/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting document status ${id}:`, error);
      throw error;
    }
  },
  
  deleteDocument: async (id) => {
    try {
      const response = await api.delete(`/documents/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting document ${id}:`, error);
      throw error;
    }
  },
};

export const queryService = {
  query: async (queryText, context = null) => {
    try {
      const response = await api.post('/queries/query', {
        query: queryText,
        context: context,
      });
      
      return response.data;
    } catch (error) {
      console.error('Error querying CV data:', error);
      throw error;
    }
  },
  
  followupQuery: async (queryText, context) => {
    try {
      const response = await api.post('/queries/followup', {
        query: queryText,
        context: context,
      });
      
      return response.data;
    } catch (error) {
      console.error('Error with followup query:', error);
      throw error;
    }
  },
};

export const healthService = {
  getHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },
};

export default api;