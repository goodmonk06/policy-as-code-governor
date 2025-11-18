import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with enhanced scenarios...');

  // Clean up existing data
  await prisma.evaluationLog.deleteMany();
  await prisma.evaluationMetrics.deleteMany();
  await prisma.policyComment.deleteMany();
  await prisma.policySetTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.policyTemplate.deleteMany();
  await prisma.policyVersion.deleteMany();
  await prisma.policyRule.deleteMany();
  await prisma.policySet.deleteMany();

  console.log('📋 Creating tags...');

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'security', color: '#e74c3c', description: 'Security-related policies' } }),
    prisma.tag.create({ data: { name: 'compliance', color: '#3498db', description: 'Regulatory compliance' } }),
    prisma.tag.create({ data: { name: 'rbac', color: '#2ecc71', description: 'Role-based access control' } }),
    prisma.tag.create({ data: { name: 'production', color: '#f39c12', description: 'Production environment' } }),
    prisma.tag.create({ data: { name: 'experimental', color: '#9b59b6', description: 'Experimental policies' } }),
    prisma.tag.create({ data: { name: 'audit', color: '#34495e', description: 'Audit and logging' } })
  ]);

  console.log(`✅ Created ${tags.length} tags`);

  console.log('📝 Creating policy templates...');

  // Create policy templates
  await prisma.policyTemplate.create({
    data: {
      name: 'Role-Based Access Template',
      description: 'Template for simple role-based access control',
      category: 'rbac',
      variables: {
        role: { type: 'string', description: 'The role to check', default: 'admin' },
        actions: { type: 'array', description: 'Allowed actions', default: ['view', 'edit'] }
      },
      rulesTemplate: [
        {
          name: '{{role}} Access',
          effect: 'ALLOW',
          priority: 50,
          conditionJson: {
            all: [
              { equals: ['user.role', '{{role}}'] },
              { in: ['action', '{{actions}}'] }
            ]
          }
        }
      ],
      exampleUsage: 'Use this template to quickly create role-based access policies. Replace {{role}} and {{actions}} with your values.'
    }
  });

  await prisma.policyTemplate.create({
    data: {
      name: 'Resource Ownership Template',
      description: 'Template for owner-based resource access',
      category: 'ownership',
      variables: {
        actions: { type: 'array', description: 'Actions owners can perform', default: ['view', 'edit', 'delete'] }
      },
      rulesTemplate: [
        {
          name: 'Owner Can Manage',
          effect: 'ALLOW',
          priority: 70,
          conditionJson: {
            all: [
              { equals: ['user.id', 'resource.owner'] },
              { in: ['action', '{{actions}}'] }
            ]
          }
        }
      ],
      exampleUsage: 'Use this template for policies where users can manage their own resources.'
    }
  });

  console.log('✅ Created policy templates');

  console.log('🏢 Creating Enterprise RBAC scenario...');

  // Scenario 1: Enterprise RBAC
  const enterpriseRBAC = await prisma.policySet.create({
    data: {
      name: 'Enterprise RBAC',
      description: 'Comprehensive role-based access control for enterprise applications',
      category: 'rbac',
      isActive: true,
      rules: {
        create: [
          {
            name: 'Super Admin Full Access',
            description: 'Super admins have unrestricted access',
            effect: 'ALLOW',
            priority: 100,
            isEnabled: true,
            conditionJson: { equals: ['user.role', 'super_admin'] }
          },
          {
            name: 'Admin Management Access',
            effect: 'ALLOW',
            priority: 90,
            conditionJson: {
              all: [
                { equals: ['user.role', 'admin'] },
                { in: ['action', ['view', 'edit', 'delete', 'manage']] }
              ]
            }
          },
          {
            name: 'Manager Approval Rights',
            effect: 'ALLOW',
            priority: 80,
            conditionJson: {
              all: [
                { equals: ['user.role', 'manager'] },
                { in: ['action', ['view', 'edit', 'approve']] }
              ]
            }
          },
          {
            name: 'Staff Read-Write Access',
            effect: 'ALLOW',
            priority: 70,
            conditionJson: {
              all: [
                { equals: ['user.role', 'staff'] },
                { in: ['action', ['view', 'edit']] },
                { notEquals: ['resource.type', 'sensitive'] }
              ]
            }
          },
          {
            name: 'Guest Read-Only Access',
            effect: 'ALLOW',
            priority: 60,
            conditionJson: {
              all: [
                { equals: ['user.role', 'guest'] },
                { equals: ['action', 'view'] },
                { equals: ['resource.public', true] }
              ]
            }
          },
          {
            name: 'Block Suspended Users',
            effect: 'DENY',
            priority: 95,
            conditionJson: { equals: ['user.status', 'suspended'] }
          }
        ]
      }
    }
  });

  // Tag the policy set
  await prisma.policySetTag.create({
    data: {
      policySetId: enterpriseRBAC.id,
      tagId: tags.find(t => t.name === 'rbac')!.id
    }
  });

  await prisma.policySetTag.create({
    data: {
      policySetId: enterpriseRBAC.id,
      tagId: tags.find(t => t.name === 'production')!.id
    }
  });

  // Add comments
  await prisma.policyComment.create({
    data: {
      policySetId: enterpriseRBAC.id,
      userId: 'system',
      content: 'Initial policy set created with standard enterprise roles'
    }
  });

  console.log(`✅ Created Enterprise RBAC policy set (${enterpriseRBAC.id})`);

  console.log('🏥 Creating Healthcare Compliance scenario...');

  // Scenario 2: Healthcare Compliance (HIPAA-style)
  const healthcareCompliance = await prisma.policySet.create({
    data: {
      name: 'Healthcare Data Access',
      description: 'HIPAA-compliant access control for patient data',
      category: 'compliance',
      isActive: true,
      rules: {
        create: [
          {
            name: 'Doctor Can Access Patient Records',
            effect: 'ALLOW',
            priority: 100,
            conditionJson: {
              all: [
                { equals: ['user.role', 'doctor'] },
                { equals: ['user.verified', true] },
                { in: ['action', ['view', 'edit']] },
                { equals: ['resource.type', 'patient_record'] }
              ]
            }
          },
          {
            name: 'Nurse Limited Access',
            effect: 'ALLOW',
            priority: 90,
            conditionJson: {
              all: [
                { equals: ['user.role', 'nurse'] },
                { equals: ['action', 'view'] },
                { equals: ['resource.type', 'patient_record'] },
                { equals: ['user.department', 'resource.department'] }
              ]
            }
          },
          {
            name: 'Admin Can View Anonymized Data',
            effect: 'ALLOW',
            priority: 80,
            conditionJson: {
              all: [
                { equals: ['user.role', 'admin'] },
                { equals: ['action', 'view'] },
                { equals: ['resource.anonymized', true] }
              ]
            }
          },
          {
            name: 'Block Access to Restricted Records',
            effect: 'DENY',
            priority: 95,
            conditionJson: {
              all: [
                { equals: ['resource.restricted', true] },
                { notEquals: ['user.clearance', 'top'] }
              ]
            }
          },
          {
            name: 'Require Consent for Research',
            effect: 'DENY',
            priority: 90,
            conditionJson: {
              all: [
                { equals: ['resource.type', 'patient_record'] },
                { equals: ['user.purpose', 'research'] },
                { notEquals: ['resource.consentGiven', true] }
              ]
            }
          }
        ]
      }
    }
  });

  await prisma.policySetTag.createMany({
    data: [
      { policySetId: healthcareCompliance.id, tagId: tags.find(t => t.name === 'compliance')!.id },
      { policySetId: healthcareCompliance.id, tagId: tags.find(t => t.name === 'security')!.id },
      { policySetId: healthcareCompliance.id, tagId: tags.find(t => t.name === 'production')!.id }
    ]
  });

  console.log(`✅ Created Healthcare Compliance policy set (${healthcareCompliance.id})`);

  console.log('💰 Creating Financial Services scenario...');

  // Scenario 3: Financial Services (SOX Compliance)
  const financialServices = await prisma.policySet.create({
    data: {
      name: 'Financial Services Access Control',
      description: 'SOX-compliant access control for financial systems',
      category: 'compliance',
      isActive: true,
      rules: {
        create: [
          {
            name: 'Auditor Read-Only Access',
            effect: 'ALLOW',
            priority: 100,
            conditionJson: {
              all: [
                { equals: ['user.role', 'auditor'] },
                { equals: ['action', 'view'] }
              ]
            }
          },
          {
            name: 'Accountant Transaction Access',
            effect: 'ALLOW',
            priority: 90,
            conditionJson: {
              all: [
                { equals: ['user.role', 'accountant'] },
                { in: ['action', ['view', 'create']] },
                { equals: ['resource.type', 'transaction'] },
                { lessThanOrEqual: ['resource.amount', 10000] }
              ]
            }
          },
          {
            name: 'Manager Approval for Large Transactions',
            effect: 'ALLOW',
            priority: 85,
            conditionJson: {
              all: [
                { equals: ['user.role', 'manager'] },
                { equals: ['action', 'approve'] },
                { equals: ['resource.type', 'transaction'] },
                { greaterThan: ['resource.amount', 10000] }
              ]
            }
          },
          {
            name: 'Require Dual Authorization',
            effect: 'DENY',
            priority: 95,
            conditionJson: {
              all: [
                { greaterThan: ['resource.amount', 50000] },
                { notEquals: ['request.dualAuthProvided', true] }
              ]
            }
          },
          {
            name: 'Block Out-of-Hours Trading',
            effect: 'DENY',
            priority: 90,
            conditionJson: {
              all: [
                { equals: ['resource.type', 'trade'] },
                { equals: ['action', 'execute'] },
                { notIn: ['environment.time.hour', [9, 10, 11, 12, 13, 14, 15, 16]] }
              ]
            }
          }
        ]
      }
    }
  });

  await prisma.policySetTag.createMany({
    data: [
      { policySetId: financialServices.id, tagId: tags.find(t => t.name === 'compliance')!.id },
      { policySetId: financialServices.id, tagId: tags.find(t => t.name === 'audit')!.id }
    ]
  });

  console.log(`✅ Created Financial Services policy set (${financialServices.id})`);

  console.log('🚀 Creating DevOps CI/CD scenario...');

  // Scenario 4: DevOps CI/CD Pipeline
  const devOpsCICD = await prisma.policySet.create({
    data: {
      name: 'CI/CD Pipeline Access',
      description: 'Access control for deployment and CI/CD operations',
      category: 'devops',
      isActive: true,
      rules: {
        create: [
          {
            name: 'Developers Can Deploy to Dev',
            effect: 'ALLOW',
            priority: 80,
            conditionJson: {
              all: [
                { equals: ['user.role', 'developer'] },
                { equals: ['action', 'deploy'] },
                { equals: ['resource.environment', 'development'] }
              ]
            }
          },
          {
            name: 'Developers Can Run Tests',
            effect: 'ALLOW',
            priority: 75,
            conditionJson: {
              all: [
                { equals: ['user.role', 'developer'] },
                { in: ['action', ['test', 'build', 'lint']] }
              ]
            }
          },
          {
            name: 'DevOps Can Deploy to Staging',
            effect: 'ALLOW',
            priority: 85,
            conditionJson: {
              all: [
                { in: ['user.role', ['devops', 'sre']] },
                { equals: ['action', 'deploy'] },
                { equals: ['resource.environment', 'staging'] }
              ]
            }
          },
          {
            name: 'Only DevOps Lead Can Deploy to Production',
            effect: 'ALLOW',
            priority: 90,
            conditionJson: {
              all: [
                { equals: ['user.role', 'devops_lead'] },
                { equals: ['action', 'deploy'] },
                { equals: ['resource.environment', 'production'] },
                { equals: ['request.approvalProvided', true] }
              ]
            }
          },
          {
            name: 'Block Production Deploy Without Tests',
            effect: 'DENY',
            priority: 95,
            conditionJson: {
              all: [
                { equals: ['action', 'deploy'] },
                { equals: ['resource.environment', 'production'] },
                { notEquals: ['resource.testsPass', true] }
              ]
            }
          },
          {
            name: 'Block Weekend Production Deploys',
            effect: 'DENY',
            priority: 85,
            conditionJson: {
              all: [
                { equals: ['action', 'deploy'] },
                { equals: ['resource.environment', 'production'] },
                { in: ['environment.time.day', ['Saturday', 'Sunday']] },
                { notEquals: ['request.emergencyDeploy', true] }
              ]
            }
          }
        ]
      }
    }
  });

  await prisma.policySetTag.create({
    data: {
      policySetId: devOpsCICD.id,
      tagId: tags.find(t => t.name === 'production')!.id
    }
  });

  console.log(`✅ Created DevOps CI/CD policy set (${devOpsCICD.id})`);

  console.log('🔬 Creating Multi-Tenant SaaS scenario...');

  // Scenario 5: Multi-Tenant SaaS
  const multiTenantSaaS = await prisma.policySet.create({
    data: {
      name: 'Multi-Tenant SaaS Access',
      description: 'Tenant isolation and access control for SaaS platform',
      category: 'saas',
      isActive: true,
      rules: {
        create: [
          {
            name: 'Tenant Admin Full Access to Own Resources',
            effect: 'ALLOW',
            priority: 100,
            conditionJson: {
              all: [
                { equals: ['user.role', 'tenant_admin'] },
                { equals: ['user.tenantId', 'resource.tenantId'] }
              ]
            }
          },
          {
            name: 'Tenant User Limited Access',
            effect: 'ALLOW',
            priority: 90,
            conditionJson: {
              all: [
                { equals: ['user.role', 'tenant_user'] },
                { equals: ['user.tenantId', 'resource.tenantId'] },
                { in: ['action', ['view', 'edit']] },
                { equals: ['resource.shared', true] }
              ]
            }
          },
          {
            name: 'Platform Admin Cross-Tenant Access',
            effect: 'ALLOW',
            priority: 95,
            conditionJson: {
              equals: ['user.role', 'platform_admin']
            }
          },
          {
            name: 'Block Cross-Tenant Access',
            effect: 'DENY',
            priority: 100,
            conditionJson: {
              all: [
                { notEquals: ['user.tenantId', 'resource.tenantId'] },
                { notEquals: ['user.role', 'platform_admin'] }
              ]
            }
          },
          {
            name: 'Block Deleted Tenant Access',
            effect: 'DENY',
            priority: 98,
            conditionJson: {
              equals: ['user.tenantStatus', 'deleted']
            }
          }
        ]
      }
    }
  });

  await prisma.policySetTag.createMany({
    data: [
      { policySetId: multiTenantSaaS.id, tagId: tags.find(t => t.name === 'security')!.id },
      { policySetId: multiTenantSaaS.id, tagId: tags.find(t => t.name === 'production')!.id }
    ]
  });

  console.log(`✅ Created Multi-Tenant SaaS policy set (${multiTenantSaaS.id})`);

  // Create versions for a couple of policy sets
  console.log('📦 Creating policy versions...');

  await prisma.policyVersion.create({
    data: {
      policySetId: enterpriseRBAC.id,
      versionNumber: 1,
      name: enterpriseRBAC.name,
      description: enterpriseRBAC.description,
      rulesSnapshot: await prisma.policyRule.findMany({
        where: { policySetId: enterpriseRBAC.id }
      }) as unknown as object,
      changeDescription: 'Initial version',
      createdBy: 'system'
    }
  });

  console.log('✅ Created policy versions');

  console.log('\n📊 Database seeded successfully!');
  console.log('\nCreated:');
  console.log(`  - ${tags.length} tags`);
  console.log(`  - 2 policy templates`);
  console.log(`  - 5 comprehensive policy sets:`);
  console.log(`    1. Enterprise RBAC (${enterpriseRBAC.id})`);
  console.log(`    2. Healthcare Compliance (${healthcareCompliance.id})`);
  console.log(`    3. Financial Services (${financialServices.id})`);
  console.log(`    4. DevOps CI/CD (${devOpsCICD.id})`);
  console.log(`    5. Multi-Tenant SaaS (${multiTenantSaaS.id})`);
  console.log(`\n🎯 Use these IDs to test policy evaluation!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
