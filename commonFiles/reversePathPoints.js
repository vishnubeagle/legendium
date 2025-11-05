export function reversePathPoints(jsonData){
    return jsonData.map((curve) => {
        return {
          ...curve,
          vertices: curve.vertices.map((spline) => spline.reverse()), // Reverse points in each spline
        };
      });
}