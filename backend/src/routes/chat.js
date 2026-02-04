import { Router } from 'express';
import { processMessage } from '../services/aiChatService.js';
import { chat as llmChat, checkOllamaStatus } from '../services/llmService.js';

const router = Router();

// Store conversation history per session (in-memory, resets on server restart)
const conversationHistories = new Map();

// POST /api/chat - Process chat message (NLP-based for actions)
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await processMessage(message.trim());
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred processing your request',
      error: error.message
    });
  }
});

// POST /api/chat/ai - LLM-based chat with full context
router.post('/ai', async (req, res) => {
  try {
    const { message, sessionId = 'default', ollamaUrl, ollamaModel } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create conversation history for this session
    if (!conversationHistories.has(sessionId)) {
      conversationHistories.set(sessionId, []);
    }
    const history = conversationHistories.get(sessionId);

    // Add user message to history
    history.push({ role: 'user', content: message.trim() });

    // Build options from request
    const options = {};
    if (ollamaUrl) options.ollamaUrl = ollamaUrl;
    if (ollamaModel) options.ollamaModel = ollamaModel;

    // Get LLM response
    const result = await llmChat(message.trim(), history, options);

    // Add assistant response to history
    if (result.success) {
      history.push({ role: 'assistant', content: result.message });
    }

    // Keep history manageable (last 20 messages)
    while (history.length > 20) {
      history.shift();
    }

    res.json(result);
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred processing your request',
      error: error.message
    });
  }
});

// GET /api/chat/status - Check Ollama status
router.get('/status', async (req, res) => {
  try {
    const status = await checkOllamaStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      available: false,
      error: error.message
    });
  }
});

// POST /api/chat/clear - Clear conversation history
router.post('/clear', (req, res) => {
  const { sessionId = 'default' } = req.body;
  conversationHistories.delete(sessionId);
  res.json({ success: true, message: 'Conversation history cleared' });
});

export default router;
