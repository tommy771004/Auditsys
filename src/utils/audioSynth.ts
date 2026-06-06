// Web Audio Context Synthesizer for Immersive Physical Feedback
let audioCtx: AudioContext | null = null;

// Persistent audio state
let synthEnabled = localStorage.getItem("audio_synth_enabled") === "true";

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export const soundManager = {
  get isEnabled() {
    return synthEnabled;
  },

  set kEnabled(val: boolean) {
    synthEnabled = val;
    localStorage.setItem("audio_synth_enabled", val ? "true" : "false");
  },

  toggle() {
    const next = !synthEnabled;
    this.kEnabled = next;
    if (next) {
      this.play("engine_start");
    }
    return next;
  },

  play(type: "click" | "success" | "warning" | "engine_start" | "dial" | "pge_debate" | "scan_pulse" | "type_key") {
    if (!synthEnabled) return;

    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // 1. CLICK
      if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

        gain.gain.setValueAtTime(0.012, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.start(now);
        osc.stop(now + 0.06);
      }

      // 2. DIAL
      else if (type === "dial") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "triangle";
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
      }

      // 3. SUCCESS (Positive Chord Arpeggio)
      else if (type === "success") {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);

          noteOsc.type = "sine";
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.07);

          noteGain.gain.setValueAtTime(0, now);
          noteGain.gain.linearRampToValueAtTime(0.02, now + idx * 0.07 + 0.01);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);

          noteOsc.start(now + idx * 0.07);
          noteOsc.stop(now + idx * 0.07 + 0.28);
        });
      }

      // 4. WARNING
      else if (type === "warning") {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.type = "sawtooth";
        osc2.type = "sine";

        osc1.frequency.setValueAtTime(160, now);
        osc1.frequency.linearRampToValueAtTime(110, now + 0.24);

        osc2.frequency.setValueAtTime(165, now);
        osc2.frequency.linearRampToValueAtTime(112, now + 0.24);

        gain.gain.setValueAtTime(0.022, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
      }

      // 5. ENGINE START (Power sweep)
      else if (type === "engine_start") {
        const osc = ctx.createOscillator();
        const fm = ctx.createOscillator();
        const fmGain = ctx.createGain();
        const gain = ctx.createGain();

        osc.connect(gain);
        fmIntake(fm, fmGain, osc);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.5);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.045, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.start(now);
        osc.stop(now + 0.5);
      }

      // 6. PGE DEBATE
      else if (type === "pge_debate") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.07);

        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.start(now);
        osc.stop(now + 0.07);
      }

      // 7. SCAN PULSE (Sonar sweep)
      else if (type === "scan_pulse") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "triangle";
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.4);

        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.start(now);
        osc.stop(now + 0.4);
      }

      // 8. TYPE KEY (Mechanical keyboard click)
      else if (type === "type_key") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Mix frequency ratio for authentic wooden keyboard sound
        osc.type = "sine";
        osc.frequency.setValueAtTime(1800 + Math.random() * 400, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);

        gain.gain.setValueAtTime(0.006, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        osc.start(now);
        osc.stop(now + 0.025);
      }
    } catch (e) {
      console.warn("Auditory transducer failed initialization on cold boot:", e);
    }
  }
};

function fmIntake(fm: OscillatorNode, fmGain: GainNode, carrier: OscillatorNode) {
  fm.frequency.value = 12;
  fmGain.gain.value = 40;
  fm.connect(fmGain);
  fmGain.connect(carrier.frequency);
  fm.start();
  fm.stop(window.AudioContext ? 0.6 : 0);
}
