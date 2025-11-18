import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data
  await prisma.evaluationLog.deleteMany();
  await prisma.policyRule.deleteMany();
  await prisma.policySet.deleteMany();

  // Create demo policy set 1: Admin access control
  const adminPolicySet = await prisma.policySet.create({
    data: {
      name: 'Admin Access Control',
      description: 'Defines access rules for admin users',
      rules: {
        create: [
          {
            name: 'Admin Full Access',
            description: 'Admins can perform any action',
            effect: 'ALLOW',
            priority: 100,
            conditionJson: {
              equals: ['user.role', 'admin']
            }
          },
          {
            name: 'Deny Delete for Non-Admins',
            description: 'Only admins can delete resources',
            effect: 'DENY',
            priority: 90,
            conditionJson: {
              all: [
                { notEquals: ['user.role', 'admin'] },
                { equals: ['action', 'delete'] }
              ]
            }
          }
        ]
      }
    }
  });

  // Create demo policy set 2: Department-based access
  const departmentPolicySet = await prisma.policySet.create({
    data: {
      name: 'Department-Based Access',
      description: 'Access control based on user department',
      rules: {
        create: [
          {
            name: 'Engineering Can Deploy',
            description: 'Engineering team can deploy applications',
            effect: 'ALLOW',
            priority: 80,
            conditionJson: {
              all: [
                { equals: ['user.department', 'engineering'] },
                { in: ['action', ['deploy', 'build', 'test']] }
              ]
            }
          },
          {
            name: 'HR Can View Employee Data',
            description: 'HR can view employee information',
            effect: 'ALLOW',
            priority: 80,
            conditionJson: {
              all: [
                { equals: ['user.department', 'hr'] },
                { equals: ['action', 'view'] },
                { equals: ['resource.type', 'employee'] }
              ]
            }
          },
          {
            name: 'Finance Can Approve Budgets',
            description: 'Finance team can approve budget requests',
            effect: 'ALLOW',
            priority: 80,
            conditionJson: {
              all: [
                { equals: ['user.department', 'finance'] },
                { in: ['action', ['approve', 'view']] },
                { equals: ['resource.type', 'budget'] }
              ]
            }
          }
        ]
      }
    }
  });

  // Create demo policy set 3: Resource ownership
  const ownershipPolicySet = await prisma.policySet.create({
    data: {
      name: 'Resource Ownership',
      description: 'Users can manage their own resources',
      rules: {
        create: [
          {
            name: 'Owner Can Edit',
            description: 'Resource owners can edit their resources',
            effect: 'ALLOW',
            priority: 70,
            conditionJson: {
              all: [
                { equals: ['user.id', 'resource.owner'] },
                { in: ['action', ['view', 'edit', 'update']] }
              ]
            }
          },
          {
            name: 'Owner Cannot Delete Critical',
            description: 'Even owners cannot delete critical resources',
            effect: 'DENY',
            priority: 95,
            conditionJson: {
              all: [
                { equals: ['action', 'delete'] },
                { equals: ['resource.critical', true] }
              ]
            }
          }
        ]
      }
    }
  });

  // Create demo policy set 4: Time-based access
  const timePolicySet = await prisma.policySet.create({
    data: {
      name: 'Time-Based Access',
      description: 'Access restrictions based on time and context',
      rules: {
        create: [
          {
            name: 'Staff Business Hours Access',
            description: 'Staff can access during business hours',
            effect: 'ALLOW',
            priority: 60,
            conditionJson: {
              all: [
                { equals: ['user.role', 'staff'] },
                { in: ['action', ['view', 'edit']] }
              ]
            }
          },
          {
            name: 'Block Untrusted Networks',
            description: 'Deny access from untrusted IP ranges',
            effect: 'DENY',
            priority: 100,
            conditionJson: {
              startsWith: ['environment.ip', '192.168']
            }
          }
        ]
      }
    }
  });

  // Create demo policy set 5: Complex multi-condition
  const complexPolicySet = await prisma.policySet.create({
    data: {
      name: 'Complex Multi-Condition Policy',
      description: 'Demonstrates complex condition logic with any/all/not',
      rules: {
        create: [
          {
            name: 'Senior Staff Advanced Access',
            description: 'Senior staff with specific attributes get advanced access',
            effect: 'ALLOW',
            priority: 75,
            conditionJson: {
              all: [
                { in: ['user.role', ['senior_staff', 'lead', 'manager']] },
                {
                  any: [
                    { equals: ['user.certified', true] },
                    { greaterThanOrEqual: ['user.yearsExperience', 5] }
                  ]
                },
                { in: ['action', ['view', 'edit', 'approve']] }
              ]
            }
          },
          {
            name: 'Restrict Sensitive Resources',
            description: 'Sensitive resources require special access',
            effect: 'DENY',
            priority: 85,
            conditionJson: {
              all: [
                { equals: ['resource.type', 'sensitive'] },
                {
                  not: {
                    equals: ['user.clearanceLevel', 'top-secret']
                  }
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Created Policy Sets:');
  console.log(`  1. ${adminPolicySet.name} (${adminPolicySet.id})`);
  console.log(`  2. ${departmentPolicySet.name} (${departmentPolicySet.id})`);
  console.log(`  3. ${ownershipPolicySet.name} (${ownershipPolicySet.id})`);
  console.log(`  4. ${timePolicySet.name} (${timePolicySet.id})`);
  console.log(`  5. ${complexPolicySet.name} (${complexPolicySet.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
