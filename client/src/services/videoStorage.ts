export class VideoStorageService {
    static checkBrowserCompatibility(): { compatible: boolean; issues: string[] } {
        console.log('🔍 Checking browser compatibility...');
        const issues: string[] = [];

        // Check for MediaRecorder API
        if (!window.MediaRecorder) {
            console.warn('❌ MediaRecorder API not supported');
            issues.push('MediaRecorder API is not supported in this browser');
        }

        // Check for media devices API
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('❌ Media Devices API not supported');
            issues.push('Media Devices API is not supported in this browser');
        }

        // Check for Blob and URL support
        if (!window.Blob || !window.URL || !window.URL.createObjectURL) {
            console.warn('❌ Blob or URL API not supported');
            issues.push('Blob or URL API is not supported in this browser');
        }

        // Check codec support
        const hasVideoSupport = [
            'video/webm',
            'video/webm;codecs=vp8',
            'video/mp4'
        ].some(type => MediaRecorder.isTypeSupported(type));

        if (!hasVideoSupport) {
            console.warn('❌ No supported video formats found');
            issues.push('No supported video format found in this browser');
        }

        const compatible = issues.length === 0;
        console.log('✅ Browser compatibility check complete:', { compatible, issues });
        
        return { compatible, issues };
    }

    static async validateVideo(blob: Blob): Promise<boolean> {
        console.log('🔍 Starting video validation...');
        
        if (!blob) {
            console.error('❌ Video blob is undefined');
            return false;
        }

        console.log('📊 Video details:', {
            size: blob.size,
            type: blob.type,
            lastModified: blob instanceof File ? blob.lastModified : 'N/A'
        });

        if (blob.size === 0) {
            console.error('❌ Video blob is empty');
            return false;
        }

        console.log('✅ Video validation passed');
        return true;
    }

    static async uploadVideo(blob: Blob, fieldname: string, assessmentId: string): Promise<string> {
        console.log('🚀 Starting video upload process...', {
            fieldname,
            assessmentId,
            blobSize: blob.size,
            blobType: blob.type
        });

        try {
            // Create FormData and append the blob
            const formData = new FormData();
            const filename = `${fieldname}-${Date.now()}.webm`;
            formData.append(fieldname, blob, filename);
            formData.append('assessmentId', assessmentId);

            console.log('📦 Prepared FormData for upload:', {
                filename,
                formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
                    key,
                    type: value instanceof Blob ? 'Blob' : 'string',
                    size: value instanceof Blob ? value.size : value.length
                }))
            });

            // Make the upload request
            console.log('📤 Sending upload request...');
            const response = await fetch(`/api/assessments/${assessmentId}/upload-videos`, {
                method: 'POST',
                body: formData
            });

            console.log('📥 Received response:', {
                status: response.status,
                statusText: response.statusText,
                headers: Array.from(response.headers.entries())
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Upload failed:', errorText);
                throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Upload successful, received result:', result);

            const videoUrl = result[`${fieldname}Url`];
            if (!videoUrl) {
                console.error('❌ No video URL in response');
                throw new Error(`Server response missing ${fieldname}Url`);
            }

            console.log('🎉 Upload completed successfully:', videoUrl);
            return videoUrl;

        } catch (error) {
            console.error('❌ Upload error:', error);
            throw new Error(`Failed to upload ${fieldname} video: ${error.message}`);
        }
    }

    static getSupportedMimeType(): string {
        console.log('🔍 Checking supported MIME types...');
        
        const preferredTypes = [
            'video/webm',
            'video/webm;codecs=vp8',
            'video/webm;codecs=vp9',
            'video/mp4'
        ];
        
        for (const type of preferredTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('✅ Found supported MIME type:', type);
                return type;
            }
        }

        console.warn('⚠️ No preferred MIME types supported, falling back to video/webm');
        return 'video/webm';
    }

    static getRecorderOptions(): MediaRecorderOptions {
        const mimeType = this.getSupportedMimeType();
        console.log('🎥 Creating recorder options with MIME type:', mimeType);
        
        return {
            mimeType,
            videoBitsPerSecond: 2500000, // 2.5 Mbps
            audioBitsPerSecond: 128000   // 128 kbps
        };
    }
}