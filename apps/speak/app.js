(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const speechText = $('speech-text');
  const voiceSelect = $('voice-select');
  const rate = $('rate');
  const rateValue = $('rate-value');
  const ttsStatus = $('tts-status');
  const sttStatus = $('stt-status');
  const commandStatus = $('command-status');
  const transcriptEl = $('transcript');
  const listenButton = $('listen-button');
  const stopListenButton = $('stop-listen-button');
  const thoughtToggle = $('thought-toggle');
  const thoughtState = $('thought-state');
  const actionButton = $('action-button');

  let voices = [];
  let recognition = null;
  let finalTranscript = '';
  let listening = false;
  let thoughtCommandEnabled = false;

  function setStatus(target, message) {
    target.textContent = message;
  }

  function setThoughtCommand(enabled) {
    thoughtCommandEnabled = Boolean(enabled);
    thoughtToggle.setAttribute('aria-checked', String(thoughtCommandEnabled));
    thoughtToggle.classList.toggle('active', thoughtCommandEnabled);
    thoughtState.textContent = thoughtCommandEnabled ? 'ON' : 'OFF';
    setStatus(commandStatus, thoughtCommandEnabled ? 'Command mode' : 'Manual');
  }

  function loadVoices() {
    if (!('speechSynthesis' in window)) {
      voiceSelect.innerHTML = '<option>Speech synthesis unavailable</option>';
      voiceSelect.disabled = true;
      setStatus(ttsStatus, 'Unsupported');
      return;
    }

    voices = window.speechSynthesis.getVoices();
    voiceSelect.replaceChildren();

    if (!voices.length) {
      const option = document.createElement('option');
      option.textContent = 'Default system voice';
      option.value = '';
      voiceSelect.appendChild(option);
      return;
    }

    voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${voice.name} · ${voice.lang}${voice.default ? ' · default' : ''}`;
      voiceSelect.appendChild(option);
    });
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) return false;
    const cleanText = String(text || '').trim();
    if (!cleanText) {
      setStatus(ttsStatus, 'Enter text first');
      speechText.focus();
      return false;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const selected = Number.parseInt(voiceSelect.value, 10);
    if (Number.isInteger(selected) && voices[selected]) utterance.voice = voices[selected];
    utterance.rate = Number(rate.value) || 1;

    utterance.onstart = () => setStatus(ttsStatus, 'Speaking');
    utterance.onpause = () => setStatus(ttsStatus, 'Paused');
    utterance.onresume = () => setStatus(ttsStatus, 'Speaking');
    utterance.onend = () => setStatus(ttsStatus, 'Ready');
    utterance.onerror = (event) => setStatus(ttsStatus, `Speech error: ${event.error || 'unknown'}`);

    window.speechSynthesis.speak(utterance);
    return true;
  }

  function speak() {
    return speakText(speechText.value);
  }

  function stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setStatus(ttsStatus, 'Stopped');
  }

  function setupRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      listenButton.disabled = true;
      stopListenButton.disabled = true;
      setStatus(sttStatus, 'Not supported by this browser');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = () => {
      listening = true;
      listenButton.disabled = true;
      stopListenButton.disabled = false;
      setStatus(sttStatus, 'Listening');
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += `${text.trim()} `;
        } else {
          interim += text;
        }
      }
      transcriptEl.textContent = `${finalTranscript}${interim}`.trim();
    };

    recognition.onerror = (event) => {
      setStatus(sttStatus, `Mic error: ${event.error || 'unknown'}`);
    };

    recognition.onend = () => {
      listening = false;
      listenButton.disabled = false;
      stopListenButton.disabled = true;
      if (!sttStatus.textContent.startsWith('Mic error')) setStatus(sttStatus, 'Idle');
    };
  }

  function startListening() {
    if (!recognition || listening) return false;
    try {
      recognition.start();
      return true;
    } catch (error) {
      setStatus(sttStatus, `Could not start: ${error.message}`);
      return false;
    }
  }

  function stopListening() {
    if (recognition && listening) recognition.stop();
  }

  function clearTranscript() {
    finalTranscript = '';
    transcriptEl.textContent = '';
    setStatus(sttStatus, listening ? 'Listening' : 'Idle');
  }

  async function copyTranscript() {
    const text = transcriptEl.textContent.trim();
    if (!text) {
      setStatus(sttStatus, 'Nothing to copy');
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus(sttStatus, 'Copied');
      return true;
    } catch {
      setStatus(sttStatus, 'Copy unavailable');
      return false;
    }
  }

  function commandInput() {
    const typed = speechText.value.trim();
    const transcribed = transcriptEl.textContent.trim();
    return typed || transcribed;
  }

  function normalizeCommand(value) {
    return value.trim().toLowerCase().replace(/[.!?]+$/g, '').trim();
  }

  async function runExplicitCommand(value) {
    const raw = String(value || '').trim();
    const command = normalizeCommand(raw);

    if (!command) {
      setStatus(commandStatus, 'Enter a command');
      return;
    }

    if (command.startsWith('speak ')) {
      const payload = raw.slice(raw.toLowerCase().indexOf('speak ') + 6).trim();
      if (payload && speakText(payload)) setStatus(commandStatus, 'Action: speak');
      return;
    }

    switch (command) {
      case 'speak': {
        const transcript = transcriptEl.textContent.trim();
        if (transcript && speakText(transcript)) setStatus(commandStatus, 'Action: speak transcript');
        else setStatus(commandStatus, 'Use “speak <text>”');
        break;
      }
      case 'listen':
        if (startListening()) setStatus(commandStatus, 'Action: listen');
        else setStatus(commandStatus, 'Listen unavailable');
        break;
      case 'stop':
        stopListening();
        stopSpeech();
        setStatus(commandStatus, 'Action: stop');
        break;
      case 'pause':
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          setStatus(commandStatus, 'Action: pause');
        } else setStatus(commandStatus, 'Nothing speaking');
        break;
      case 'resume':
        if ('speechSynthesis' in window && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setStatus(commandStatus, 'Action: resume');
        } else setStatus(commandStatus, 'Nothing paused');
        break;
      case 'clear':
        clearTranscript();
        setStatus(commandStatus, 'Action: clear');
        break;
      case 'copy':
        if (await copyTranscript()) setStatus(commandStatus, 'Action: copy');
        else setStatus(commandStatus, 'Copy unavailable');
        break;
      default:
        setStatus(commandStatus, 'Command not allowed');
    }
  }

  async function runAction() {
    actionButton.classList.add('pressed');
    window.setTimeout(() => actionButton.classList.remove('pressed'), 160);

    if (!thoughtCommandEnabled) {
      if (speak()) setStatus(commandStatus, 'Action: speak');
      return;
    }

    await runExplicitCommand(commandInput());
  }

  thoughtToggle.addEventListener('click', () => setThoughtCommand(!thoughtCommandEnabled));
  actionButton.addEventListener('click', runAction);
  $('speak-button').addEventListener('click', speak);
  $('pause-button').addEventListener('click', () => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) window.speechSynthesis.pause();
  });
  $('resume-button').addEventListener('click', () => {
    if ('speechSynthesis' in window && window.speechSynthesis.paused) window.speechSynthesis.resume();
  });
  $('stop-button').addEventListener('click', stopSpeech);
  listenButton.addEventListener('click', startListening);
  stopListenButton.addEventListener('click', stopListening);
  $('copy-button').addEventListener('click', copyTranscript);
  $('clear-button').addEventListener('click', clearTranscript);
  rate.addEventListener('input', () => {
    rateValue.textContent = `${Number(rate.value).toFixed(1)}×`;
  });

  setThoughtCommand(false);
  loadVoices();
  if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = loadVoices;
  setupRecognition();
})();
