// Define action types as constants to avoid typos
const SCENE1_COMPLETED = "SCENE1_COMPLETED";

// Initial State
const initialState = { isScene1Completed: false };

// Reducer function
export default function scene1Reducer(state = initialState, action) {
  switch (action.type) {
    case SCENE1_COMPLETED:
      return { ...state, isScene1Completed: true };
    default:
      return state;
  }
}

// Action Creators
export const scene1Completed = () => ({ type: SCENE1_COMPLETED });
