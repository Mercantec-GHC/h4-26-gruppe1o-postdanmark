import { createAudioPlayer } from 'expo-audio';

export function playSoundEffect(soundSource: number): void {
  try {
    const player = createAudioPlayer(soundSource);
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
    console.warn('Could not play sound effect:', error);
  }
}
