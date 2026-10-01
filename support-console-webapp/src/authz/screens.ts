/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Adapted from thunder-authentication's assets/screens.example.ts for the
// Support Console. THIS IS THE ONLY FILE THAT KNOWS ABOUT SCREENS, and all it
// says about each one is which API operation it LOADS. The gate follows: a
// screen is reachable when the caller may call that operation, and what the
// operation needs is in the contract, projected into ./operations.gen.ts.
//
// Support Console has exactly one role (SupportAgent) and no public screen:
// specs/design/components/support-console-webapp/wireframes.dsl's single flow
// carries `role "Support Agent"`, so both screens below are scope-gated and
// there is no `public: true` row.
//
// THE ORDER OF THIS TABLE IS THE RAIL'S ORDER, and its first reachable row is
// the screen the app lands on — the wireframes draw TicketQueue first.

import { canCall } from "./core";
import { OPERATIONS, isOperationKey, type OperationKey } from "./operations.gen";

export interface ScreenRoute {
  /** A stable id the App maps to a page component. */
  readonly key: string;
  /** The wireframe's screen name, for the rail and the Forbidden copy. */
  readonly label: string;
  readonly path: string;
  /**
   * The operation this screen exists to perform: the call it renders on load.
   * `null` is for a screen that needs NO operation at all — not used here.
   */
  readonly loads: OperationKey | null;
  /** In a flow with no `role` line: reachable before sign-in. Not used here. */
  readonly public?: boolean;
}

/**
 * The Support Console's two screens, in RAIL ORDER — the order the wireframes
 * draw them: TicketQueue first, then TicketDetail.
 *
 * TicketQueue lists every ticket (`GET /tickets`), so it loads the every-row
 * operation, guarded by `tickets:read-all`. TicketDetail loads one ticket's
 * full record (`GET /tickets/{ticketId}`), guarded by the same handle.
 */
export const SCREEN_ROUTES: readonly ScreenRoute[] = [
  { key: "ticketqueue", label: "Ticket Queue", path: "/tickets", loads: "GET /tickets" },
  { key: "ticketdetail", label: "Ticket Detail", path: "/tickets/:ticketId", loads: "GET /tickets/{ticketId}" },
];

// FAIL LOUDLY, at module load — the first render, every time, in dev, in the
// mock walk and in the deployed pod. `loads` is typed as an OperationKey, so a
// name the contract does not declare is already a type error; this catches the
// case tsc cannot, a COMMITTED operations.gen.ts that went stale against a
// contract nobody regenerated from.
for (const screen of SCREEN_ROUTES) {
  if (screen.loads !== null && !isOperationKey(screen.loads)) {
    throw new Error(
      `src/authz/screens.ts: screen "${screen.label}" loads "${screen.loads}", which ` +
        `no contract declares. Re-run \`npm run gen\`, or name the operation the ` +
        `way openapi.yaml spells it.`,
    );
  }
}

/**
 * The screens a caller can actually open, in rail order. The first one is the
 * landing screen; an EMPTY list is the NoAccess case.
 */
export function reachableScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  return SCREEN_ROUTES.filter((screen) => {
    if (screen.public) return true;
    if (screen.loads === null) return signedIn;
    return canCall(OPERATIONS[screen.loads], scopes, signedIn);
  });
}

/**
 * Does this caller reach anything their scopes actually earned them? The
 * NoAccess question — see thunder-authentication's screens.example.ts for why
 * this differs from "is reachableScreens empty" in general. This app has no
 * public or loads:null screen, so in practice the two questions coincide, but
 * the function is kept for parity with the pattern and in case a future screen
 * adds one of those shapes.
 */
export function hasScopedReach(scopes: ReadonlySet<string>, signedIn: boolean): boolean {
  return reachableScreens(scopes, signedIn).some((screen) => !screen.public && screen.loads !== null);
}
