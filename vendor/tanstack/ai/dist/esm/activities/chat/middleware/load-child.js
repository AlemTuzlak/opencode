import { createCapability } from "./capabilities.js";
//#region src/activities/chat/middleware/load-child.ts
var LoadChildCapability = createCapability()("load-child");
var [getLoadChild, provideLoadChild] = LoadChildCapability;
//#endregion
export { LoadChildCapability, getLoadChild, provideLoadChild };

//# sourceMappingURL=load-child.js.map