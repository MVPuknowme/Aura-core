(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const speechText = $('speech-text');
  const voiceSelect = $('voice-select');
  const rate = $('rate');
  const rateValue = $('rate-value');
  const ttsStatus = $('tts-status');
  const sttStatus = $('stt-status');
  const transcriptEl = $('transcript');
  const listenButton = $('listen-button');
  const stopListenButton = $('stop-listen-button');

  let voices = [];
  let recognition = null;
  let finalTranscript = '';
  let listening = false;

  function setStatus(target, message) {
    target.textContent = message;
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

  function speak() {
    if (!('speechSynthesis' in window)) return;
    const text = speechText.value.trim();
    if (!text) {
      setStatus(ttsStatus, 'Enter text first');
      speechText.focus();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selected = Number.parseInt(voiceSelect.value, 10);
    if (Number.isInteger(selected) && voices[selected]) utterance.voice = voices[selected];
    utterance.rate = Number(rate.value) || 1;

    utterance.onstart = () => setStatus(ttsStatus, 'Speaking');
    utterance.onpause = () => setStatus(ttsStatus, 'Paused');
    utterance.onresume = () => setStatus(ttsStatus, 'Speaking');
    utterance.onend = () => setStatus(ttsStatus, 'Ready');
    utterance.onerror = (event) => setStatus(ttsStatus, `Speech error: ${event.error || 'unknown'}`);

    window.speechSynthesis.speak(utterance);
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
    if (!recognition || listening) return;
    try {
      recognition.start();
    } catch (error) {
      setStatus(sttStatus, `Could not start: ${error.message}`);
    }
  }

  function stopListening() {
    if (recognition && listening) recognition.stop();
  }

  async function copyTranscript() {
    const text = transcriptEl.textContent.trim();
    if (!text) {
      setStatus(sttStatus, 'Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus(sttStatus, 'Copied');
    } catch {
      setStatus(sttStatus, 'Copy unavailable');
    }
  }

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
  $('clear-button').addEventListener('click', () => {
    finalTranscript = '';
    transcriptEl.textContent = '';
    setStatus(sttStatus, listening ? 'Listening' : 'Idle');
  });
  rate.addEventListener('input', () => {
    rateValue.textContent = `${Number(rate.value).toFixed(1)}×`;
  });

  loadVoices();
  if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = loadVoices;
  setupRecognition();
})();
