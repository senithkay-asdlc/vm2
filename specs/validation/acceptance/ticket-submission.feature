Feature: Ticket submission

  @story-1
  Rule: A customer can submit a support ticket without an account

    Scenario: Submitting a ticket
      Given Jane is a customer with an issue
      When Jane submits a ticket with subject "Can't log in" and message "I get an error signing in"
      Then a new ticket exists with subject "Can't log in" and status "new"

    @negative
    Scenario: A ticket with no message is refused
      Given Jane is a customer with an issue
      When Jane tries to submit a ticket with subject "Can't log in" and no message
      Then no ticket is created for Jane
