#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

async function deployTemplateEngineMigration() {
  log('magenta', '🚀 Enhanced Template Engine Migration Deployment\n');
  
  const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '20250917_enhanced_template_engine.sql');
  
  if (!fs.existsSync(migrationFile)) {
    log('red', '❌ Migration file not found:', migrationFile);
    process.exit(1);
  }
  
  log('blue', '📋 Migration Deployment Steps:');
  log('cyan', '');
  log('cyan', '1. First, sync your migration history:');
  log('yellow', '   npx supabase migration repair --status applied 20250915');
  log('yellow', '   npx supabase migration repair --status applied 20250916');
  log('yellow', '   npx supabase migration repair --status applied 20250917205201');
  log('yellow', '   npx supabase migration repair --status applied 20250917205202');
  log('yellow', '   npx supabase migration repair --status applied 20250917210000');
  log('cyan', '');
  log('cyan', '2. Create a new timestamped migration:');
  log('yellow', '   npx supabase migration new enhanced_template_engine_final');
  log('cyan', '');
  log('cyan', '3. Copy the enhanced template engine content to the new migration file');
  log('cyan', '4. Deploy the migration:');
  log('yellow', '   npx supabase db push');
  log('cyan', '');
  
  // Read the migration content
  const migrationContent = fs.readFileSync(migrationFile, 'utf8');
  
  log('green', '✅ Migration file content ready');
  log('cyan', `📄 Size: ${Math.round(migrationContent.length / 1024)}KB`);
  
  const lines = migrationContent.split('\n');
  const summary = {
    tables: (migrationContent.match(/CREATE TABLE/g) || []).length,
    functions: (migrationContent.match(/CREATE OR REPLACE FUNCTION/g) || []).length,
    indexes: (migrationContent.match(/CREATE INDEX/g) || []).length,
    policies: (migrationContent.match(/CREATE POLICY/g) || []).length,
    inserts: (migrationContent.match(/INSERT INTO/g) || []).length
  };
  
  log('blue', '\n📊 Migration Summary:');
  log('green', `   • ${summary.tables} new tables`);
  log('green', `   • ${summary.functions} functions`);
  log('green', `   • ${summary.indexes} indexes`);
  log('green', `   • ${summary.policies} RLS policies`);
  log('green', `   • ${summary.inserts} data inserts`);
  
  log('cyan', '\n🔧 Tables to be created:');
  log('green', '   • wedding_styles - Rich wedding style definitions');
  log('green', '   • template_engine_config - Engine configuration');
  log('green', '   • custom_themes - User-created themes');
  log('green', '   • template_cache - Performance caching');
  log('green', '   • migration_log - Migration tracking');
  
  log('cyan', '\n⚡ Functions to be created:');
  log('green', '   • get_template_engine_stats() - System statistics');
  log('green', '   • cleanup_expired_cache() - Cache management');
  log('green', '   • update_cache_access() - Access tracking');
  
  log('yellow', '\n⚠️  Important Notes:');
  log('yellow', '   • This migration extends existing prompt_templates table');
  log('yellow', '   • Adds JSONB columns for enhanced features');
  log('yellow', '   • Creates 4 default wedding styles');
  log('yellow', '   • Includes comprehensive RLS policies');
  log('yellow', '   • No data loss - fully backward compatible');
  
  log('magenta', '\n✨ After successful deployment, your admin dashboard will have:');
  log('green', '   🎨 Full Theme Management interface');
  log('green', '   📊 Template Engine statistics');
  log('green', '   ⚙️  Configuration management');
  log('green', '   🗄️  Database-backed wedding styles');
  log('green', '   🚀 Enhanced prompt generation');
  
  log('blue', '\n🔗 Need help? Check the deployment guide:');
  log('cyan', '   docs/TEMPLATE_ENGINE_ARCHITECTURE.md');
  
  process.exit(0);
}

if (require.main === module) {
  deployTemplateEngineMigration().catch(console.error);
}

module.exports = { deployTemplateEngineMigration };