// Sound, all synthesized with WebAudio — no audio files. A tiny engine hum whose
// pitch follows speed, a two-tone police siren, and one-shot blips/thuds/shots.
export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenTimer: 0,
    muted: false,
    enabled: false,
  };

  audio.init = () => {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
      // Engine hum: sawtooth through a lowpass, pitch driven by update().
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      const engineFilter = audio.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      audio.engineOsc.connect(engineFilter);
      engineFilter.connect(audio.engineGain);
      audio.engineGain.connect(audio.master);
      audio.engineOsc.start();
      // Police siren: triangle wave alternating two tones.
      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenOsc.type = 'triangle';
      audio.sirenOsc.frequency.value = 700;
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenGain.gain.value = 0;
      audio.sirenOsc.connect(audio.sirenGain);
      audio.sirenGain.connect(audio.master);
      audio.sirenOsc.start();
      audio.enabled = true;
    } catch {
      audio.enabled = false;
    }
  };

  function tone(freq, dur, type, vol, slideTo) {
    if (!audio.enabled || audio.muted) return;
    try {
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, audio.ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, audio.ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.2, audio.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start();
      osc.stop(audio.ctx.currentTime + dur + 0.02);
    } catch {
      /* audio is best-effort */
    }
  }

  function noise(dur, vol, lowpass) {
    if (!audio.enabled || audio.muted) return;
    try {
      const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
      const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audio.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      const gain = audio.ctx.createGain();
      gain.gain.value = vol || 0.3;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(audio.master);
      src.start();
    } catch {
      /* audio is best-effort */
    }
  }

  audio.blip = () => tone(880, 0.12, 'sine', 0.22, 1320);
  audio.pickup = () => {
    tone(660, 0.1, 'sine', 0.2);
    setTimeout(() => tone(990, 0.14, 'sine', 0.2), 70);
  };
  audio.cash = () => {
    tone(1046, 0.09, 'triangle', 0.22);
    setTimeout(() => tone(1318, 0.16, 'triangle', 0.22), 80);
  };
  audio.punch = () => noise(0.12, 0.4, 500);
  audio.shot = () => noise(0.16, 0.5, 2600);
  audio.crash = () => noise(0.25, 0.45, 800);
  audio.busted = () => {
    tone(220, 0.5, 'sawtooth', 0.2, 110);
  };
  audio.missionDone = () => {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.22), i * 110));
  };
  audio.missionStart = () => {
    tone(392, 0.15, 'triangle', 0.2);
    setTimeout(() => tone(523, 0.2, 'triangle', 0.2), 120);
  };
  audio.horn = () => tone(370, 0.18, 'square', 0.1, 330);

  // Called every frame: engine pitch follows speed, siren wails while wanted.
  audio.update = (dt, speedRatio, wanted) => {
    if (!audio.enabled) return;
    try {
      if (audio.engineGain) {
        const target = speedRatio > 0.02 ? 0.05 + speedRatio * 0.09 : 0;
        audio.engineGain.gain.setTargetAtTime(audio.muted ? 0 : target, audio.ctx.currentTime, 0.1);
        audio.engineOsc.frequency.setTargetAtTime(55 + speedRatio * 165, audio.ctx.currentTime, 0.08);
      }
      if (audio.sirenGain) {
        if (wanted > 0 && !audio.muted) {
          audio.sirenTimer += dt;
          const high = Math.floor(audio.sirenTimer / 0.45) % 2 === 0;
          audio.sirenOsc.frequency.setTargetAtTime(high ? 950 : 650, audio.ctx.currentTime, 0.05);
          audio.sirenGain.gain.setTargetAtTime(0.045, audio.ctx.currentTime, 0.2);
        } else {
          audio.sirenGain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.2);
        }
      }
    } catch {
      /* audio is best-effort */
    }
  };

  audio.toggleMute = () => {
    audio.muted = !audio.muted;
    return audio.muted;
  };

  return audio;
}
