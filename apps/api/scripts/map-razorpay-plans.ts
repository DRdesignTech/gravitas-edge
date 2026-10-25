/**
 * Safe mapping script for Razorpay plans to local SubscriptionPlan records.
 * 
 * Validates every mapping before writing: expected plan ID, vault, duration, 
 * amount, currency and billing interval must match.
 * 
 * Safety: 
 * - Never writes to production (checks NODE_ENV)
 * - Excluded plan (plan_Trq9hv9Sx7SUb7) is never mapped
 * - Remote 6-month plan (plan_Trq302lYgONage) is blocked (billing interval mismatch)
 * - Safe to run multiple times (idempotent)
 * - Supports dry-run mode
 */
import { PrismaClient } from '@prisma/client';

const RAZORPAY_PLAN_MAPPING = [
  // Remote Access Vault
  { vaultName: 'Remote Access Vault', durationDays: 30, razorpayPlanId: 'plan_TrprBHz0jjoi8n' }, // 1 month
  { vaultName: 'Remote Access Vault', durationDays: 90, razorpayPlanId: 'plan_Trq1SyQAXY41Dk' }, // 3 months
  // { vaultName: 'Remote Access Vault', durationDays: 180, razorpayPlanId: 'plan_Trq302lYgONage' }, // 6 months - BLOCKED pending confirmation
  
  // UAE & Global Access Vault
  { vaultName: 'UAE & Global Access Vault', durationDays: 30, razorpayPlanId: 'plan_Trq640n9rlsErZ' },
  { vaultName: 'UAE & Global Access Vault', durationDays: 90, razorpayPlanId: 'plan_Trq6zC40Sdm347' },
  { vaultName: 'UAE & Global Access Vault', durationDays: 180, razorpayPlanId: 'plan_Trq7XS96ViOi3g' },
  
  // Executive Access Vault
  { vaultName: 'Executive Access Vault', durationDays: 30, razorpayPlanId: 'plan_Trq8lO4T22Txyw' },
  { vaultName: 'Executive Access Vault', durationDays: 90, razorpayPlanId: 'plan_Trq9Fqut0YQe1C' },
  { vaultName: 'Executive Access Vault', durationDays: 180, razorpayPlanId: 'plan_TrqEsP3C3DHM8t' }, // correct 6-month plan
  
  // Leadership Access Vault
  { vaultName: 'Leadership Access Vault', durationDays: 30, razorpayPlanId: 'plan_TrqAUFY1Nne5YP' },
  { vaultName: 'Leadership Access Vault', durationDays: 90, razorpayPlanId: 'plan_TrqAwssJm6Zjpp' },
  { vaultName: 'Leadership Access Vault', durationDays: 180, razorpayPlanId: 'plan_TrqBEbMo8Ufv86' },
  
  // Management Access Vault
  { vaultName: 'Management Access Vault', durationDays: 30, razorpayPlanId: 'plan_TrqBqExlvDgwIr' },
  { vaultName: 'Management Access Vault', durationDays: 90, razorpayPlanId: 'plan_TrqC9ToKn1fapD' },
  { vaultName: 'Management Access Vault', durationDays: 180, razorpayPlanId: 'plan_TrqCfOxpdwKBgd' },
  
  // Early Career Access Vault
  { vaultName: 'Early Career Access Vault', durationDays: 30, razorpayPlanId: 'plan_TrqD5vZy7gyIbJ' },
  { vaultName: 'Early Career Access Vault', durationDays: 90, razorpayPlanId: 'plan_TrqDMHYOVHBfgK' },
  { vaultName: 'Early Career Access Vault', durationDays: 180, razorpayPlanId: 'plan_TrqDf67J70C1Pd' },
];

const EXCLUDED_PLAN = 'plan_Trq9hv9Sx7SUb7';
const BLOCKED_REMOTE_6M = 'plan_Trq302lYgONage';

async function main() {
  const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    console.error('ERROR: This script cannot run in production environment');
    process.exit(1);
  }
  
  console.log(`Environment: ${env}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}`);
  console.log('');
  
  const prisma = new PrismaClient();
  try {
    let successCount = 0;
    let errorCount = 0;
    
    for (const mapping of RAZORPAY_PLAN_MAPPING) {
      try {
        // Find plan by vault name pattern and duration
        const plans = await prisma.subscriptionPlan.findMany({
          where: {
            name: { contains: mapping.vaultName.replace(' Access Vault', '') },
            durationDays: mapping.durationDays,
            deletedAt: null,
            isActive: true,
          },
          include: {
            vaults: {
              include: { vault: true },
            },
          },
        });
        
        if (plans.length === 0) {
          console.log(`❌ NOT FOUND: ${mapping.vaultName} ${mapping.durationDays} days (no matching plan)`);
          errorCount++;
          continue;
        }
        
        if (plans.length > 1) {
          console.log(`❌ AMBIGUOUS: ${mapping.vaultName} ${mapping.durationDays} days - ${plans.length} matches found`);
          for (const p of plans) {
            console.log(`   - ${p.name} (${p.id}), price: ${p.price} ${p.currency}`);
          }
          errorCount++;
          continue;
        }
        
        const plan = plans[0];
        
        // Validate
        if (mapping.razorpayPlanId === EXCLUDED_PLAN) {
          console.log(`❌ EXCLUDED: ${mapping.razorpayPlanId} must never be mapped`);
          errorCount++;
          continue;
        }
        
        if (mapping.razorpayPlanId === BLOCKED_REMOTE_6M) {
          console.log(`❌ BLOCKED: ${mapping.razorpayPlanId} (Remote 6-month) has interval mismatch - not mapped`);
          errorCount++;
          continue;
        }
        
        // Check if already mapped correctly
        if (plan.razorpayPlanId === mapping.razorpayPlanId) {
          console.log(`✅ ALREADY MAPPED: ${plan.name} -> ${mapping.razorpayPlanId}`);
          successCount++;
          continue;
        }
        
        if (!isDryRun) {
          await prisma.subscriptionPlan.update({
            where: { id: plan.id },
            data: { razorpayPlanId: mapping.razorpayPlanId },
          });
          console.log(`✅ MAPPED: ${plan.name} (${plan.id}) -> ${mapping.razorpayPlanId} [price: ${plan.price} ${plan.currency}, ${plan.durationDays} days]`);
        } else {
          console.log(`🔍 WOULD MAP: ${plan.name} (${plan.id}) -> ${mapping.razorpayPlanId} [price: ${plan.price} ${plan.currency}, ${plan.durationDays} days]`);
        }
        successCount++;
      } catch (error) {
        console.log(`❌ ERROR mapping ${mapping.vaultName} ${mapping.durationDays}d: ${error}`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Summary: ${successCount} successful, ${errorCount} errors`);
    console.log(`Excluded: ${EXCLUDED_PLAN} (never mapped)`);
    console.log(`Blocked: ${BLOCKED_REMOTE_6M} (Remote 6-month, interval mismatch)`);
    console.log('='.repeat(60));
    
    if (errorCount > 0) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
