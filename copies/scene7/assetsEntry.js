export const assetsEntry = {
  characters: [],
  models: [
    {
      name: "roboticsLab",
      path: "scene77/robotics_lab_v_3.1-opt.glb",
      //   scale: { x: 10, y: 10, z: 10 },
    },
    {
      name: "pin4Female",
      path: "scene77/pin4Female.glb",
      // scale: { x: 10, y: 10, z: 10 },
      scale: { x: 6, y: 6, z: 6 },

      shadow: true,
    },
    {
      name: "pin2Female",
      path: "scene77/pin2Female.glb",
      // scale: { x: 1, y: 1, z: 1 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
    },
    {
      name: "pin3Female",
      path: "scene77/pin3Female.glb",
      // scale: { x: 0.2, y: 0.2, z: 0.2 },
      scale: { x: 0.09, y: 0.09, z: 0.09 },
    },
    {
      name: "assembeldBot",
      path: "scene77/assembeldBot.glb",
      scale: { x: 6, y: 6, z: 6 },
    },
  ],
  textures: [
    {
      name: "indication",
      path: "/scene77/indication3.png",
    },
    {
      name: "indication2",
      path: "/scene77/indication4.png",
    },
  ],
  videoTextures: [],
  audios: Array.from({ length: 51 }, (_, i) => {
    const step = i + 1;
    return {
      name: `step${step}`,
      path: `/scene77/botBuildingAudio/step${step}.wav`,
    };
  }),
  hdris: [
    {
      name: "background",
      path: "/hdris/sky.hdr",
    },
  ],
  cubeMaps: [],
  vfxs: [],
  pathFiles: [],
  jsonFiles: [],
  fonts: [],
  svgs: [],
};
