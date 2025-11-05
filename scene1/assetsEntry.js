const CDN_BASE = (() => {
  if (typeof window !== 'undefined') {
    if (window.ASSETS_CDN_BASE) return window.ASSETS_CDN_BASE;
    if (window.ASSETS_R2_ACCOUNT_ID) return `https://${window.ASSETS_R2_ACCOUNT_ID}.r2.dev`;
  }
  return 'https://pub-4dc5824a7d6645b29006348054fb1f3f.r2.dev';
})();
const isDevHost = () => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)
  );
};
const toCDN = (p) => {
  if (!p) return p;
  if (p.startsWith('/r2/')) {
    if (isDevHost()) return p; // Let Vite proxy handle /r2 in dev to avoid CORS
    const pathOnBucket = p.replace(/^\/r2\//, '/');
    return CDN_BASE ? `${CDN_BASE}${pathOnBucket}` : pathOnBucket;
  }
  return p;
};

export const assetsEntry = {
  characters: [
    {
      name: "electro",
      path: "/characters/electro_facialv7.glb",
    },
  ],
  models: [
    {
      name: "garden",
      path: toCDN("/r2/island.glb"),
      shadow: false
    },
    // {
    //   name: "garden",
    //   path: "/scene11/island 1.glb",
    //   shadow: false
    // },
    {
      name: "grass",
      path: "/scene11/grass_emision.glb",
      shadow: false
    },
    {
      name: "wheat",
      path: "/scene11/wheat-opt.glb",
      shadow: false
    },
    {
      name: "cactus",
      path: "/scene11/carnivorous2.glb",
      shadow: false
    },
    {
      name: "carnivorus",
      path: "/scene11/carnivorous2.glb",
      shadow: false
    },
    {
      name: "glowing_mushroom",
      path: "/scene11/glowing_mush_v2.glb",
      shadow: false
    },
    {
      name: "pearl_mushroom",
      path: "/scene11/pearl_mushroom.glb",
      shadow: false
    },
    {
      name: "ufo",
      path: "/scene11/ufo2.glb",
      shadow: false
    },
  ],
  textures: [
    {
      name: "portal",
      path: "/scene11/portal.png",
    },
    {
      name: "groundBlue",
      path: "/scene11/groundBlue.png",
    },
  ],
  videoTextures: [
  ],
  audios: [
    { name: "background", path: "/scene11/background.mp3", volume: 0.2,loop:true }, // Global background music
    {name:"electrosound",path:"/scene11/electro2.wav"},
    //make usfosound positional
    {name:"ufosound",path:"/scene11/ufo3.mp3",volume:1},
    {name:"attacksound",path:"/scene11/beast-plant.mp3",volume:1}
  ],
  hdris: [
  ],
  cubeMaps: [
  ],
  vfxs: [
    {
      name: "entryvfx",
      path: "/vfxFiles/entryvfx.json",
    }
  ],
  pathFiles: [],
  jsonFiles: [],
  fonts: [],
  svgs: [],
};
