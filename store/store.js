import { configureStore } from "@reduxjs/toolkit";
import { scene5Action } from "./scene5Actions";
import scene1Reducer from "./scene1Actions";
import { scene2Actions } from "./scene2Actions";

const rootReducer = {
  scene1: scene1Reducer,
  scene2Actions,
  scene5Action,
};

const store = configureStore({
  reducer: rootReducer,
});

export default store;
