// The signed-in app shell, for every screen behind the sign-in guard:
// AppShell.Navbar (brand) / AppShell.Sidebar (the ONE rail, each item gated
// with <Can>) / AppShell.Main (the routed page) / AppShell.Footer — the
// structure oxygen-ui-design-system's sample app (AppLayout.tsx) prescribes.
//
// wireframes.dsl draws `sidebar "Queue -> TicketQueue"` on both screens: one
// rail item, reaching the queue. TicketDetail has no rail entry of its own —
// it is reached by clicking a queue row, exactly as the wireframe's table
// arrow draws it.

import type { JSX } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  AppShell,
  Header,
  Sidebar,
  Footer,
  UserMenu,
  ColorSchemeToggle,
  Divider,
} from "@wso2/oxygen-ui";
import { Headset, LogOut, User } from "@wso2/oxygen-ui-icons-react";
import { APP_NAME } from "../appName";
import { Can } from "../authz/gates";
import { useAuthz } from "../authz/gates";
import { signOut } from "../authz/session";

export function AppLayout(): JSX.Element {
  const { pathname } = useLocation();
  const { username } = useAuthz();
  const active = pathname.startsWith("/tickets") ? "tickets" : "";

  return (
    <AppShell>
      <AppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={username || "Support Agent"} />
              <UserMenu.Header name={username || "Support Agent"} email={username} />
              <UserMenu.Item icon={<User />} label="Profile" onClick={() => {}} />
              <UserMenu.Logout icon={<LogOut />} onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </AppShell.Navbar>

      <AppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              <Can op="GET /tickets">
                <Sidebar.Item id="tickets" link={<Link to="/tickets" />}>
                  <Sidebar.ItemIcon>
                    <Headset />
                  </Sidebar.ItemIcon>
                  <Sidebar.ItemLabel>Queue</Sidebar.ItemLabel>
                </Sidebar.Item>
              </Can>
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </AppShell.Sidebar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </AppShell.Footer>
    </AppShell>
  );
}
