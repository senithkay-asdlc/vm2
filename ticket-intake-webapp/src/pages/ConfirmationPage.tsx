import type { JSX } from "react";
import { PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";

export default function ConfirmationPage(): JSX.Element {
  return (
    <PageContent maxWidth={640}>
      <PageTitle>
        <PageTitle.Header>Thanks — we&apos;ve got it</PageTitle.Header>
      </PageTitle>
      <Typography>
        Your ticket has been submitted. A support agent will follow up by email.
      </Typography>
    </PageContent>
  );
}
