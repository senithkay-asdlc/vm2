screen SubmitTicket "A customer describes their issue"
  navbar "Support"
  heading "Contact Support"
  text "Tell us what's going on and we'll get back to you."
  input "Your name"
  input "Your email"
  input "Subject"
  textarea "Describe your issue" 500x160
  row
    right
    button "Submit" primary -> Confirmation

screen Confirmation "The ticket was received"
  navbar "Support"
  heading "Thanks — we've got it"
  text "Your ticket has been submitted. A support agent will follow up by email."

flow "Submit a ticket"
  description "A customer describes their issue and receives confirmation"
  SubmitTicket
  Confirmation
