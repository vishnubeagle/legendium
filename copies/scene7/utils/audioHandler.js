export function AudioHandler(audio) {
  return new Promise((resolve, reject) => {
    audio.stop();
    audio.offset = 0;

    audio.play();

    const onEnded = () => {
      audio.source.removeEventListener("ended", onEnded);
      resolve();
    };
    audio.source.addEventListener("ended", onEnded);
  });
}
export function isAudioPlaying(audio) {
  if (!audio) return false;
  return audio.isPlaying === true;
}
