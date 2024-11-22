

import { useState, useEffect } from 'react';
import Groq from 'groq-sdk';


const App = () => {
  const [state, setState] = useState({
    apiKey: "",
    systemPrompt: "",
    isActive: false,
    summary: "",
    isLoading: false,
    error: null as string | null
  });
  // const groq = new Groq({
  //   apiKey: import.meta.env.VITE_REACT_APP_GROQ_API_KEY,
  //   dangerouslyAllowBrowser: true,
  // });

  useEffect(() => {
    // Load stored settings safely
    
    try {
     
      chrome.storage.sync.get(
        ["apiKey", "systemPrompt", "isActive"], 
        (data) => {
          setState(prev => ({
            ...prev,
            apiKey: data.apiKey || "",
            systemPrompt: data.systemPrompt || "",
            isActive: !!data.isActive
          }));
        }
      );
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }, []);

  const saveSettings = async () => {
    try {
      await chrome.storage.sync.set({
        apiKey: state.apiKey,
        systemPrompt: state.systemPrompt,
        isActive: state.isActive
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
          API Key:
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
        </div>
      )}
    </div>
  );
};

export default App;