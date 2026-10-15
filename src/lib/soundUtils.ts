// Web Audio API Synthesized Tones & Chimes (Zero external assets, instant, 100% reliable)

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Cute, sparkling chime for Admin Dashboard when a new order arrives!
 * Plays a cheerful 4-note melodic cascade (C6 -> E6 -> G6 -> C7) with sweet harmonic ring.
 */
export function playCuteAdminOrderTone(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 1046.50, delay: 0.00, duration: 0.25, gain: 0.25 }, // C6
      { freq: 1318.51, delay: 0.08, duration: 0.25, gain: 0.28 }, // E6
      { freq: 1567.98, delay: 0.16, duration: 0.30, gain: 0.30 }, // G6
      { freq: 2093.00, delay: 0.24, duration: 0.60, gain: 0.35 }, // C7 (sparkle finish)
    ];

    const now = ctx.currentTime;

    notes.forEach(({ freq, delay, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Soft sparkling bell timbre
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      // Subtle overtone shimmer
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, now + delay);

      gainNode.gain.setValueAtTime(0.001, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      overtoneGain.gain.setValueAtTime(0.001, now + delay);
      overtoneGain.gain.exponentialRampToValueAtTime(gain * 0.15, now + delay + 0.02);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration * 0.5);

      osc.connect(gainNode);
      overtone.connect(overtoneGain);
      gainNode.connect(ctx.destination);
      overtoneGain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + duration);
      overtone.start(now + delay);
      overtone.stop(now + delay + duration * 0.5);
    });
  } catch (err) {
    console.warn('Could not play admin order chime:', err);
  }
}

/**
 * Joyful celebratory tone & vibe when a customer successfully completes an order!
 * Plays a warm harmonic chord + triggers mobile haptic vibration.
 */
export function playOrderSuccessVibe(): void {
  try {
    // 1. Mobile haptic vibration vibe
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([40, 60, 100]);
    }

    // 2. Celebratory musical chord chime
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chordNotes = [
      { freq: 698.46, delay: 0.00, dur: 0.45, vol: 0.20 }, // F5
      { freq: 880.00, delay: 0.06, dur: 0.50, vol: 0.22 }, // A5
      { freq: 1046.50, delay: 0.12, dur: 0.60, vol: 0.25 }, // C6
      { freq: 1396.91, delay: 0.18, dur: 0.85, vol: 0.28 }, // F6 (warm high peak)
    ];

    chordNotes.forEach(({ freq, delay, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.exponentialRampToValueAtTime(vol, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });
  } catch (err) {
    console.warn('Could not play order success vibe:', err);
  }
}
