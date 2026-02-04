import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../../api/chat';
import { ChatMarkdown } from '../../utils/markdown.jsx';

const CHAT_MODES = {
  AI: 'ai',      // LLM-based intelligent chat
  ACTIONS: 'actions' // NLP-based task actions
};

// Get default chat mode from settings
const getDefaultChatMode = () => {
  try {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.chatMode === 'actions' ? CHAT_MODES.ACTIONS : CHAT_MODES.AI;
    }
  } catch (e) {
    // Ignore
  }
  return CHAT_MODES.AI;
};

function ChatPanel({ isOpen, onClose }) {
  const [mode, setMode] = useState(getDefaultChatMode);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState({ available: false, checking: true });
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const queryClient = useQueryClient();

  // Initial welcome message based on mode
  const getWelcomeMessage = (chatMode) => {
    if (chatMode === CHAT_MODES.AI) {
      return {
        id: 'welcome',
        type: 'assistant',
        text: `Hi! I'm your AI assistant with full knowledge of your Kanban board. I can help you with:

**Ask me anything about your tasks:**
- "What tasks are overdue?"
- "Give me a summary of project X"
- "What should I focus on today?"
- "How many high priority tasks do we have?"
- "What's the status of the A20 project?"

I understand natural language, so just ask freely!`
      };
    }
    return {
      id: 'welcome',
      type: 'assistant',
      text: `Hi! I'm your task assistant. I can perform actions like:

- "Create task called Fix bug in To Do"
- "Move task X to Done"
- "Add label Bug to all tasks in To Do"
- "Show all high priority tasks"

Say "help" for more commands!`
    };
  };

  // Check Ollama status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await chatApi.getStatus();
        setOllamaStatus({ ...status, checking: false });
      } catch (error) {
        setOllamaStatus({ available: false, checking: false, error: error.message });
      }
    };
    checkStatus();
  }, []);

  // Initialize messages when mode changes
  useEffect(() => {
    setMessages([getWelcomeMessage(mode)]);
  }, [mode]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setInput(transcript);

        if (event.results[0].isFinal) {
          setTimeout(() => {
            handleSend(transcript);
          }, 500);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      addMessage('assistant', 'Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInput('');
      recognitionRef.current.start();
    }
  };

  const addMessage = (type, text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type,
      text
    }]);
  };

  const handleSend = async (messageText = input) => {
    const text = messageText.trim();
    if (!text || isLoading) return;

    addMessage('user', text);
    setInput('');
    setIsLoading(true);

    try {
      let response;

      if (mode === CHAT_MODES.AI) {
        // Check if Ollama is available
        if (!ollamaStatus.available) {
          addMessage('assistant', `**Ollama is not available.** Please make sure Ollama is running:\n\n1. Install Ollama from https://ollama.ai\n2. Run: \`ollama serve\`\n3. Pull a model: \`ollama pull llama3.2\`\n\nSwitching to Actions mode for now...`);
          setMode(CHAT_MODES.ACTIONS);
          setIsLoading(false);
          return;
        }
        response = await chatApi.sendAiMessage(text);
      } else {
        response = await chatApi.sendMessage(text);
      }

      addMessage('assistant', response.message);

      // Invalidate queries if action was performed
      if (response.action && ['create', 'update', 'delete', 'move'].includes(response.action)) {
        queryClient.invalidateQueries({ queryKey: ['project'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['labels'] });
      }
    } catch (error) {
      addMessage('assistant', `Sorry, something went wrong: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = async () => {
    if (mode === CHAT_MODES.AI) {
      await chatApi.clearHistory();
    }
    setMessages([getWelcomeMessage(mode)]);
  };

  const handleCopyMessage = async (messageId, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const quickActionsAI = [
    "What's overdue?",
    "Today's priorities",
    "Project summary",
    "High priority tasks"
  ];

  const quickActionsNLP = [
    'Show all tasks',
    'Show overdue tasks',
    "What's due today?",
    'Show project info'
  ];

  const quickActions = mode === CHAT_MODES.AI ? quickActionsAI : quickActionsNLP;

  if (!isOpen) return null;

  return (
    <div className={`fixed bg-white shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden transition-all duration-300 ${
      isExpanded
        ? 'inset-4 rounded-xl'
        : 'bottom-20 right-4 w-[420px] h-[550px] rounded-2xl'
    }`}>
      {/* Header */}
      <div className={`${mode === CHAT_MODES.AI ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              {mode === CHAT_MODES.AI ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {mode === CHAT_MODES.AI ? 'AI Assistant' : 'Task Actions'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs opacity-90">
                {mode === CHAT_MODES.AI && (
                  <span className={`w-2 h-2 rounded-full ${ollamaStatus.available ? 'bg-green-400' : 'bg-red-400'}`} />
                )}
                <span>
                  {mode === CHAT_MODES.AI
                    ? (ollamaStatus.checking ? 'Checking...' : ollamaStatus.available ? 'Ollama Connected' : 'Ollama Offline')
                    : 'Voice & Text enabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Clear Chat */}
            <button
              onClick={handleClearChat}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="Clear chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex mt-3 bg-white/10 rounded-lg p-1">
          <button
            onClick={() => setMode(CHAT_MODES.AI)}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
              mode === CHAT_MODES.AI
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            AI Chat
          </button>
          <button
            onClick={() => setMode(CHAT_MODES.ACTIONS)}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
              mode === CHAT_MODES.ACTIONS
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Task Actions
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 ${isExpanded ? 'px-8' : ''}`}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} ${isExpanded ? 'max-w-4xl mx-auto' : ''}`}
          >
            {msg.type === 'user' ? (
              <div
                className={`rounded-2xl px-4 py-2.5 ${
                  isExpanded ? 'max-w-[70%]' : 'max-w-[85%]'
                } ${
                  mode === CHAT_MODES.AI
                    ? 'bg-purple-600 text-white rounded-br-md'
                    : 'bg-blue-600 text-white rounded-br-md'
                }`}
              >
                <p className={`whitespace-pre-wrap ${isExpanded ? 'text-base' : 'text-sm'}`}>{msg.text}</p>
              </div>
            ) : (
              <div className={`group relative ${isExpanded ? 'max-w-[70%]' : 'max-w-[85%]'}`}>
                <div className="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-md shadow-sm px-4 py-2.5">
                  <ChatMarkdown className={isExpanded ? 'text-base' : 'text-sm'}>{msg.text}</ChatMarkdown>
                </div>
                {/* Copy Button */}
                <button
                  onClick={() => handleCopyMessage(msg.id, msg.text)}
                  className={`absolute -bottom-2 right-2 p-1.5 rounded-lg transition-all ${
                    copiedMessageId === msg.id
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 opacity-0 group-hover:opacity-100'
                  }`}
                  title={copiedMessageId === msg.id ? 'Copied!' : 'Copy message'}
                >
                  {copiedMessageId === msg.id ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-500">
                  {mode === CHAT_MODES.AI ? 'AI is thinking...' : 'Processing...'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className={`px-3 py-2 border-t border-gray-200 bg-white ${isExpanded ? 'px-8' : ''}`}>
        <div className={`flex gap-2 overflow-x-auto pb-1 scrollbar-hide ${isExpanded ? 'max-w-4xl mx-auto justify-center' : ''}`}>
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => handleSend(action)}
              disabled={isLoading}
              className={`flex-shrink-0 px-3 py-1 text-xs rounded-full transition-colors disabled:opacity-50 ${
                mode === CHAT_MODES.AI
                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className={`p-3 border-t border-gray-200 bg-white ${isExpanded ? 'px-8' : ''}`}>
        <div className={`flex items-center gap-2 ${isExpanded ? 'max-w-4xl mx-auto' : ''}`}>
          {/* Microphone Button */}
          <button
            onClick={toggleListening}
            disabled={isLoading}
            className={`p-2.5 rounded-xl transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } disabled:opacity-50`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening...' : mode === CHAT_MODES.AI ? 'Ask about your tasks...' : 'Type a command...'}
              disabled={isLoading}
              className={`w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                isListening ? 'bg-red-50 border-red-200' : ''
              } ${mode === CHAT_MODES.AI ? 'focus:ring-purple-500' : 'focus:ring-blue-500'}`}
            />
            {isListening && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="flex items-center gap-0.5">
                  <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse" />
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                  <div className="w-1 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={`p-2.5 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === CHAT_MODES.AI
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
