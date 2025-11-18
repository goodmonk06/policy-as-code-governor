#!/usr/bin/env node
/**
 * CLI tool for Policy-as-Code Governor
 */

import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { PolicyEvaluator } from '../engine/evaluator';
import type { EvaluationContext, Condition } from '../types/policy';
import { analyticsService } from '../services/analytics-service';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();
const evaluator = new PolicyEvaluator();
const program = new Command();

program
  .name('policy-cli')
  .description('CLI tool for Policy-as-Code Governor operations')
  .version('1.0.0');

// Seed command
program
  .command('seed')
  .description('Seed the database with demo data')
  .option('-s, --scenario <name>', 'Load a specific scenario', 'default')
  .action(async (options) => {
    try {
      console.log(`🌱 Seeding database with scenario: ${options.scenario}`);

      // For now, run the main seed script
      const { execSync } = require('child_process');
      execSync('npm run db:seed', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });

      console.log('✅ Seeding completed successfully!');
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Validate command
program
  .command('validate <file>')
  .description('Validate a policy JSON file')
  .action(async (file) => {
    try {
      console.log(`🔍 Validating policy file: ${file}`);

      const content = await fs.readFile(file, 'utf-8');
      const policy = JSON.parse(content);

      // Basic validation
      if (!policy.name) {
        throw new Error('Policy must have a name');
      }

      if (!policy.rules || !Array.isArray(policy.rules)) {
        throw new Error('Policy must have a rules array');
      }

      for (const rule of policy.rules) {
        if (!rule.name) throw new Error(`Rule missing name`);
        if (!rule.effect || !['ALLOW', 'DENY'].includes(rule.effect)) {
          throw new Error(`Rule '${rule.name}' has invalid effect`);
        }
        if (!rule.conditionJson) {
          throw new Error(`Rule '${rule.name}' missing conditionJson`);
        }
        if (typeof rule.priority !== 'number') {
          throw new Error(`Rule '${rule.name}' has invalid priority`);
        }
      }

      console.log('✅ Policy validation passed!');
      console.log(`   Name: ${policy.name}`);
      console.log(`   Rules: ${policy.rules.length}`);
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

// Export command
program
  .command('export')
  .description('Export all policies')
  .option('-f, --format <format>', 'Export format (json|yaml)', 'json')
  .option('-o, --output <file>', 'Output file', 'policies-export.json')
  .action(async (options) => {
    try {
      console.log(`📤 Exporting policies to ${options.output}...`);

      const policySets = await prisma.policySet.findMany({
        include: {
          rules: true,
          tags: {
            include: { tag: true }
          }
        }
      });

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        policySets: policySets.map(ps => ({
          name: ps.name,
          description: ps.description,
          category: ps.category,
          isActive: ps.isActive,
          tags: ps.tags.map(t => t.tag.name),
          rules: ps.rules.map(r => ({
            name: r.name,
            description: r.description,
            effect: r.effect,
            priority: r.priority,
            isEnabled: r.isEnabled,
            conditionJson: r.conditionJson
          }))
        }))
      };

      await fs.writeFile(options.output, JSON.stringify(exportData, null, 2));

      console.log('✅ Export completed!');
      console.log(`   Policy Sets: ${policySets.length}`);
      console.log(`   Total Rules: ${policySets.reduce((sum, ps) => sum + ps.rules.length, 0)}`);
    } catch (error) {
      console.error('❌ Export failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Import command
program
  .command('import <file>')
  .description('Import policies from a file')
  .option('--replace', 'Replace existing policies', false)
  .action(async (file, options) => {
    try {
      console.log(`📥 Importing policies from ${file}...`);

      const content = await fs.readFile(file, 'utf-8');
      const data = JSON.parse(content);

      if (!data.policySets || !Array.isArray(data.policySets)) {
        throw new Error('Invalid import format: missing policySets array');
      }

      if (options.replace) {
        console.log('⚠️  Replacing mode: deleting existing policies...');
        await prisma.policySet.deleteMany({});
      }

      let imported = 0;
      for (const ps of data.policySets) {
        await prisma.policySet.create({
          data: {
            name: ps.name,
            description: ps.description,
            category: ps.category,
            isActive: ps.isActive !== false,
            rules: {
              create: ps.rules.map((r: any) => ({
                name: r.name,
                description: r.description,
                effect: r.effect,
                priority: r.priority || 0,
                isEnabled: r.isEnabled !== false,
                conditionJson: r.conditionJson
              }))
            }
          }
        });
        imported++;
      }

      console.log(`✅ Import completed! Imported ${imported} policy sets.`);
    } catch (error) {
      console.error('❌ Import failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Test command
program
  .command('test <policySetId> <contextFile>')
  .description('Test policy evaluation from CLI')
  .action(async (policySetId, contextFile) => {
    try {
      console.log(`🧪 Testing policy evaluation...`);
      console.log(`   Policy Set ID: ${policySetId}`);
      console.log(`   Context File: ${contextFile}`);

      // Load context
      const contextContent = await fs.readFile(contextFile, 'utf-8');
      const context: EvaluationContext = JSON.parse(contextContent);

      // Fetch policy set
      const policySet = await prisma.policySet.findUnique({
        where: { id: policySetId },
        include: { rules: true }
      });

      if (!policySet) {
        throw new Error(`Policy set not found: ${policySetId}`);
      }

      // Evaluate
      const rules = policySet.rules.map(r => ({
        id: r.id,
        name: r.name,
        effect: r.effect as 'ALLOW' | 'DENY',
        conditionJson: r.conditionJson as Condition,
        priority: r.priority
      }));

      const result = evaluator.evaluate(rules, context);

      console.log('\n📊 Evaluation Result:');
      console.log(`   Decision: ${result.decision}`);
      console.log(`   Matched Rules: ${result.matchedRules.length}`);

      if (result.matchedRules.length > 0) {
        console.log('\n   Matched Rules Details:');
        for (const rule of result.matchedRules) {
          console.log(`   - ${rule.ruleName} (${rule.effect}, priority: ${rule.priority})`);
        }
      }

      console.log('\n✅ Test completed!');
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Analyze command
program
  .command('analyze')
  .description('Run analytics and generate reports')
  .option('-d, --days <days>', 'Number of days to analyze', '7')
  .action(async (options) => {
    try {
      const days = parseInt(options.days, 10);
      console.log(`📈 Analyzing system metrics for the last ${days} days...`);

      const analytics = await analyticsService.getSystemAnalytics(days);

      console.log('\n📊 System Analytics:');
      console.log(`   Total Policy Sets: ${analytics.totals.policySets}`);
      console.log(`   Active Policy Sets: ${analytics.totals.activePolicySets}`);
      console.log(`   Total Rules: ${analytics.totals.rules}`);
      console.log(`   Recent Evaluations: ${analytics.totals.recentEvaluations}`);

      console.log('\n🏆 Top Policy Sets by Usage:');
      for (const ps of analytics.topPolicySets.slice(0, 5)) {
        console.log(`   - ${ps.name}: ${ps.evaluationCount} evaluations`);
      }

      console.log('\n📊 Decision Distribution:');
      for (const d of analytics.decisionDistribution) {
        console.log(`   - ${d.decision}: ${d.count}`);
      }

      console.log('\n✅ Analysis completed!');
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// List command
program
  .command('list')
  .description('List all policy sets')
  .option('-a, --active-only', 'Show only active policy sets', false)
  .action(async (options) => {
    try {
      const policySets = await prisma.policySet.findMany({
        where: options.activeOnly ? { isActive: true } : undefined,
        include: {
          _count: {
            select: { rules: true, evaluationLogs: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`\n📋 Policy Sets (${policySets.length}):\n`);

      for (const ps of policySets) {
        console.log(`   ${ps.isActive ? '✓' : '✗'} ${ps.name} (${ps.id})`);
        console.log(`      Rules: ${ps._count.rules} | Evaluations: ${ps._count.evaluationLogs}`);
        if (ps.description) {
          console.log(`      ${ps.description}`);
        }
        console.log('');
      }
    } catch (error) {
      console.error('❌ Failed to list policy sets:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Aggregate command
program
  .command('aggregate')
  .description('Aggregate metrics for yesterday')
  .action(async () => {
    try {
      console.log('📊 Aggregating metrics for yesterday...');
      const results = await analyticsService.aggregateYesterdayMetrics();
      console.log(`✅ Aggregated metrics for ${results.length} policy sets`);
    } catch (error) {
      console.error('❌ Aggregation failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

program.parse();
