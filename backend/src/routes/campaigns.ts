// Legacy /api/campaigns → proxied to /api/outreach handler.
// All write paths now go through outreach.ts. Keep this mount so any
// in-flight API calls to /campaigns continue to work during the transition.
export { default } from "./outreach.js";
