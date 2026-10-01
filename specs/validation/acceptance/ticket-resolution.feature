Feature: Agent review and resolution

  @story-7
  Rule: A Support Agent can view and filter the ticket queue by urgency and status

    Scenario: Filtering the queue to urgent, unresolved tickets
      Given a ticket for "Can't log in" is "urgent" and "new"
      And a ticket for "Feature request" is "low" and "resolved"
      When Priya the support agent filters the queue to urgency "urgent" and status "new"
      Then only the ticket for "Can't log in" appears in the queue

  @story-8
  Rule: A Support Agent can see a ticket's full details before acting on it

    Scenario: Opening a ticket's details
      Given a ticket for "Can't log in" with message "I get an error signing in"
      When Priya the support agent opens the ticket for "Can't log in"
      Then she sees the original message "I get an error signing in" and its drafted reply

  @story-4
  Rule: A Support Agent can edit a ticket's drafted reply before approving it

    Scenario: Editing the draft
      Given a ticket for "Can't log in" has a drafted reply
      When Priya the support agent changes the drafted reply to "Hi Jane, please reset your password here."
      Then the ticket for "Can't log in" has the drafted reply "Hi Jane, please reset your password here."

  @story-5
  Rule: A Support Agent can approve a ticket's drafted reply

    Scenario: Approving a draft
      Given a ticket for "Can't log in" is "draft-ready"
      When Priya the support agent approves the ticket for "Can't log in"
      Then the ticket for "Can't log in" has status "approved"

  @story-6
  Rule: A Support Agent can mark a ticket resolved once they have sent its reply

    Scenario: Resolving an approved ticket
      Given a ticket for "Can't log in" is "approved"
      When Priya the support agent marks the ticket for "Can't log in" resolved
      Then the ticket for "Can't log in" has status "resolved"

    @negative
    Scenario: A ticket that has not been approved cannot be resolved
      Given a ticket for "Billing question" is "draft-ready"
      When Priya the support agent tries to mark the ticket for "Billing question" resolved
      Then the ticket for "Billing question" still has status "draft-ready"
