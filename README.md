# AI Wedding Portrait Generator

<div align="center">
<img width="1200" height="475" alt="AI Wedding Portrait Generator" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

Transform couple photos into beautiful wedding portraits using AI. Generate 3 unique themed wedding portraits from every photo upload with 12 distinct styles.

## ✨ Features

- **AI-Powered Generation**: Uses Google's Gemini 2.5 Flash Image Preview model
- **12 Wedding Themes**: Classic, Rustic, Bohemian, Victorian, Modern, Fairytale, Forest, Tropical, Japanese, Steampunk, Disco, Hollywood
- **Multiple Portrait Types**: Single person, couple, and family portraits
- **Custom Prompts**: Enhanced template system with conditional sections
- **Admin Dashboard**: Prompt management, theme configuration, and analytics
- **Authentication**: Secure sign-in with Supabase Auth
- **Credit System**: Stripe integration for premium features
- **Real-time Analytics**: PostHog integration for comprehensive tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Gemini API Key
- Supabase Project (for production features)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment setup:**
   ```bash
   # Copy example environment file
   cp .env.example .env.local
   
   # Set required variables in .env.local:
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   - Local: http://localhost:5173
   - Admin Panel: http://localhost:5173/#admin

## 🏗️ Architecture

### Core Components
- **Frontend**: React 19 + TypeScript + Vite
- **AI Service**: Google Gemini 2.5 Flash Image Preview
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Analytics**: PostHog
- **Deployment**: Vercel/Netlify compatible

### Enhanced Template System
- **Conditional Prompts**: Smart template processing with `{enhanceSection}`
- **Dynamic Variables**: `{style}`, `{familyMemberCount}`, custom enhancements
- **Backward Compatible**: Supports both legacy and enhanced template formats
- **Admin Management**: Full CRUD operations via admin dashboard

## 📊 Analytics Dashboard

This app includes comprehensive analytics tracking with PostHog:

### Key Metrics Available
- **Generation Analytics**: Total generations, success rates, photo type distribution
- **User Engagement**: DAU, session analytics, custom prompt usage patterns
- **Performance Monitoring**: Generation times, error rates, API response times
- **Conversion Funnel**: Complete user journey from upload to download

### Dashboard Setup
Follow the detailed guide in [`docs/POSTHOG_DASHBOARD_SETUP.md`](./docs/POSTHOG_DASHBOARD_SETUP.md) for complete configuration instructions.

## 🔧 Production Deployment

### Required Environment Variables
```bash
# Core API
GEMINI_API_KEY=your_gemini_api_key

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Analytics (Optional)
VITE_POSTHOG_KEY=your_posthog_key
VITE_POSTHOG_HOST=your_posthog_host

# Payments (Optional)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### Database Setup
1. Run migrations: `supabase/migrations/*.sql`
2. Import legacy themes: `scripts/import-legacy-themes-fixed.sql`
3. Configure RLS policies (included in migrations)

### Build & Deploy
```bash
npm run build
npm run preview  # Test production build locally
```

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   ├── services/           # API services and business logic
│   ├── utils/              # Utility functions
│   └── pages/admin/        # Admin dashboard pages
├── supabase/
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge functions
├── scripts/                # Deployment and utility scripts
├── docs/                   # Documentation
└── public/                 # Static assets
```

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (if configured)
- `npm run type-check` - Run TypeScript checks (if configured)

### Admin Features
- **Prompt Management**: Create and edit prompt templates
- **Theme Management**: CRUD operations for wedding themes
- **User Management**: View and manage user accounts
- **Analytics**: View generation statistics and performance metrics

## 📚 Documentation

- [Template Engine Architecture](./docs/TEMPLATE_ENGINE_ARCHITECTURE.md)
- [PostHog Dashboard Setup](./docs/POSTHOG_DASHBOARD_SETUP.md)
- [Edge Functions Setup](./EDGE_FUNCTIONS_SETUP.md)
- [Development Guidelines](./CLAUDE.md)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📞 Support

For support and questions, please check the documentation or open an issue on GitHub.