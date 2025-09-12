# Deployment Instructions for WedAI

## Build Process

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Copy public assets to dist**:
   ```bash
   cp -r public/assets dist/
   cp -r public/icons dist/
   ```

## Deployment Files

After building, deploy the entire `dist/` directory to your web server:

```
dist/
├── assets/           # JS, CSS, and image assets
│   ├── wedai_logo_notext_nobg.png
│   ├── index-*.js    # Main JavaScript bundle
│   ├── index-*.css   # Compiled CSS with Tailwind
│   └── ...           # Other chunk files
├── icons/            # PWA icon files
│   ├── icon-32x32.png
│   ├── icon-144x144.png
│   └── ...           # Various icon sizes
├── index.html        # Main HTML file
├── manifest.json     # PWA manifest
└── sw.js            # Service worker
```

## Important Notes

1. **Environment Variables**: 
   - Ensure `GEMINI_API_KEY` is set during build time
   - Create a `.env` or `.env.production` file with:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

2. **Server Configuration**:
   - Serve all files from the `dist/` directory
   - Set up proper MIME types for all file extensions
   - Enable HTTPS for PWA features to work

3. **Static Hosting**: 
   - The app is a static SPA and can be hosted on:
     - Netlify
     - Vercel
     - GitHub Pages
     - Any static web server

4. **CORS**: 
   - No special CORS configuration needed
   - All API calls are made directly from the browser to Google's API

## Deployment Checklist

- [ ] Run `npm run build`
- [ ] Copy public assets to dist folder
- [ ] Verify all files in dist/ directory
- [ ] Deploy dist/ folder to web server
- [ ] Test image upload functionality
- [ ] Verify PWA installation works
- [ ] Check mobile responsiveness

## Troubleshooting

1. **404 Errors**: Ensure all files from `dist/` are uploaded, including subdirectories
2. **Blank Page**: Check browser console for JavaScript errors
3. **API Errors**: Verify GEMINI_API_KEY was set correctly during build
4. **Icons Missing**: Make sure `icons/` directory is in the root of your deployment