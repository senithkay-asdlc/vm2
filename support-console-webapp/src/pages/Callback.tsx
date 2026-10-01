// Routed at /callback, OUTSIDE the AuthzProvider (there is no session to read
// until the redirect has been processed). Serves BOTH oidc-client-ts legs —
// the redirect callback and a silent renew's hidden iframe — because the
// platform registers exactly one redirect URI (thunder-authentication).
// handleCallback() is signinCallback(), which reads the stored request_type
// and dispatches; it resolves to nothing, so this renders from the promise
// SETTLING, never from a value.

import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";
import { APP_NAME } from "../appName";

export function CallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        await handleCallback();
        if (live) navigate("/", { replace: true });
      } catch (err) {
        console.error("authz: sign-in callback failed", err);
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [navigate]);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5">{APP_NAME}</Typography>
      <Typography sx={{ mt: 1 }}>
        {failed ? "Sign-in did not complete. Try reloading the app." : "Completing sign-in…"}
      </Typography>
    </Box>
  );
}
