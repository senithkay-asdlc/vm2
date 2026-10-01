import { type RouteProps, Navigate } from "react-router";
import AppLayout from "../layouts/AppLayout";
import SubmitTicketPage from "../pages/SubmitTicketPage";
import ConfirmationPage from "../pages/ConfirmationPage";

export interface AppRoute extends Omit<RouteProps, "children"> {
  children?: AppRoute[];
  label?: string;
}

const appRoutes: AppRoute[] = [
  { path: "/", element: <Navigate to="/submit-ticket" replace /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/submit-ticket", element: <SubmitTicketPage />, label: "SubmitTicket" },
      { path: "/confirmation", element: <ConfirmationPage />, label: "Confirmation" },
    ],
  },
];

export default appRoutes;
