const slashAudio = new Audio('/slash.mp3');
slashAudio.preload = 'auto';
slashAudio.load();

export const playSlashSound = () => {
  const sound = slashAudio.cloneNode() as HTMLAudioElement;
  sound.volume = 0.5;
  sound.play().catch((e) => console.warn('Audio play failed', e));
};
