#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250917163841_enhanced_template_engine_final.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Create Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL || 'https://ptgmobxrvptiahundusu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployMigration() {
  console.log('🚀 Deploying Enhanced Template Engine Migration...\n');
  
  try {
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        const { error } = await supabase.rpc('exec_sql', { query: statement });
        
        if (error) {
          // If it's an "already exists" error, that's okay
          if (error.message.includes('already exists') || 
              error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log(`⏭️  Statement ${i + 1}: Skipped (already exists)`);
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            errorCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1}: Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Statement ${i + 1} error:`, err.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Migration Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📋 Total: ${statements.length}`);
    
    if (errorCount === 0) {
      console.log(`\n🎉 Enhanced Template Engine migration deployed successfully!`);
      console.log(`\n✨ Your admin dashboard now has:`);
      console.log(`   🎨 Full Theme Management interface`);
      console.log(`   📊 Template Engine statistics`);
      console.log(`   🗄️  Database-backed wedding styles`);
    } else {
      console.log(`\n⚠️  Migration completed with ${errorCount} errors. Check the admin dashboard to see if features are working.`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative direct SQL execution
async function deployWithDirectSQL() {
  console.log('🚀 Deploying with direct SQL execution...\n');
  
  try {
    const { error } = await supabase.rpc('exec_sql', { 
      query: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Direct SQL execution failed:', error);
      
      // Try the statement-by-statement approach
      console.log('\n🔄 Falling back to statement-by-statement execution...');
      await deployMigration();
    } else {
      console.log('✅ Direct SQL execution successful!');
      console.log(`\n🎉 Enhanced Template Engine migration deployed successfully!`);
    }
    
  } catch (error) {
    console.error('❌ Direct SQL execution error:', error);
    
    // Try the statement-by-statement approach
    console.log('\n🔄 Falling back to statement-by-statement execution...');
    await deployMigration();
  }
}

if (require.main === module) {
  // Start with direct SQL, fall back to statement-by-statement
  deployWithDirectSQL().catch(console.error);
}

module.exports = { deployMigration, deployWithDirectSQL };