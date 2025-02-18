export class MediaRecorderUtil {
    private mediaRecorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private retryAttempts = 3;
    private retryDelay = 1000; // 1 second

    async initializeRecorder(stream: MediaStream): Promise<void> {
        try {
            if (!stream.active) {
                throw new Error('Stream is not active');
            }

            // Verify tracks are available
            if (stream.getTracks().length === 0) {
                throw new Error('No tracks available in the stream');
            }

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp8,opus'
            });

            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize MediaRecorder:', error);
            throw error;
        }
    }

    private setupEventListeners(): void {
        if (!this.mediaRecorder) return;

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.chunks.push(event.data);
            }
        };

        this.mediaRecorder.onerror = async (error) => {
            console.error('MediaRecorder error:', error);
            if (this.retryAttempts > 0) {
                this.retryAttempts--;
                await this.retryRecording();
            }
        };
    }

    private async retryRecording(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        try {
            this.stopRecording();
            await this.startRecording();
        } catch (error) {
            console.error('Retry failed:', error);
        }
    }

    async startRecording(): Promise<void> {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            try {
                this.mediaRecorder?.start();
                console.log('Recording started');
            } catch (error) {
                console.error('Failed to start recording:', error);
                throw error;
            }
        }
    }

    stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('MediaRecorder not initialized'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: 'video/webm' });
                this.chunks = [];
                resolve(blob);
            };

            try {
                this.mediaRecorder.stop();
            } catch (error) {
                reject(error);
            }
        });
    }

    isRecording(): boolean {
        return this.mediaRecorder?.state === 'recording';
    }

    cleanup(): void {
        this.mediaRecorder = null;
        this.chunks = [];
    }
}
