import { useState, type FormEvent, type JSX } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  Form,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { ticketApi } from "../api";

interface FieldErrors {
  customerName?: string;
  customerEmail?: string;
  subject?: string;
  message?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SubmitTicketPage(): JSX.Element {
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!customerName.trim()) errors.customerName = "Your name is required.";
    if (!customerEmail.trim()) errors.customerEmail = "Your email is required.";
    else if (!EMAIL_PATTERN.test(customerEmail.trim())) {
      errors.customerEmail = "Enter a valid email address.";
    }
    if (!subject.trim()) errors.subject = "Subject is required.";
    if (!message.trim()) errors.message = "Describe your issue before submitting.";
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const { data, error, response } = await ticketApi.POST("/tickets", {
        body: {
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          subject: subject.trim(),
          message: message.trim(),
        },
      });

      if (error) {
        setSubmitError(error.message || "Your submission could not be sent. Please try again.");
        return;
      }
      if (!response.ok || !data) {
        setSubmitError("Your submission could not be sent. Please try again.");
        return;
      }

      navigate("/confirmation");
    } catch {
      setSubmitError("Your submission could not be sent. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContent maxWidth={640}>
      <PageTitle>
        <PageTitle.Header>Contact Support</PageTitle.Header>
      </PageTitle>
      <Typography sx={{ mb: 3 }}>
        Tell us what&apos;s going on and we&apos;ll get back to you.
      </Typography>

      {submitError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      ) : null}

      <Box component="form" noValidate onSubmit={handleSubmit}>
        <Form.Section>
          <Form.Stack spacing={3}>
            <TextField
              label="Your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              error={Boolean(fieldErrors.customerName)}
              helperText={fieldErrors.customerName}
              fullWidth
            />
            <TextField
              label="Your email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              error={Boolean(fieldErrors.customerEmail)}
              helperText={fieldErrors.customerEmail}
              fullWidth
            />
            <TextField
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              error={Boolean(fieldErrors.subject)}
              helperText={fieldErrors.subject}
              fullWidth
            />
            <TextField
              label="Describe your issue"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              error={Boolean(fieldErrors.message)}
              helperText={fieldErrors.message}
              multiline
              minRows={6}
              fullWidth
            />
          </Form.Stack>
        </Form.Section>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" disabled={submitting}>
            Submit
          </Button>
        </Stack>
      </Box>
    </PageContent>
  );
}
