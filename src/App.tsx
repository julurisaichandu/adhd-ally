

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
    isPlayingAudio: false
  });

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
    <div className="App">
      <h1>Text Summarizer</h1>
      <div>
        <label>
          Groq API Key:
          <input
            type="password"
            value={state.apiKey}
            onChange={(e) => setState(prev => ({
              ...prev,
              apiKey: e.target.value
            }))}
          />
        </label>
      </div>
      <div>
        <label>
          ElevenLabs API Key:
          <input
            type="password"
            value={state.elevenLabsApiKey}
            onChange={(e) => setState(prev => ({
              ...prev,
              elevenLabsApiKey: e.target.value
            }))}
          />
        </label>
      </div>
      <div>
        <label>
          Voice ID:
          <input
            type="text"
            value={state.voiceId}
            onChange={(e) => setState(prev => ({
              ...prev,
              voiceId: e.target.value
            }))}
            placeholder="Enter ElevenLabs Voice ID"
          />
        </label>
      </div>
      <div>
        <label>
          System Prompt:
          <textarea
            value={state.systemPrompt}
            onChange={(e) => setState(prev => ({
              ...prev,
              systemPrompt: e.target.value
            }))}
            placeholder="E.g., Summarize in 2 sentences"
          />
        </label>
      </div>
      <div>
        <label>
          Activate Extension:
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(e) => setState(prev => ({
              ...prev,
              isActive: e.target.checked
            }))}
          />
        </label>
      </div>
      <button onClick={saveSettings}>Save Settings</button>
      <button 
        onClick={summarizeText} 
        disabled={!state.isActive || state.isLoading}
      >
        {state.isLoading ? "Summarizing..." : "Summarize Selected Text"}
      </button>
      {state.error && <div className="error">{state.error}</div>}
      {state.summary && (
        <div>
          <h3>Summary:</h3>
          <p>{state.summary}</p>
          <button 
            onClick={speakText}
            disabled={!state.elevenLabsApiKey || state.isPlayingAudio}
          >
            {state.isPlayingAudio ? "Playing..." : "🔊 Speak"}
          </button>
        </div>
      )}
    </div>
  );
};

export default App;