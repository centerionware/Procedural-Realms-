export class AudioManager {
    private audioCtx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private musicGain: GainNode | null = null;
    public isInitialized = false;
    private isMuted = false;
    private musicScheduler: number | null = null;
    private musicGeneration = 0;

    // --- Musical Definitions ---
    private scales = {
        // Semitones relative to root note
        normal: [-12, -9, -7, -5, -2, 0, 3, 5, 7], // A Minor Pentatonic + octaves
        boss: [-12, -10, -8, -7, -5, -4, -1, 0, 2, 4], // C Harmonic Minor + octaves
    };
    private baseNotes = {
        normal: 440, // A4
        boss: 523.25, // C5
    };
    private chordProgressions = {
        // Semitones relative to root note
        normal: [0, -2, 3, -4], // Am, G, C, F
        boss: [0, -5, -4, -8], // Cm, G, Ab, Eb
    };

    constructor() {
        // AudioContext can only be created after a user gesture.
    }

    public initialize() {
        if (this.isInitialized || typeof window === 'undefined') return;
        
        try {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioCtx.createGain();
            this.musicGain = this.audioCtx.createGain();
            
            this.musicGain.connect(this.masterGain);
            this.masterGain.connect(this.audioCtx.destination);
            
            this.isInitialized = true;
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
        }
    }

    public toggleMute(muteState: boolean) {
        this.isMuted = muteState;
        if (!this.isInitialized || !this.masterGain || !this.audioCtx) return;
        
        this.masterGain.gain.exponentialRampToValueAtTime(
            this.isMuted ? 0.0001 : 1.0, 
            this.audioCtx.currentTime + 0.1
        );
    }

    private playNote(
        frequency: number, 
        startTime: number, 
        duration: number, 
        waveform: OscillatorType, 
        volume: number,
        destination: AudioNode,
        pitchBend = 0
    ) {
        if (!this.audioCtx) return;

        const oscillator = this.audioCtx.createOscillator();
        oscillator.type = waveform;
        oscillator.frequency.setValueAtTime(frequency, startTime);
        if (pitchBend !== 0) {
            oscillator.frequency.exponentialRampToValueAtTime(frequency + pitchBend, startTime + duration);
        }

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01); // Quick attack
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // Linear decay

        oscillator.connect(gainNode);
        gainNode.connect(destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    private playKick(time: number, destination: AudioNode) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    private playNoise(time: number, volume: number, duration: number, filterFreq: number, destination: AudioNode) {
        if (!this.audioCtx) return;
        const noise = this.audioCtx.createBufferSource();
        const bufferSize = this.audioCtx.sampleRate;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;

        const noiseFilter = this.audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = filterFreq;
        noise.connect(noiseFilter);

        const noiseEnvelope = this.audioCtx.createGain();
        noiseFilter.connect(noiseEnvelope);
        noiseEnvelope.connect(destination);

        noiseEnvelope.gain.setValueAtTime(volume, time);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + duration);
        noise.start(time);
        noise.stop(time + duration);
    }

    public playSound(type: 'playerHit' | 'enemyHit' | 'pickup' | 'defeat') {
        if (!this.isInitialized || !this.audioCtx || !this.masterGain) return;
        const now = this.audioCtx.currentTime;

        switch (type) {
            case 'playerHit':
                this.playNote(120, now, 0.2, 'sawtooth', 0.4, this.masterGain, -40);
                break;
            case 'enemyHit':
                this.playNote(250, now, 0.15, 'square', 0.3, this.masterGain);
                break;
            case 'pickup':
                this.playNote(523.25, now, 0.1, 'triangle', 0.4, this.masterGain); // C5
                this.playNote(659.25, now + 0.1, 0.1, 'triangle', 0.4, this.masterGain); // E5
                this.playNote(783.99, now + 0.2, 0.15, 'triangle', 0.4, this.masterGain); // G5
                break;
            case 'defeat':
                this.playNote(150, now, 0.5, 'sawtooth', 0.5, this.masterGain, -100);
                break;
        }
    }

    public startMusic(mapKey: string, fadeInDurationMs = 0) {
        // Stop any existing music scheduler and invalidate the previous generation.
        if (this.musicScheduler) {
            clearTimeout(this.musicScheduler);
            this.musicScheduler = null;
        }
        this.musicGeneration++;

        if (!this.isInitialized || !this.audioCtx || !this.masterGain) return;
        
        // The key fix: create a new gain node for the new music.
        // The old musicGain node is now orphaned. Any scheduled fade-out from a transition
        // will continue on it, but since new music uses a new node, there's no conflict.
        this.musicGain = this.audioCtx.createGain();
        this.musicGain.connect(this.masterGain);
        
        // Schedule the fade-in for the new music track.
        this.musicGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
        if (fadeInDurationMs > 0) {
            this.musicGain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
            this.musicGain.gain.exponentialRampToValueAtTime(1.0, this.audioCtx.currentTime + fadeInDurationMs / 1000);
        } else {
            this.musicGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
        }

        const isBossMap = mapKey === '10,10';
        const tempo = isBossMap ? 140 : 110;
        const secondsPerBeat = 60.0 / tempo;
        const beatsPerPhrase = 16;
        const notesPerChord = 4;
        
        let nextPhraseTime = this.audioCtx.currentTime;

        const scale = isBossMap ? this.scales.boss : this.scales.normal;
        const baseNote = isBossMap ? this.baseNotes.boss : this.baseNotes.normal;
        const progression = isBossMap ? this.chordProgressions.boss : this.chordProgressions.normal;
        
        const thisGeneration = this.musicGeneration;

        let lastMelodyNoteIndex = Math.floor(scale.length / 2); // Start in the middle of the scale

        const generatePhrase = () => {
            const phrase: { time: number, type: 'melody' | 'bass' | 'kick' | 'snare' | 'hat', pitch?: number, duration: number }[] = [];
            let phraseTime = 0;
            for (let beat = 0; beat < beatsPerPhrase; beat++) {
                const time = phraseTime;
                
                const chordIndex = Math.floor(beat / notesPerChord) % progression.length;
                const bassNote = progression[chordIndex];
                if (beat % notesPerChord === 0) {
                    phrase.push({ time, type: 'bass', pitch: bassNote, duration: secondsPerBeat * 1.5 });
                }

                if (beat % 4 === 0) phrase.push({ time, type: 'kick', duration: secondsPerBeat });
                if (beat % 4 === 2) phrase.push({ time, type: 'snare', duration: secondsPerBeat });
                phrase.push({ time: time + secondsPerBeat / 2, type: 'hat', duration: secondsPerBeat / 2 });

                if (Math.random() > 0.3 || beat % 8 === 0) {
                    const isRest = Math.random() < 0.15 && beat % 8 !== 0;
                    if(!isRest) {
                        const stepChoices = [-2, -1, -1, 1, 1, 1, 2, 3, -3];
                        const step = stepChoices[Math.floor(Math.random() * stepChoices.length)];
                        lastMelodyNoteIndex = Math.max(0, Math.min(scale.length - 1, lastMelodyNoteIndex + step));
                        const noteDuration = (Math.random() > 0.7 ? 1.5 : 0.75) * secondsPerBeat;
                        phrase.push({ time, type: 'melody', pitch: scale[lastMelodyNoteIndex], duration: noteDuration });
                    }
                }
                phraseTime += secondsPerBeat;
            }
            return phrase;
        };

        const scheduler = () => {
            if (this.musicGeneration !== thisGeneration || !this.audioCtx || !this.musicGain) return;

            while (nextPhraseTime < this.audioCtx.currentTime + 1.0) { 
                const currentPhrase = generatePhrase();
                
                for(const note of currentPhrase) {
                    const noteTime = nextPhraseTime + note.time;
                    const semitone = note.pitch ?? 0;
                    const freq = baseNote * Math.pow(2, semitone / 12);
                    
                    switch(note.type) {
                        case 'melody':
                            this.playNote(freq, noteTime, note.duration, 'triangle', 0.15, this.musicGain);
                            break;
                        case 'bass':
                            this.playNote(freq / 2, noteTime, note.duration, 'sine', 0.25, this.musicGain);
                            break;
                        case 'kick':
                            this.playKick(noteTime, this.musicGain);
                            break;
                        case 'snare':
                            this.playNoise(noteTime, 0.4, 0.2, 1000, this.musicGain);
                            break;
                        case 'hat':
                            this.playNoise(noteTime, 0.08, 0.05, 5000, this.musicGain);
                            break;
                    }
                }
                nextPhraseTime += secondsPerBeat * beatsPerPhrase;
            }

            this.musicScheduler = window.setTimeout(scheduler, 50);
        };
        
        scheduler();
    }

    public stopMusic(fadeOutDurationMs = 0) {
        if (this.musicScheduler) {
            clearTimeout(this.musicScheduler);
            this.musicScheduler = null;
        }
        this.musicGeneration++;

        if (!this.audioCtx || !this.musicGain || this.audioCtx.state !== 'running') {
            return; // Can't schedule audio events if context is not running
        }
        
        // Always cancel any pending ramps to avoid conflicts.
        this.musicGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
    
        if (fadeOutDurationMs > 0) {
            // Set the value at current time to start the ramp from where it currently is.
            // This avoids a 'pop' and ensures a smooth start to the fade.
            this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.audioCtx.currentTime);
            this.musicGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + fadeOutDurationMs / 1000);
        } else {
            // If no fade, just set the value to silent immediately.
            this.musicGain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
        }
    }

    /**
     * Gracefully shuts down the audio manager, fading out music and releasing the AudioContext.
     */
    public shutdown(fadeOutDurationMs = 200) {
        if (!this.isInitialized) return;

        this.stopMusic(fadeOutDurationMs);
        
        // After the fadeout, close the context to release system resources.
        setTimeout(() => {
            if (this.audioCtx && this.audioCtx.state !== 'closed') {
                this.audioCtx.close().catch(e => console.error("Failed to close AudioContext", e));
            }
            this.audioCtx = null;
            this.isInitialized = false;
        }, fadeOutDurationMs + 50);
    }
}
