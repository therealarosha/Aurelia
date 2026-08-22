function beep(frequency, duration, volume = 0.05) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, duration);
  } catch {}
}
export const soundSuccess = () => { beep(880, 90); setTimeout(() => beep(1175, 120), 100); };
export const soundWarning = () => beep(520, 180);
export const soundError = () => beep(220, 250);
