// Speech recognition utility

// Add type definitions for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [key: number]: {
      isFinal: boolean;
      [key: number]: {
        transcript: string;
      }
    };
    length: number;
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
}

interface SpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onFinalResult?: (transcript: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Event) => void;
  language?: string;
}

class SpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private finalTranscript: string = '';
  private interimTranscript: string = '';
  private options: SpeechRecognitionOptions;

  constructor(options: SpeechRecognitionOptions = {}) {
    this.options = {
      language: 'en-US',
      ...options
    };

    this.initRecognition();
  }

  private initRecognition() {
    // Check browser support
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    // Create recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configure
    if (this.recognition) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.options.language || 'en-US';

      // Set up event handlers
      this.recognition.onstart = (event: Event) => {
        this.isListening = true;
        if (this.options.onStart) this.options.onStart();
      };

      this.recognition.onend = (event: Event) => {
        this.isListening = false;
        if (this.options.onEnd) this.options.onEnd();
      };

      this.recognition.onerror = (event: Event) => {
        if (this.options.onError) this.options.onError(event);
        console.error('Speech recognition error', event);
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('Speech recognition result received', {
          resultIndex: event.resultIndex,
          resultsLength: event.results.length
        });
        
        this.interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const newText = event.results[i][0].transcript;
            console.log(`Final result for segment ${i}:`, newText);
            this.finalTranscript += newText + ' ';
          } else {
            const interimText = event.results[i][0].transcript;
            console.log(`Interim result for segment ${i}:`, interimText);
            this.interimTranscript += interimText;
          }
        }

        // Trim extra spaces
        this.finalTranscript = this.finalTranscript.trim();
        this.interimTranscript = this.interimTranscript.trim();

        // Call the result callback with the current transcript (final + interim)
        const fullTranscript = (this.finalTranscript + ' ' + this.interimTranscript).trim();
        console.log('Current transcript:', {
          final: this.finalTranscript,
          interim: this.interimTranscript,
          full: fullTranscript
        });
        
        if (this.options.onResult) {
          this.options.onResult(fullTranscript, false);
        }

        // Call the final result callback when we have a final result
        if (event.results[event.resultIndex].isFinal) {
          console.log('Final result detected, calling onFinalResult');
          if (this.options.onFinalResult) {
            this.options.onFinalResult(this.finalTranscript);
          }
        }
      };
    }
  }

  start() {
    if (!this.recognition) {
      this.initRecognition();
      if (!this.recognition) {
        console.error('Speech recognition could not be initialized');
        return;
      }
    }

    if (!this.isListening) {
      try {
        console.log('Starting speech recognition...');
        this.recognition.start();
        console.log('Speech recognition started successfully');
        this.isListening = true;
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
        this.isListening = false;
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  }

  reset() {
    this.finalTranscript = '';
    this.interimTranscript = '';
  }

  getFinalTranscript(): string {
    return this.finalTranscript;
  }

  getInterimTranscript(): string {
    return this.interimTranscript;
  }

  getCurrentTranscript(): string {
    return (this.finalTranscript + ' ' + this.interimTranscript).trim();
  }

  isRecognitionSupported(): boolean {
    // Check if the browser supports SpeechRecognition or webkitSpeechRecognition
    const hasApi = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    
    // Also check if we're in a secure context (required for some browsers)
    const isSecureContext = window.isSecureContext !== false;
    
    // Check if audio is available
    const hasAudioSupport = navigator.mediaDevices && 
      typeof navigator.mediaDevices.getUserMedia === 'function';
    
    console.log('Speech recognition support check:', {
      hasApi,
      isSecureContext,
      hasAudioSupport
    });
    
    return hasApi && isSecureContext && hasAudioSupport;
  }
}

// Add the missing window.SpeechRecognition type
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default SpeechRecognizer; 