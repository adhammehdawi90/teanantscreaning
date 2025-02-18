export class VideoRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.isStreamActive = false;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.onError = null;
        this.recoveryTimeout = null;
        this.dataAvailableHandler = this.handleDataAvailable.bind(this);
        this.chunkSize = 0;
        this.lastChunkTime = Date.now();
    }

    async startRecording() {
        try {
            this.recordedChunks = [];
            await this.initializeStream();
            await this.initializeMediaRecorder();
        } catch (error) {
            this.handleError(error);
        }
    }

    async initializeStream() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });

            this.stream.getTracks().forEach(track => {
                track.onended = () => this.handleTrackEnded(track);
                track.onmute = () => this.handleTrackMuted(track);
                track.onunmute = () => this.handleTrackUnmuted(track);
            });

            if (!this.validateStream()) {
                throw new Error('Stream validation failed');
            }

            this.isStreamActive = true;
            this.retryAttempts = 0;
        } catch (error) {
            throw new Error(`Failed to initialize stream: ${error.message}`);
        }
    }

    handleDataAvailable(event) {
        if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
            this.chunkSize += event.data.size;
            this.lastChunkTime = Date.now();
            console.log(`Chunk received: ${event.data.size} bytes, total: ${this.chunkSize} bytes`);
        }
    }

    async initializeMediaRecorder() {
        try {
            const options = {
                mimeType: 'video/webm;codecs=vp8,opus',
                videoBitsPerSecond: 2500000, // 2.5 Mbps
                audioBitsPerSecond: 128000   // 128 kbps
            };

            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.mediaRecorder.ondataavailable = this.dataAvailableHandler;
            this.mediaRecorder.onerror = this.handleRecordingError.bind(this);
            
            // Start with smaller timeslice for more frequent chunks
            this.mediaRecorder.start(100);
            
            // Monitor chunk reception
            this.startChunkMonitoring();
        } catch (error) {
            throw new Error(`Failed to initialize MediaRecorder: ${error.message}`);
        }
    }

    startChunkMonitoring() {
        this.chunkMonitorInterval = setInterval(() => {
            const now = Date.now();
            if (this.isRecording() && (now - this.lastChunkTime) > 5000) {
                console.warn('No chunks received for 5 seconds, attempting recovery...');
                this.attemptRecovery();
            }
        }, 1000);
    }

    handleTrackEnded(track) {
        console.warn(`Track ended: ${track.kind}`);
        this.attemptRecovery();
    }

    handleTrackMuted(track) {
        console.warn(`Track muted: ${track.kind}`);
        this.attemptRecovery();
    }

    handleTrackUnmuted(track) {
        console.log(`Track unmuted: ${track.kind}`);
    }

    async attemptRecovery() {
        if (this.retryAttempts >= this.maxRetries) {
            this.handleError(new Error('Max retry attempts reached'));
            return;
        }

        if (this.recoveryTimeout) {
            clearTimeout(this.recoveryTimeout);
        }

        this.recoveryTimeout = setTimeout(async () => {
            try {
                this.retryAttempts++;
                console.log(`Attempting recovery - attempt ${this.retryAttempts}`);
                
                // Stop current recorder and stream
                this.cleanup(false);
                
                // Reinitialize
                await this.initializeStream();
                await this.initializeMediaRecorder();
            } catch (error) {
                this.handleError(error);
            }
        }, 1000);
    }

    handleError(error) {
        console.error('VideoRecorder error:', error);
        this.cleanup();
        
        if (this.onError) {
            this.onError(error);
        }
    }

    handleRecordingError(event) {
        const error = event.error || new Error('Unknown recording error');
        
        if (error.name === 'InvalidModificationError') {
            this.attemptRecovery();
        } else {
            this.handleError(error);
        }
    }

    stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                reject(new Error('No active recording'));
                return;
            }

            const finalizeRecording = () => {
                try {
                    if (this.recordedChunks.length === 0) {
                        throw new Error('No recording data available');
                    }

                    const totalSize = this.recordedChunks.reduce((acc, chunk) => acc + chunk.size, 0);
                    if (totalSize === 0) {
                        throw new Error('Recording data is empty');
                    }

                    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                    this.cleanup();
                    resolve(blob);
                } catch (error) {
                    this.cleanup();
                    reject(error);
                }
            };

            this.mediaRecorder.onstop = finalizeRecording;

            try {
                this.mediaRecorder.stop();
            } catch (error) {
                this.cleanup();
                reject(error);
            }
        });
    }

    validateStream() {
        if (!this.stream || this.stream.getTracks().length === 0) {
            return false;
        }
        return this.stream.getTracks().every(track => track.readyState === 'live');
    }

    cleanup(complete = true) {
        if (this.chunkMonitorInterval) {
            clearInterval(this.chunkMonitorInterval);
            this.chunkMonitorInterval = null;
        }

        if (this.recoveryTimeout) {
            clearTimeout(this.recoveryTimeout);
            this.recoveryTimeout = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.warn('Error stopping track:', e);
                }
            });
        }

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try {
                this.mediaRecorder.stop();
            } catch (e) {
                console.warn('Error stopping MediaRecorder:', e);
            }
        }

        if (complete) {
            this.isStreamActive = false;
            this.mediaRecorder = null;
            this.stream = null;
            this.recordedChunks = [];
            this.retryAttempts = 0;
            this.chunkSize = 0;
            this.lastChunkTime = 0;
        }
    }

    isRecording() {
        return this.mediaRecorder !== null && 
               this.mediaRecorder.state !== 'inactive' && 
               this.isStreamActive;
    }
}
