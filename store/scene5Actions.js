const initialStateA = { isWaterfallExplanationCompleted: false };

export function scene5Action(state = initialStateA, action) {
  switch (action.type) {
    case "waterfallExplanationCompleted":
      return { ...state, isWaterfallExplanationCompleted: true };
    default:
      return state;
  }
}

export const finishedExplanation = () => ({
  type: "waterfallExplanationCompleted",
});
