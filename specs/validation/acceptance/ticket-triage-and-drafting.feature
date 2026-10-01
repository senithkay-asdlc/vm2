Feature: Automatic triage and drafting

  @story-2
  Rule: Every submitted ticket is classified by urgency automatically

    Scenario: A newly submitted ticket already has an urgency level
      Given Jane submits a ticket with subject "Can't log in" and message "I get an error signing in"
      Then the ticket for "Can't log in" has one of the urgency levels "low", "medium", "high" or "urgent"

  @story-3
  Rule: Every submitted ticket gets a drafted reply automatically

    Scenario: A newly submitted ticket already has a draft reply
      Given Jane submits a ticket with subject "Can't log in" and message "I get an error signing in"
      Then the ticket for "Can't log in" has a non-empty drafted reply
