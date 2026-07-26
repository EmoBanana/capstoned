/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as candidates from "../candidates.js";
import type * as enrollments from "../enrollments.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as organizations from "../organizations.js";
import type * as reliability from "../reliability.js";
import type * as seed from "../seed.js";
import type * as sponsorships from "../sponsorships.js";
import type * as tasks from "../tasks.js";
import type * as tracks from "../tracks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  applications: typeof applications;
  auth: typeof auth;
  candidates: typeof candidates;
  enrollments: typeof enrollments;
  health: typeof health;
  http: typeof http;
  organizations: typeof organizations;
  reliability: typeof reliability;
  seed: typeof seed;
  sponsorships: typeof sponsorships;
  tasks: typeof tasks;
  tracks: typeof tracks;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
