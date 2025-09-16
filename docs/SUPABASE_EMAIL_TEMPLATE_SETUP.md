# Setting Up Custom Email Templates in Supabase

## Overview

This guide explains how to configure the custom password reset email template in your Supabase project.

## Steps to Configure

### 1. Access Email Templates in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### 2. Update the Password Reset Template

1. Find the **Reset Password** template
2. Click on it to edit
3. Replace the default template with our custom HTML

### 3. Template Variables

Supabase uses these variables that you'll need to map:

| Our Template Variable | Supabase Variable | Description |
|-----------------------|-------------------|-------------|
| `{{ .ConfirmationURL }}` | `{{ .ConfirmationURL }}` | The password reset link |
| `{{ .Email }}` | `{{ .Email }}` | User's email address (optional) |
| `{{ .Token }}` | `{{ .Token }}` | Reset token (if using custom flow) |

### 4. Copy the HTML Template

Copy the entire contents of `/email-templates/reset-password.html` and paste it into the Supabase email template editor.

### 5. Configure Email Settings

In **Authentication** → **Email Settings**:

1. **Sender Email**: Update to your domain email (e.g., `noreply@yourapp.com`)
2. **Sender Name**: Set to "AI Wedding Portrait Generator"
3. **Support Email**: Update to your support email

### 6. Custom SMTP (Optional but Recommended)

For better deliverability and customization:

1. Go to **Settings** → **Email**
2. Enable **Custom SMTP**
3. Configure with your email service provider:
   - SendGrid
   - Mailgun
   - Amazon SES
   - Postmark

Example SendGrid configuration:
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [Your SendGrid API Key]
```

## Testing the Template

### 1. Test in Supabase

1. In the email template editor, click **Send Test Email**
2. Enter your email address
3. Check that the email renders correctly

### 2. Test the Full Flow

```javascript
// Test password reset flow
const { error } = await supabase.auth.resetPasswordForEmail(
  'test@example.com',
  {
    redirectTo: 'http://localhost:5173/reset-password',
  }
)
```

## Email Template Best Practices

### 1. Inline CSS
The template already includes inline CSS for maximum compatibility.

### 2. Fallback Content
The template includes:
- Plain text fallback
- Alt text for images
- Web-safe fonts with fallbacks

### 3. Mobile Responsiveness
The template is fully responsive with:
- Mobile-specific styles
- Touch-friendly buttons
- Readable font sizes

### 4. Dark Mode Support
Includes `@media (prefers-color-scheme: dark)` styles for dark mode email clients.

## Customization Options

### Update Brand Colors

Find and replace these color values in the template:
- Primary gradient: `#ec4899` to `#a855f7` (pink to purple)
- Text colors: `#111827` (dark), `#6b7280` (muted)
- Background: `#f3f4f6` (light gray)

### Update Logo/Icon

Replace the emoji icon with your logo:
```html
<!-- Current emoji icon -->
<td align="center" valign="middle" style="font-size: 36px; color: #ffffff;">
  💑
</td>

<!-- Replace with image -->
<td align="center" valign="middle">
  <img src="https://yourapp.com/logo.png" alt="Logo" width="40" height="40">
</td>
```

### Update Support Information

Update the footer contact information:
```html
<a href="mailto:support@example.com" style="color: #a855f7; text-decoration: none;">
  support@example.com
</a>
```

## Troubleshooting

### Email Not Sending

1. Check Supabase email logs: **Authentication** → **Logs**
2. Verify email configuration in project settings
3. Check spam folder
4. Ensure user email is verified

### Template Not Updating

1. Clear Supabase cache (save template again)
2. Wait 1-2 minutes for changes to propagate
3. Test with a different email address

### Styling Issues

1. Use inline CSS only
2. Test in multiple email clients
3. Keep CSS simple and table-based
4. Use web-safe fonts

## Email Client Compatibility

The template has been designed to work with:
- Gmail (Web, iOS, Android)
- Outlook (2016+, Web, iOS, Android)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- Thunderbird
- Samsung Mail

## Additional Templates

You can create similar templates for:
- **Welcome Email**: `/email-templates/welcome.html`
- **Email Confirmation**: `/email-templates/confirm-email.html`
- **Magic Link**: `/email-templates/magic-link.html`

## Security Considerations

1. **Link Expiration**: Password reset links expire in 15 minutes
2. **One-Time Use**: Links can only be used once
3. **HTTPS Only**: Ensure all links use HTTPS
4. **Rate Limiting**: Implement rate limiting for password reset requests

## Monitoring

Monitor email performance in Supabase:
1. Go to **Authentication** → **Logs**
2. Filter by email events
3. Track delivery rates and bounces

For custom SMTP providers, use their dashboards for detailed analytics.