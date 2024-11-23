# ADHD Ally

## Description
<<<<<<< HEAD
ADHD Ally simplifies the process of summarizing selected text on web pages using Groq's language models. Additionally, it includes ElevenLabs' text-to-speech (TTS) integration, allowing users to listen to the summaries in natural-sounding voices. 

This extension is perfect for anyone who needs concise summaries (useful for cognitively disabled students) and text-to-speech functionality for accessibility purposes.
=======
The tool simplifies the process of summarizing selected text on web pages using Groq's language models. Additionally, it includes ElevenLabs' text-to-speech (TTS) integration, allowing users to listen to the summaries in natural-sounding voices. 

This extension is perfect for anyone who needs concise summaries (useful for cognitively disabled students) and text-to-speech functionality for research, or accessibility purposes.
>>>>>>> d98026157e2e165b1ce62a3cb7c09a75d8425ed7

---

## Features
- **Summarize Selected Text**: Highlight text on any web page, and the extension will summarize it using a predefined system prompt.
- **Text-to-Speech (TTS)**: Listen to the summarized text with high-quality voice synthesis from ElevenLabs.
- **Customizable Settings**:
  - Groq API Key input for accessing Groq's summarization models.
  - ElevenLabs API Key input for TTS functionality.
  - System prompt customization for tailored summaries.
  - Toggle to activate or deactivate the extension.

---

## Prerequisites
Before installing and building the extension, ensure you have the following:
- **Google Chrome** or a Chromium-based browser.
<<<<<<< HEAD
- **Groq API Key**: Obtain this from [Groq](https://console.groq.com/keys).
- **ElevenLabs API Key**: Obtain this from [ElevenLabs](https://elevenlabs.io/app/settings/api-keys).
=======
- **Groq API Key**: Obtain this from [Groq](https://groq.com).
- **ElevenLabs API Key**: Obtain this from [ElevenLabs](https://elevenlabs.io).
>>>>>>> d98026157e2e165b1ce62a3cb7c09a75d8425ed7

---

## Installation Guide

### Step 1: Clone the Repository
```bash
git clone https://github.com/julurisaichandu/adhd-ally.git
cd adhd-ally
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: build tool
```bash
npm run build
```

### Step-4 Uploading extension into the Chrome browser
- After building using the step-3, the dist folder will be created in the project root folder
- To load the extension into Chrome, open Chrome and navigate to the Extensions page by typing chrome://extensions into the address bar. 
- Click the "Load unpacked" button and select the dist directory in your project.
- Test your extension by reloading the Extensions page and click on the extension icon.

---
## Technologies/Libraries used
- React.js
- Vite

## Usage Guidelines
The mockup provides all the usage details for the extension. The extension also has help screen which is useful for getting started

## Mockup
Figma link - https://www.figma.com/design/oO5gsvc4rImsqWb8h2DZx9/ADHD-Ally?node-id=1-713&t=0LKCfHK6mMmRECKU-1

### Screenshots for the application available in the mockup-ss folder

### Justification for the design is given in the justification-document.pdf file
### video for the functionality of the app can be found here
- https://drive.google.com/file/d/11J4RXQO4s1dzjTG1fA1C3-JE-_E_roQJ/view?usp=sharing


## Note
- I have used generative AI for generation of some parts of code
- ADHD Ally cannot cannot confirm proper results each and every time. LLMs are prone to hallucination.






