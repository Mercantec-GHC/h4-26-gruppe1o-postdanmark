import { createAudioPlayer } from 'expo-audio';

const honkHonkSound = require('../sound-effects/honk-honk.wav');

export function playSuccessSound(): void {
  try {
    const player = createAudioPlayer(honkHonkSound);
    let removed = false;

    const handleFinish = () => {
      if (!removed) {
        removed = true;
        player.remove();
      }
    };

    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && !status.playing) {
        handleFinish();
      }
    });

    setTimeout(handleFinish, 5000);

    player.play();
  } catch (error) {
    console.warn('Could not play success sound:', error);
  }
}
