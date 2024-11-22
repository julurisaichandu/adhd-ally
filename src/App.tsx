

import { useState, useEffect } from 'react';
import Groq from 'groq-sdk';
// import axios from 'axios';


const App = () => {
  const [state, setState] = useState({
    apiKey: "",
    systemPrompt: "",
    isActive: false,
    summary: "",
    isLoading: false,
    error: null as string | null,
    elevenLabsApiKey: "", // New state for ElevenLabs API key
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Default voice ID (you can make this configurable)
    isPlayingAudio: false,
    isSidebarVisible: false,

  });

  const injectSidebar = () => {
    // Create sidebar container
    const sidebarContainer = document.createElement('div');
    sidebarContainer.id = 'extension-sidebar';
    sidebarContainer.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 300px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 5px rgba(0,0,0,0.1);
      z-index: 10000;
      padding: 20px;
      overflow-y: auto;
      transition: transform 0.3s ease;
    `;
  
    // Create sidebar content
    const sidebarContent = `
      <div style="position: relative;">
        <h2 style="margin-bottom: 20px;">Text Summarizer</h2>
        <button id="close-sidebar" style="
          position: absolute;
          top: 0;
          right: 0;
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
        ">✕</button>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">
            API Key:
            <input type="password" id="api-key-input" style="width: 100%; padding: 8px;" />
          </label>
        </div>
  
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">
            System Prompt:
            <textarea id="system-prompt" style="width: 100%; padding: 8px;" 
              placeholder="E.g., Summarize in 2 sentences"></textarea>
          </label>
        </div>
  
        <button id="summarize-btn" style="
          width: 100%;
          padding: 10px;
          background: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Summarize</button>
  
        <div id="summary-container" style="margin-top: 20px;"></div>
      </div>
    `;
  
    // Set content and append to body
    sidebarContainer.innerHTML = sidebarContent;
    document.body.appendChild(sidebarContainer);
  
    // Add padding to body to prevent content overlap
    document.body.style.paddingRight = '300px';
  
    // Add event listeners
    
  };

   // Toggle Sidebar visibility
   const toggleSidebar = () => {
    if (state.isSidebarVisible) {
      document.getElementById('extension-sidebar')?.remove();
    } else {
      injectSidebar();
    }
    setState(prev => ({ ...prev, isSidebarVisible: !prev.isSidebarVisible }));
  };

  useEffect(() => {
    // When the extension is loaded, make sure to toggle sidebar if needed
    if (state.isSidebarVisible) {
      injectSidebar();
    }
  }, [state.isSidebarVisible]);

  // Add text-to-speech function
  const speakText = async () => {
    if (!state.summary || !state.elevenLabsApiKey) return;

    try {
      setState(prev => ({ ...prev, isPlayingAudio: true }));

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${state.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': state.elevenLabsApiKey
          },
          body: JSON.stringify({
            text: state.summary,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      // Convert the response to blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setState(prev => ({ ...prev, isPlayingAudio: false }));
        URL.revokeObjectURL(audioUrl); // Clean up
      };

      audio.play();
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : "Failed to play audio",
        isPlayingAudio: false 
      }));
      alert(err instanceof Error ? err.message : "Failed to play audio");
    }
  };

  // Update useEffect to load ElevenLabs API key
  useEffect(() => {
    try {
      chrome.storage.sync.get(
        ["apiKey", "systemPrompt", "isActive", "elevenLabsApiKey", "voiceId"],
        (data) => {
          setState(prev => ({
            ...prev,
            apiKey: data.apiKey || "",
            systemPrompt: data.systemPrompt || "",
            isActive: !!data.isActive,
            elevenLabsApiKey: data.elevenLabsApiKey || "",
            voiceId: data.voiceId || "21m00Tcm4TlvDq8ikWAM"
          }));
        }
      );
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }, []);

  // Update saveSettings to include ElevenLabs API key
  const saveSettings = async () => {
    try {
      await chrome.storage.sync.set({
        apiKey: state.apiKey,
        systemPrompt: state.systemPrompt,
        isActive: state.isActive,
        elevenLabsApiKey: state.elevenLabsApiKey,
        voiceId: state.voiceId
      });
      alert("Settings saved successfully!");
    } catch (err) {
      alert("Failed to save settings");
    }
  };

  const getSelectedText = async () => {
    try {
      console.log("Getting selected text");
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) throw new Error("No active tab");
  
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() || ''
      });
      
      console.log("Selected text:", result);
      return result;
    } catch (err) {
      console.log("Error getting selected text:", err);
      throw new Error("Failed to get selected text");
    }
  };

  const summarizeText = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log("summarizeText");
      const selectedText = await getSelectedText();
      console.log(selectedText);
      
      if (!selectedText) {
        throw new Error("No text selected");
      }

      if (!state.apiKey) {
        throw new Error("API key is required");
      }

      // Create Groq client with user's API key
      const groq = new Groq({
        apiKey: state.apiKey,
        dangerouslyAllowBrowser: true,
      });

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: `${state.systemPrompt}\nSummarize this:\n${selectedText}`,
          },
        ],
        model: 'llama3-8b-8192',
      });

      const responseContent = 
        chatCompletion.choices[0]?.message?.content || 'No response';

      setState(prev => ({ 
        ...prev, 
        summary: responseContent.trim(),
        isLoading: false 
      }));
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : "An unknown error occurred" ,
        isLoading: false 
      }));
      alert(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 flex justify-center items-center">
      <div className="w-full max-w-[400px] bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">Text Summarizer</h1>
         {/* Sidebar Toggle Button */}
        <div className="mb-4">
          <button
            onClick={toggleSidebar}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
          >
            {state.isSidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
          </button>
        </div>
        {/* Groq API Key */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Groq API Key:
          </label>
          <input
            type="password"
            value={state.apiKey}
            onChange={(e) => setState((prev) => ({ ...prev, apiKey: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>
        
        {/* ElevenLabs API Key */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            ElevenLabs API Key:
          </label>
          <input
            type="password"
            value={state.elevenLabsApiKey}
            onChange={(e) => setState((prev) => ({ ...prev, elevenLabsApiKey: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>
        
        {/* Voice ID */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Voice ID:
          </label>
          <input
            type="text"
            value={state.voiceId}
            onChange={(e) => setState((prev) => ({ ...prev, voiceId: e.target.value }))}
            placeholder="Enter ElevenLabs Voice ID"
            className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>
        
        {/* System Prompt */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            System Prompt:
          </label>
          <textarea
            value={state.systemPrompt}
            onChange={(e) => setState((prev) => ({ ...prev, systemPrompt: e.target.value }))}
            placeholder="E.g., Summarize in 2 sentences"
            className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>
        
        {/* Activate Extension */}
        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(e) => setState((prev) => ({ ...prev, isActive: e.target.checked }))}
            className="mr-2"
          />
          <label className="text-gray-700 font-medium">Activate Extension</label>
        </div>
        
        {/* Buttons */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => saveSettings()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
          >
            Save Settings
          </button>
          <button
            onClick={() => summarizeText()}
            disabled={!state.isActive || state.isLoading}
            className={`px-4 py-2 text-white rounded-lg shadow ${
              state.isActive
                ? "bg-green-500 hover:bg-green-600"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {state.isLoading ? "Summarizing..." : "Summarize"}
          </button>
        </div>
  
        {/* Summary and Speak Button */}
        {state.summary && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Summary:</h3>
            <p className="bg-gray-100 p-3 rounded-lg text-gray-700">{state.summary}</p>
            <button
              onClick={() => speakText()}
              disabled={!state.elevenLabsApiKey || state.isPlayingAudio}
              className={`mt-2 px-4 py-2 text-white rounded-lg shadow ${
                state.elevenLabsApiKey
                  ? "bg-purple-500 hover:bg-purple-600"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {state.isPlayingAudio ? "Playing..." : "🔊 Speak"}
            </button>
          </div>
        )}
  
        {/* Error */}
        {state.error && <div className="text-red-600 font-medium">{state.error}</div>}
      </div>
    </div>
  );
}  
export default App;