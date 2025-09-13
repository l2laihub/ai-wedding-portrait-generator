# PostHog Event Schema for Wedding Portrait Generator

## Event Taxonomy

### 1. Page View Events

#### `page_viewed`
Tracks all page loads and navigation
```javascript
{
  event: 'page_viewed',
  properties: {
    page_name: 'home' | 'generator' | 'results',
    referrer: string,
    utm_source: string,
    utm_medium: string,
    utm_campaign: string,
    device_type: 'mobile' | 'tablet' | 'desktop',
    viewport_width: number,
    viewport_height: number,
    orientation: 'portrait' | 'landscape',
    theme: 'light' | 'dark',
    network_status: 'online' | 'offline',
    connection_type: '4g' | '3g' | '2g' | 'slow-2g' | 'wifi' | 'ethernet',
    is_pwa: boolean,
    session_id: string
  }
}
```

### 2. User Interaction Events

#### `image_upload_started`
When user initiates image upload
```javascript
{
  event: 'image_upload_started',
  properties: {
    upload_method: 'click' | 'drag_drop' | 'camera' | 'gallery',
    device_type: string,
    session_id: string
  }
}
```

#### `image_upload_completed`
Successful image upload
```javascript
{
  event: 'image_upload_completed',
  properties: {
    file_size_kb: number,
    file_type: string,
    upload_duration_ms: number,
    image_dimensions: {
      width: number,
      height: number
    },
    device_type: string,
    session_id: string
  }
}
```

#### `image_upload_failed`
Failed image upload
```javascript
{
  event: 'image_upload_failed',
  properties: {
    error_type: 'file_too_large' | 'invalid_format' | 'network_error' | 'other',
    error_message: string,
    file_size_kb: number,
    file_type: string,
    device_type: string,
    session_id: string
  }
}
```

#### `generation_started`
When AI generation begins
```javascript
{
  event: 'generation_started',
  properties: {
    has_custom_prompt: boolean,
    custom_prompt_length: number,
    selected_styles: string[],
    generation_mode: 'concurrent' | 'sequential',
    device_type: string,
    network_quality: 'fast' | 'slow',
    session_id: string
  }
}
```

#### `generation_style_completed`
Individual style generation success
```javascript
{
  event: 'generation_style_completed',
  properties: {
    style_name: string,
    generation_duration_ms: number,
    style_index: number,
    total_styles: number,
    api_response_time_ms: number,
    device_type: string,
    session_id: string
  }
}
```

#### `generation_style_failed`
Individual style generation failure
```javascript
{
  event: 'generation_style_failed',
  properties: {
    style_name: string,
    error_type: 'api_error' | 'network_error' | 'timeout' | 'content_policy',
    error_message: string,
    style_index: number,
    total_styles: number,
    retry_count: number,
    device_type: string,
    session_id: string
  }
}
```

#### `generation_completed`
Overall generation process completion
```javascript
{
  event: 'generation_completed',
  properties: {
    successful_styles: number,
    failed_styles: number,
    total_duration_ms: number,
    average_style_duration_ms: number,
    device_type: string,
    network_quality: string,
    session_id: string
  }
}
```

### 3. Result Interaction Events

#### `result_viewed`
When generated results are displayed
```javascript
{
  event: 'result_viewed',
  properties: {
    results_count: number,
    successful_results: number,
    failed_results: number,
    device_type: string,
    session_id: string
  }
}
```

#### `result_downloaded`
Image download action
```javascript
{
  event: 'result_downloaded',
  properties: {
    style_name: string,
    download_index: number,
    time_to_download_ms: number,
    device_type: string,
    session_id: string
  }
}
```

#### `result_shared`
Image share action
```javascript
{
  event: 'result_shared',
  properties: {
    style_name: string,
    share_method: 'native_api' | 'clipboard' | 'fallback',
    share_platform: string, // if detectable
    share_index: number,
    device_type: string,
    session_id: string
  }
}
```

### 4. PWA Events

#### `pwa_install_prompted`
PWA install prompt shown
```javascript
{
  event: 'pwa_install_prompted',
  properties: {
    trigger: 'auto' | 'manual',
    time_on_site_ms: number,
    device_type: string,
    session_id: string
  }
}
```

#### `pwa_install_accepted`
User accepts PWA installation
```javascript
{
  event: 'pwa_install_accepted',
  properties: {
    time_to_accept_ms: number,
    device_type: string,
    session_id: string
  }
}
```

#### `pwa_install_dismissed`
User dismisses PWA prompt
```javascript
{
  event: 'pwa_install_dismissed',
  properties: {
    dismiss_method: 'close' | 'later' | 'backdrop',
    time_to_dismiss_ms: number,
    device_type: string,
    session_id: string
  }
}
```

### 5. Error & Performance Events

#### `api_error`
API-related errors
```javascript
{
  event: 'api_error',
  properties: {
    error_code: string,
    error_message: string,
    endpoint: string,
    retry_count: number,
    device_type: string,
    session_id: string
  }
}
```

#### `performance_metric`
Performance monitoring
```javascript
{
  event: 'performance_metric',
  properties: {
    metric_name: 'page_load' | 'image_upload' | 'generation' | 'result_render',
    duration_ms: number,
    device_type: string,
    network_quality: string,
    memory_usage_mb: number,
    session_id: string
  }
}
```

### 6. User Journey Events

#### `session_started`
New user session begins
```javascript
{
  event: 'session_started',
  properties: {
    entry_point: string,
    referrer: string,
    is_returning_user: boolean,
    device_type: string,
    session_id: string
  }
}
```

#### `session_ended`
User session ends (timeout or navigation away)
```javascript
{
  event: 'session_ended',
  properties: {
    session_duration_ms: number,
    images_generated: number,
    images_downloaded: number,
    images_shared: number,
    conversion_status: 'visitor' | 'uploader' | 'generator' | 'downloader',
    device_type: string,
    session_id: string
  }
}
```

## Event Implementation Guidelines

### 1. Timing Precision
- Use `performance.now()` for accurate timing measurements
- Record timestamps in milliseconds for all duration metrics

### 2. Error Handling
- Capture all error types with descriptive messages
- Include stack traces for debugging (in development mode)
- Group similar errors by type for analysis

### 3. Session Management
- Generate unique session IDs using UUID v4
- Store session ID in sessionStorage
- Track session duration and activity patterns

### 4. Device & Network Context
- Detect device type using user agent and viewport
- Monitor network quality using Network Information API
- Track online/offline status changes

### 5. Privacy Considerations
- Never track personal information from images
- Use anonymous session IDs
- Respect DNT (Do Not Track) headers
- Implement consent management if required

## Super Properties

Set these properties globally for all events:

```javascript
posthog.register({
  app_version: '1.0.0',
  platform: 'web',
  browser: navigator.userAgent,
  screen_width: window.screen.width,
  screen_height: window.screen.height,
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
});
```

## Custom Event Batching

For performance optimization on mobile devices:

```javascript
// Batch events every 5 seconds or when 10 events accumulate
posthog.config.batch_size = 10;
posthog.config.batch_flush_interval_ms = 5000;
```