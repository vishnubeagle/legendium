const AIRSHIP_TRAVEL_COMPLETED = "AIRSHIP_TICKET_COMPLETED";

const initialState = { isAirShipTravelCompleted: false };
export function scene2Actions(state = initialState, action) {
  switch (action.type) {
    case AIRSHIP_TRAVEL_COMPLETED:
      return { ...state, isAirShipTravelCompleted: true };
    default:
      return state;
  }
}
export const airshipTravelCompleted = () => ({
  type: AIRSHIP_TRAVEL_COMPLETED,
});
