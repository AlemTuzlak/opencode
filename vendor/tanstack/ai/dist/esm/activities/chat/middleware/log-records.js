import { createCapability } from "./capabilities.js";
//#region src/activities/chat/middleware/log-records.ts
var LogRecordsCapability = createCapability()("log-records");
var [getLogRecords, provideLogRecords] = LogRecordsCapability;
//#endregion
export { LogRecordsCapability, getLogRecords, provideLogRecords };

//# sourceMappingURL=log-records.js.map