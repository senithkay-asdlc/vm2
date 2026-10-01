import type { JSX } from "react";
import { Outlet } from "react-router";
import { AppShell, Header } from "@wso2/oxygen-ui";

// This app has no auth dependency and no navigation beyond the one flow the
// wireframe draws (SubmitTicket -> Confirmation): the chrome is the brand-only
// navbar the DSL declares (`navbar "Support"`), with no sidebar and no user
// menu — there is no signed-in user to show one for.
export default function AppLayout(): JSX.Element {
  return (
    <AppShell>
      <AppShell.Navbar>
        <Header minimal>
          <Header.Brand>
            <Header.BrandTitle>Support</Header.BrandTitle>
          </Header.Brand>
        </Header>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
