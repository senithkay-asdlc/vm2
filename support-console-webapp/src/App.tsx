// Adapted from thunder-authentication's assets/App.example.tsx. The routing
// STRUCTURE below is prescribed by that skill — NoAccess replaces the shell,
// Forbidden sits inside it, /callback is outside the provider, every gated
// route is wrapped in <RequireOperation> reading SCREEN_ROUTES — only
// PAGE_BY_KEY and APP_NAME are this app's own.
//
// Support Console has no public screen: wireframes.dsl's one flow carries
// `role "Support Agent"`, so PUBLIC_SCREENS is always empty and every route
// below the landing redirect sits behind the sign-in guard.

import { useEffect, type JSX, type ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Box, Typography } from "@wso2/oxygen-ui";
import {
  AuthzProvider,
  Forbidden,
  NoAccess,
  RequireOperation,
  useAuthz,
  useScopes,
} from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens, hasScopedReach } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { AppLayout } from "./shell/AppShell";
import { APP_NAME } from "./appName";
import { CallbackPage } from "./pages/Callback";
import { TicketQueuePage } from "./pages/TicketQueue";
import { TicketDetailPage } from "./pages/TicketDetail";

/** YOUR pages, keyed by the screen keys src/authz/screens.ts declares. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  ticketqueue: <TicketQueuePage />,
  ticketdetail: <TicketDetailPage />,
};

/** The screens reachable before sign-in — none, in this app. */
const PUBLIC_SCREENS = SCREEN_ROUTES.filter((screen) => screen.public);

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        {PUBLIC_SCREENS.map((screen) => (
          <Route
            key={screen.key}
            path={screen.path}
            element={
              <AuthzProvider fallback={<Splash />}>{PAGE_BY_KEY[screen.key]}</AuthzProvider>
            }
          />
        ))}
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Hands src/authz/client.ts the route a refusal goes to. ONCE, from inside the
 * router and above every route, so it is wired before the first request can be
 * answered.
 */
function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): JSX.Element {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5">{APP_NAME}</Typography>
      <Typography sx={{ mt: 1 }}>Checking your session…</Typography>
    </Box>
  );
}

function SignedIn(): JSX.Element {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // The load-time guard. Only a MISSING session starts a sign-in: currentUser()
  // has already tried a silent renew, and signing in on a merely expired token
  // re-logs the user in on every visit.
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  const reachable = reachableScreens(scopes, signedIn);

  // NoAccess REPLACES the shell. There is no rail to wrap it.
  if (!hasScopedReach(scopes, signedIn)) return <NoAccess appName={APP_NAME} />;

  // Safe: hasScopedReach just proved at least one scope-gated screen is here.
  const landing = (reachable.find((s) => !s.public && s.loads !== null) ?? reachable[0]).path;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          // `public` screens are routed above this guard, in App(), and their
          // path never reaches here.
          if (screen.public) return null;
          const page = PAGE_BY_KEY[screen.key];
          // No load call: anyone with a session is in. (Not used in this app.)
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          // The requirement comes from the contract, through the generated
          // table — never from this file.
          return (
            <Route
              key={screen.key}
              element={<RequireOperation op={screen.loads} screen={screen.label} />}
            >
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        {/* Forbidden is INSIDE the shell: the rail the caller can use stays. */}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
