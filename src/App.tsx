import { useState, useEffect } from 'react';
import Groq from 'groq-sdk';

const App = () => {
  const [state, setState] = useState({
    apiKey: "", // Stores Groq API Key
    systemPrompt: "", // Custom prompt provided by the user
    isActive: false, // Toggle for activation
    summary: "", // Holds the generated summary
    isLoading: false, // Indicates if summarization is in progress
    error: null as string | null, // Stores error messages
    elevenLabsApiKey: "", // Stores ElevenLabs API Key
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Default voice ID for ElevenLabs
    isPlayingAudio: false, // Flag to indicate if audio is playing
    currentView: 'main', // Controls the current app view: 'main', 'settings', or 'help'
    audioPlayer: null as HTMLAudioElement | null, // Stores audio player instance
    isPaused: false, // Flag for audio playback pause
    success: null as string | null, // Stores success messages
  });


  // Function to synthesize text-to-speech using ElevenLabs API
  const speakText = async () => {
    if (!state.summary || !state.elevenLabsApiKey) return;
    
    try {
      setState(prev => ({ ...prev, isPlayingAudio: true }));
      
      // getting the audio from the ElevenLabs API
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
            model_id: "eleven_turbo_v2_5",
            language_code: "hi",
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
  
      // Create an audio element and play the audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setState(prev => ({ 
          ...prev, 
          isPlayingAudio: false,
          isPaused: false,
          audioPlayer: null 
        }));
        URL.revokeObjectURL(audioUrl);
      };
  
      // Store the audio player instance
      setState(prev => ({ ...prev, audioPlayer: audio }));
      audio.play();
  
    } catch (err) {
      // Handle errors
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to play audio",
        isPlayingAudio: false
      }));
    }
  };
  
  // Toggles audio playback between play and pause
  const togglePlayPause = () => {
    // Check if audio player is available
    if (state.audioPlayer) {
      if (state.isPaused) {
        state.audioPlayer.play();
      } else {
        state.audioPlayer.pause();
      }
      setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    }
  };

  // Loading settings from Chrome storage on component mount
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

  // Saves settings to Chrome storage
  const saveSettings = async () => {
    try {
      // Validate both API keys are present
      if (!state.apiKey || !state.elevenLabsApiKey) {
        setState(prev => ({ 
          ...prev, 
          success: null,
          error: "Both API keys are required" 
        }));
        // return; // Return early instead of throwing
      }
  
      await chrome.storage.sync.set({
        apiKey: state.apiKey,
        systemPrompt: state.systemPrompt,
        isActive: state.isActive,
        elevenLabsApiKey: state.elevenLabsApiKey,
        voiceId: state.voiceId
      });
  
      setState(prev => ({ 
        ...prev, 
        error: null,
        success: "Settings saved successfully!" 
      }));
  
      // Clear success message after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, success: null }));
        if (areApiKeysSet()) {
          setState(prev => ({ ...prev, currentView: 'main' }));
        }
      }, 3000);
  
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        success: null,
        error: "Failed to save settings" 
      }));
    }
  };
  // Modify summarizeText function to remove alert
  const summarizeText = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const selectedText = await getSelectedText();
      if (!selectedText) {
        throw new Error("Please select some text first");
      }
      if (!state.apiKey) {
        throw new Error("API key is required");
      }
  
       // Create Groq client with user's API key
       const groq = new Groq({
        apiKey: state.apiKey,
        dangerouslyAllowBrowser: true,
      });

      // Create a chat completion to summarize the selected text
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
      console.error("Failed to summarize text:");
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : "unknowen error occured during summarization",
        isLoading: false,
      }));
    }
  };

  

  // Function to get selected text from the active tab
  const getSelectedText = async () => {
    try {
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


  // Function to check if both API keys are set
  const areApiKeysSet = () => {
    return state.apiKey && state.elevenLabsApiKey;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex justify-center items-center">
      
      <div className="w-full max-w-[400px] bg-white rounded-lg shadow-lg p-6 relative">
        {/* Icons Header */}
        <div className="absolute top-4 right-4 flex gap-4">
          <div className="text-center">
            <button 
              onClick={() => setState(prev => ({ ...prev, currentView: 'settings' }))}
              className="text-gray-600 hover:text-gray-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-500"
              aria-label="Open Settings"
            >
              ⚙️
              <div className="text-xs mt-1">Settings</div>
            </button>
          </div>
          <div className="text-center">
            <button 
              onClick={() => setState(prev => ({ ...prev, currentView: 'help' }))}
              className="text-gray-600 hover:text-gray-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-500"
              aria-label="Open Help"
            >
              ❓
              <div className="text-xs mt-1">Help</div>
            </button>
          </div>
        </div>
  
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center mr-24">ADHD Ally</h1>
  
        {/* Settings View */}
        {state.currentView === 'settings' && (
          <div role="region" aria-label="Settings">
            <div className="mb-4">
              <label htmlFor="groqKey" className="block text-gray-700 font-medium mb-2 text-lg">
                Groq API Key:
              </label>
              <input 
                id="groqKey"
                type="password"
                value={state.apiKey}
                onChange={(e) => setState(prev => ({ ...prev, apiKey: e.target.value }))}
                className="w-full px-4 py-3 text-base border-2 rounded-lg focus:outline-2 focus:outline-offset-2 focus:outline-blue-500"
                aria-required="true"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="elevenLabsKey" className="block text-gray-700 font-medium mb-2 text-lg">
                ElevenLabs API Key:
              </label>
              <input 
                id="elevenLabsKey"
                type="password"
                value={state.elevenLabsApiKey}
                onChange={(e) => setState(prev => ({ ...prev, elevenLabsApiKey: e.target.value }))}
                className="w-full px-4 py-3 text-base border-2 rounded-lg focus:outline-2 focus:outline-offset-2 focus:outline-blue-500"
                aria-required="true"
              />
            </div>
            <button 
              onClick={() => {
                saveSettings();
                if (areApiKeysSet()) {
                  setState(prev => ({ ...prev, currentView: 'main' }));
                }
              }}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 text-lg transition-colors duration-200"
            >
              Save Settings
            </button>
          </div>
        )}
  
        {/* Help View */}
        {state.currentView === 'help' && (
          <div className="space-y-4" role="region" aria-label="Help Information">
            <p className="text-gray-700 text-lg leading-relaxed">
              This extension helps you summarize selected text and convert it to speech.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-lg">To get started:</p>
              <p className="text-base">1. Get your Groq API key from: <a href="https://console.groq.com/keys" >https://console.groq.com/keys</a></p>
              <p className="text-base">2. Get your ElevenLabs API key from: <a href="https://elevenlabs.io/app/settings/api-keys" >https://elevenlabs.io/app/settings/api-keys</a></p>
              <p className="text-base">3. Set API keys in the settings</p>
              <p className="text-base">4. Select some text on a webpage</p>
              <p className="text-base">5. Click the extension icon and give customized prompt in the "How would you like me to help?" field and click summarize</p>
              <p className="text-base">6. Click the "Listen" button to hear the summary, you can pause and play</p>
              <p className="text-base">Note: It may sometimes gives wrong answers</p>
            </div>
            <button 
              onClick={() => setState(prev => ({ ...prev, currentView: 'settings' }))}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 text-lg transition-colors duration-200"
            >
              Go to Settings
            </button>
          </div>
        )}
  
        {/* Main View */}
        {state.currentView === 'main' && areApiKeysSet() && (
          <div role="main">
            <div className="mb-6">
              <label 
                htmlFor="helpPrompt" 
                className="block text-lg font-medium text-gray-800 mb-2"
              >
                How would you like me to help?
              </label>
              <textarea
                id="helpPrompt"
                value={state.systemPrompt}
                onChange={(e) => setState(prev => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="Example: Make it easier to understand"
                className="w-full px-4 py-3 text-base border-2 rounded-lg focus:outline-2 focus:outline-offset-2 focus:outline-blue-500 min-h-[80px]"
                aria-describedby="promptHint"
              />
              <div 
                id="promptHint" 
                className="text-sm text-gray-600 mt-2"
              >
                Try: "Break into smaller parts" or "Explain simply"
              </div>
            </div>
  
            <button 
              onClick={() => summarizeText()}
              disabled={state.isLoading}
              aria-busy={state.isLoading}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 mb-4 text-lg transition-colors duration-200 disabled:opacity-50"
            >
              {state.isLoading ? "Summarizing..." : "Summarize"}
            </button>
  
            {state.summary && (
              <div 
                className="mb-4"
                role="region" 
                aria-label="Summary Result"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Summary:</h3>
                <p className="bg-gray-100 p-4 rounded-lg text-gray-700 text-lg leading-relaxed">
                  {state.summary}
                </p>
                <button 
                  onClick={() => state.audioPlayer ? togglePlayPause() : speakText()}
                  disabled={state.isPlayingAudio && !state.audioPlayer}
                  className="mt-4 w-full px-4 py-3 bg-purple-500 text-white rounded-lg shadow hover:bg-purple-600 text-lg transition-colors duration-200 disabled:opacity-50"
                  aria-label={!state.audioPlayer ? "Listen to summary" : (state.isPaused ? "Resume audio" : "Pause audio")}
                >
                  {!state.audioPlayer ? "🔊 Listen" : (state.isPaused ? "▶️ Resume" : "⏸️ Pause")}
                </button>
              </div>
            )}
  
  {state.success && (
  <div 
    role="status"
    aria-live="polite"
    className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg text-base mb-4"
  >
    {state.success}
  </div>
)}


{state.error && (
  <div 
    role="alert"
    aria-live="assertive"
    className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-base mb-4"
  >
    {state.error}
  </div>
)}
          </div>
        )}
  
        {/* Redirect to Settings if API keys are not set */}
        {state.currentView === 'main' && !areApiKeysSet() && (
          <div className="text-center">
            <p className="text-gray-700 mb-4 text-lg">Please set up your API keys first</p>
            <button 
              onClick={() => setState(prev => ({ ...prev, currentView: 'settings' }))}
              className="px-4 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 text-lg transition-colors duration-200"
            >
              Go to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;