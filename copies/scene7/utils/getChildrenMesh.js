export default function getChildrenMesh(parent, targetMesh) {
  let mesh = null;
  parent.traverse((child) => {
    if (child.name === targetMesh) {
      mesh = child;
    }
  });
  return mesh;
}
