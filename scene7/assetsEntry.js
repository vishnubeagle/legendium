export const assetsEntry = {
  characters: [],
  models: [
    {
      name: "roboticsLab",
      path: "scene77/roboLab.glb",
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
      name: "botMiddleClip",
      path: "/scene77/botBuildingTextures/BD_O5.png",
    },
    {
      name: "expansionBoard",
      path: "/scene77/botBuildingTextures/BOARD1.png",
    },
    {
      name: "buckConverter",
      path: "/scene77/botBuildingTextures/BUCK.png",
    },
    {
      name: "buzzerModule",
      path: "/scene77/botBuildingTextures/BUZZER.png",
    },
    {
      name: "chargingModule",
      path: "/scene77/botBuildingTextures/CG_MODULE.png",
    },
    {
      name: "ldrModule",
      path: "/scene77/botBuildingTextures/LIDAR.png",
    },
    {
      name: "motorDriver",
      path: "/scene77/botBuildingTextures/MOTOR DRIVER.png",
    },
    {
      name: "powerDistributionBoard",
      path: "/scene77/botBuildingTextures/PWR_DIS.png",
    },
    {
      name: "pushButton",
      path: "/scene77/botBuildingTextures/PWR_SWITCH.png",
    },
    {
      name: "rgbModule",
      path: "/scene77/botBuildingTextures/RGB.png",
    },
    {
      name: "toggleSwitch",
      path: "/scene77/botBuildingTextures/START.png",
    },
    {
      name: "arduinoBoard",
      path: "/scene77/botBuildingTextures/UNO.png",
    },
    {
      name: "batteryCase",
      path: "/scene77/botBuildingTextures/batteryCase.png",
    },
    {
      name: "botBase",
      path: "/scene77/botBuildingTextures/BASE.png",
    },
    {
      name: "botMiddleCase2",
      path: "/scene77/botBuildingTextures/BD_O1.png",
    },
    {
      name: "topCase",
      path: "/scene77/botBuildingTextures/BD_O2.png",
    },
    {
      name: "botMiddleCase",
      path: "/scene77/botBuildingTextures/BD_O4.png",
    },
  ],
  videoTextures: [],
  audios: Array.from({ length: 59 }, (_, i) => {
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
  fonts: [
    {
      fontName: "robotoFont",
      data: {
        jsonDataPath: "/fonts/msdf/Roboto-msdf.json",
        textureDataPath: "/fonts/msdf/Roboto-msdf.png",
      },
    },
  ],
  svgs: [],
};
