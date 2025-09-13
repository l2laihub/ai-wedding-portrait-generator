<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1TP_E-sDRBWcqfidc3iq0Iahh8PYC3J6x

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Analytics Dashboard Setup

This app includes comprehensive analytics tracking with PostHog. To set up admin analytics dashboards:

1. **PostHog Configuration**: The app automatically tracks generation counter increments, user engagement, and performance metrics
2. **Dashboard Setup**: Follow the detailed guide in [`docs/POSTHOG_DASHBOARD_SETUP.md`](./docs/POSTHOG_DASHBOARD_SETUP.md)
3. **Key Metrics Available**:
   - Total generations counter with success rates
   - User engagement patterns and session analytics  
   - Photo type preferences (single/couple/family)
   - Performance monitoring and error tracking
   - Conversion funnel from upload to download

### Quick Dashboard Access
- **Main Analytics**: Generation counts, success rates, photo type distribution
- **User Engagement**: DAU, engagement scores, custom prompt usage
- **Performance**: Generation times, error rates, API response times
- **Conversion Funnel**: Complete user journey tracking

See the [PostHog Dashboard Setup Guide](./docs/POSTHOG_DASHBOARD_SETUP.md) for complete configuration instructions and example queries.
