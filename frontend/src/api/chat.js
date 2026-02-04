import client from './client';

// Generate a session ID for conversation continuity
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('chatSessionId');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('chatSessionId', sessionId);
  }
  return sessionId;
};

// Get Ollama settings from localStorage
const getOllamaSettings = () => {
  try {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      return {
        ollamaUrl: settings.ollamaUrl || 'http://localhost:11434',
        ollamaModel: settings.ollamaModel || 'llama3.2'
      };
    }
  } catch (e) {
    // Ignore parse errors
  }
  return {
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2'
  };
};

export const chatApi = {
  // NLP-based chat (for task actions like create, move, delete)
  sendMessage: (message) =>
    client.post('/chat', { message }).then(res => res.data),

  // LLM-based AI chat (for intelligent conversations)
  sendAiMessage: (message) => {
    const settings = getOllamaSettings();
    return client.post('/chat/ai', {
      message,
      sessionId: getSessionId(),
      ollamaUrl: settings.ollamaUrl,
      ollamaModel: settings.ollamaModel
    }).then(res => res.data);
  },

  // Check Ollama status
  getStatus: () =>
    client.get('/chat/status').then(res => res.data),

  // Clear conversation history
  clearHistory: () =>
    client.post('/chat/clear', {
      sessionId: getSessionId()
    }).then(res => res.data),

  // Reset session (for new conversation)
  resetSession: () => {
    sessionStorage.removeItem('chatSessionId');
    return getSessionId();
  }
};
