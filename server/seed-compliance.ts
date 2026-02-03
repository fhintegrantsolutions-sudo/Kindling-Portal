import { complianceStorage } from './compliance-storage';
import type { 
  InsertRole, 
  InsertPermission, 
  InsertAccount 
} from '../shared/compliance-schema';

/**
 * Seed data for compliance infrastructure
 * Run with: GOOGLE_APPLICATION_CREDENTIALS=./kindling-portal-firebase-adminsdk-fbsvc-72b51e1944.json npx tsx server/seed-compliance.ts
 */

// Define default roles
const defaultRoles: InsertRole[] = [
  {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    isSystem: true,
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access to manage users, entities, and platform operations',
    isSystem: true,
  },
  {
    name: 'accountant',
    displayName: 'Accountant',
    description: 'Access to financial records, ledger, and accounting functions',
    isSystem: true,
  },
  {
    name: 'lender',
    displayName: 'Lender',
    description: 'Can view opportunities, make investments, and manage their portfolio',
    isSystem: false,
  },
  {
    name: 'borrower',
    displayName: 'Borrower',
    description: 'Can view their notes, make payments, and manage borrower profile',
    isSystem: false,
  },
  {
    name: 'compliance_officer',
    displayName: 'Compliance Officer',
    description: 'Can review KYC documents, approve entities, and access audit logs',
    isSystem: true,
  },
];

// Define all permissions
const defaultPermissions: InsertPermission[] = [
  // User management permissions
  { resource: 'users', action: 'read', description: 'View user information' },
  { resource: 'users', action: 'create', description: 'Create new users' },
  { resource: 'users', action: 'update', description: 'Update user information' },
  { resource: 'users', action: 'delete', description: 'Delete users' },
  
  // Entity management permissions
  { resource: 'entities', action: 'read', description: 'View entity information' },
  { resource: 'entities', action: 'create', description: 'Create new entities' },
  { resource: 'entities', action: 'update', description: 'Update entity information' },
  { resource: 'entities', action: 'delete', description: 'Delete entities' },
  { resource: 'entities', action: 'approve_kyc', description: 'Approve KYC for entities' },
  
  // Role management permissions
  { resource: 'roles', action: 'read', description: 'View roles and permissions' },
  { resource: 'roles', action: 'create', description: 'Create new roles' },
  { resource: 'roles', action: 'update', description: 'Update roles' },
  { resource: 'roles', action: 'delete', description: 'Delete roles' },
  { resource: 'roles', action: 'assign', description: 'Assign roles to users' },
  
  // Note management permissions
  { resource: 'notes', action: 'read', description: 'View notes' },
  { resource: 'notes', action: 'create', description: 'Create new notes' },
  { resource: 'notes', action: 'update', description: 'Update notes' },
  { resource: 'notes', action: 'delete', description: 'Delete notes' },
  { resource: 'notes', action: 'read_all', description: 'View all notes in system' },
  
  // Investment management permissions
  { resource: 'investments', action: 'read', description: 'View investments' },
  { resource: 'investments', action: 'create', description: 'Create new investments' },
  { resource: 'investments', action: 'update', description: 'Update investments' },
  { resource: 'investments', action: 'delete', description: 'Delete investments' },
  { resource: 'investments', action: 'read_all', description: 'View all investments in system' },
  { resource: 'investments', action: 'approve', description: 'Approve investment transactions' },
  
  // Payment management permissions
  { resource: 'payments', action: 'read', description: 'View payments' },
  { resource: 'payments', action: 'create', description: 'Create new payments' },
  { resource: 'payments', action: 'update', description: 'Update payments' },
  { resource: 'payments', action: 'delete', description: 'Delete payments' },
  { resource: 'payments', action: 'read_all', description: 'View all payments in system' },
  { resource: 'payments', action: 'approve', description: 'Approve payment transactions' },
  
  // Document management permissions
  { resource: 'documents', action: 'read', description: 'View documents' },
  { resource: 'documents', action: 'create', description: 'Upload new documents' },
  { resource: 'documents', action: 'update', description: 'Update documents' },
  { resource: 'documents', action: 'delete', description: 'Delete documents' },
  { resource: 'documents', action: 'approve', description: 'Approve documents' },
  { resource: 'documents', action: 'reject', description: 'Reject documents' },
  
  // Lender management permissions
  { resource: 'lenders', action: 'read', description: 'View lender information' },
  { resource: 'lenders', action: 'create', description: 'Create lender profiles' },
  { resource: 'lenders', action: 'update', description: 'Update lender profiles' },
  { resource: 'lenders', action: 'delete', description: 'Delete lender profiles' },
  
  // Borrower management permissions
  { resource: 'borrowers', action: 'read', description: 'View borrower information' },
  { resource: 'borrowers', action: 'create', description: 'Create borrower profiles' },
  { resource: 'borrowers', action: 'update', description: 'Update borrower profiles' },
  { resource: 'borrowers', action: 'delete', description: 'Delete borrower profiles' },
  
  // Accounting permissions
  { resource: 'accounts', action: 'read', description: 'View chart of accounts' },
  { resource: 'accounts', action: 'create', description: 'Create new accounts' },
  { resource: 'accounts', action: 'update', description: 'Update accounts' },
  { resource: 'accounts', action: 'delete', description: 'Delete accounts' },
  
  // Ledger permissions
  { resource: 'ledger', action: 'read', description: 'View ledger entries' },
  { resource: 'ledger', action: 'create', description: 'Create ledger entries' },
  { resource: 'ledger', action: 'update', description: 'Update ledger entries' },
  { resource: 'ledger', action: 'post', description: 'Post ledger events' },
  { resource: 'ledger', action: 'reverse', description: 'Reverse ledger events' },
  { resource: 'ledger', action: 'reconcile', description: 'Reconcile ledger entries' },
  
  // Audit log permissions
  { resource: 'audit_logs', action: 'read', description: 'View audit logs' },
  { resource: 'audit_logs', action: 'read_all', description: 'View all audit logs' },
  
  // System permissions
  { resource: 'system', action: 'configure', description: 'Configure system settings' },
  { resource: 'system', action: 'backup', description: 'Create system backups' },
  { resource: 'system', action: 'restore', description: 'Restore from backups' },
];

// Define role-permission mappings
const rolePermissions: Record<string, string[]> = {
  super_admin: [
    // Super admin gets ALL permissions
    ...defaultPermissions.map(p => `${p.resource}.${p.action}`)
  ],
  
  admin: [
    'users.read', 'users.create', 'users.update', 'users.delete',
    'entities.read', 'entities.create', 'entities.update', 'entities.delete',
    'roles.read', 'roles.assign',
    'notes.read_all', 'notes.create', 'notes.update', 'notes.delete',
    'investments.read_all', 'investments.create', 'investments.update', 'investments.delete', 'investments.approve',
    'payments.read_all', 'payments.create', 'payments.update', 'payments.delete', 'payments.approve',
    'documents.read', 'documents.create', 'documents.update', 'documents.delete',
    'lenders.read', 'lenders.create', 'lenders.update', 'lenders.delete',
    'borrowers.read', 'borrowers.create', 'borrowers.update', 'borrowers.delete',
    'audit_logs.read_all',
  ],
  
  accountant: [
    'users.read',
    'entities.read',
    'notes.read_all',
    'investments.read_all',
    'payments.read_all',
    'accounts.read', 'accounts.create', 'accounts.update',
    'ledger.read', 'ledger.create', 'ledger.update', 'ledger.post', 'ledger.reverse', 'ledger.reconcile',
    'audit_logs.read',
  ],
  
  compliance_officer: [
    'users.read',
    'entities.read', 'entities.update', 'entities.approve_kyc',
    'documents.read', 'documents.approve', 'documents.reject',
    'lenders.read', 'lenders.update',
    'borrowers.read', 'borrowers.update',
    'audit_logs.read_all',
  ],
  
  lender: [
    'users.read',
    'entities.read',
    'notes.read',
    'investments.read', 'investments.create',
    'payments.read',
    'documents.read', 'documents.create',
    'lenders.read', 'lenders.update',
    'audit_logs.read',
  ],
  
  borrower: [
    'users.read',
    'entities.read',
    'notes.read',
    'payments.read', 'payments.create',
    'documents.read', 'documents.create',
    'borrowers.read', 'borrowers.update',
    'audit_logs.read',
  ],
};

// Define default chart of accounts
const defaultAccounts: InsertAccount[] = [
  // Asset accounts (1000-1999)
  {
    accountNumber: '1000',
    name: 'Cash',
    type: 'asset',
    description: 'Operating cash accounts',
    isActive: true,
  },
  {
    accountNumber: '1100',
    name: 'Bank - Operating Account',
    type: 'asset',
    parentAccountNumber: '1000',
    description: 'Primary operating bank account',
    isActive: true,
  },
  {
    accountNumber: '1200',
    name: 'Notes Receivable',
    type: 'asset',
    description: 'Outstanding loan principal',
    isActive: true,
  },
  {
    accountNumber: '1210',
    name: 'Notes Receivable - Current',
    type: 'asset',
    parentAccountNumber: '1200',
    description: 'Notes due within 12 months',
    isActive: true,
  },
  {
    accountNumber: '1220',
    name: 'Notes Receivable - Long Term',
    type: 'asset',
    parentAccountNumber: '1200',
    description: 'Notes due after 12 months',
    isActive: true,
  },
  {
    accountNumber: '1300',
    name: 'Interest Receivable',
    type: 'asset',
    description: 'Accrued interest income',
    isActive: true,
  },
  {
    accountNumber: '1400',
    name: 'Allowance for Loan Losses',
    type: 'asset',
    description: 'Reserve for potential loan defaults',
    isActive: true,
  },
  
  // Liability accounts (2000-2999)
  {
    accountNumber: '2000',
    name: 'Lender Capital',
    type: 'liability',
    description: 'Amounts owed to lenders',
    isActive: true,
  },
  {
    accountNumber: '2100',
    name: 'Lender Principal',
    type: 'liability',
    parentAccountNumber: '2000',
    description: 'Principal invested by lenders',
    isActive: true,
  },
  {
    accountNumber: '2200',
    name: 'Interest Payable to Lenders',
    type: 'liability',
    parentAccountNumber: '2000',
    description: 'Accrued interest owed to lenders',
    isActive: true,
  },
  {
    accountNumber: '2300',
    name: 'Accounts Payable',
    type: 'liability',
    description: 'Amounts owed to vendors',
    isActive: true,
  },
  
  // Equity accounts (3000-3999)
  {
    accountNumber: '3000',
    name: 'Owner Equity',
    type: 'equity',
    description: 'Owner investment and retained earnings',
    isActive: true,
  },
  {
    accountNumber: '3100',
    name: 'Retained Earnings',
    type: 'equity',
    parentAccountNumber: '3000',
    description: 'Accumulated profits',
    isActive: true,
  },
  
  // Revenue accounts (4000-4999)
  {
    accountNumber: '4000',
    name: 'Interest Income',
    type: 'revenue',
    description: 'Interest earned on loans',
    isActive: true,
  },
  {
    accountNumber: '4100',
    name: 'Origination Fees',
    type: 'revenue',
    description: 'Fees charged for loan origination',
    isActive: true,
  },
  {
    accountNumber: '4200',
    name: 'Late Fees',
    type: 'revenue',
    description: 'Late payment penalties',
    isActive: true,
  },
  {
    accountNumber: '4300',
    name: 'Other Income',
    type: 'revenue',
    description: 'Miscellaneous income',
    isActive: true,
  },
  
  // Expense accounts (5000-5999)
  {
    accountNumber: '5000',
    name: 'Interest Expense',
    type: 'expense',
    description: 'Interest paid to lenders',
    isActive: true,
  },
  {
    accountNumber: '5100',
    name: 'Operating Expenses',
    type: 'expense',
    description: 'General operating costs',
    isActive: true,
  },
  {
    accountNumber: '5110',
    name: 'Salaries and Wages',
    type: 'expense',
    parentAccountNumber: '5100',
    description: 'Employee compensation',
    isActive: true,
  },
  {
    accountNumber: '5120',
    name: 'Professional Services',
    type: 'expense',
    parentAccountNumber: '5100',
    description: 'Legal, accounting, consulting fees',
    isActive: true,
  },
  {
    accountNumber: '5130',
    name: 'Technology and Software',
    type: 'expense',
    parentAccountNumber: '5100',
    description: 'Software subscriptions and IT costs',
    isActive: true,
  },
  {
    accountNumber: '5140',
    name: 'Marketing and Advertising',
    type: 'expense',
    parentAccountNumber: '5100',
    description: 'Marketing and promotional expenses',
    isActive: true,
  },
  {
    accountNumber: '5200',
    name: 'Loan Loss Expense',
    type: 'expense',
    description: 'Provision for loan losses',
    isActive: true,
  },
  {
    accountNumber: '5300',
    name: 'Bank Fees',
    type: 'expense',
    description: 'Banking service charges',
    isActive: true,
  },
];

async function seedCompliance() {
  console.log('🌱 Starting compliance data seeding...\n');
  
  try {
    // 1. Seed Roles
    console.log('📋 Seeding roles...');
    const roleIds: Record<string, string> = {};
    for (const role of defaultRoles) {
      const existingRole = await complianceStorage.getRoleByName(role.name);
      if (existingRole) {
        console.log(`  ✓ Role "${role.displayName}" already exists`);
        roleIds[role.name] = existingRole.id;
      } else {
        const createdRole = await complianceStorage.createRole(role);
        roleIds[role.name] = createdRole.id;
        console.log(`  ✓ Created role: ${role.displayName}`);
      }
    }
    console.log(`✅ Roles seeded: ${Object.keys(roleIds).length}\n`);
    
    // 2. Seed Permissions
    console.log('🔐 Seeding permissions...');
    const permissionIds: Record<string, string> = {};
    for (const permission of defaultPermissions) {
      const permissionKey = `${permission.resource}.${permission.action}`;
      const existingPermissions = await complianceStorage.getPermissions({ 
        resource: permission.resource, 
        action: permission.action 
      });
      
      if (existingPermissions.length > 0) {
        console.log(`  ✓ Permission "${permissionKey}" already exists`);
        permissionIds[permissionKey] = existingPermissions[0].id;
      } else {
        const createdPermission = await complianceStorage.createPermission(permission);
        permissionIds[permissionKey] = createdPermission.id;
        console.log(`  ✓ Created permission: ${permissionKey}`);
      }
    }
    console.log(`✅ Permissions seeded: ${Object.keys(permissionIds).length}\n`);
    
    // 3. Link Roles to Permissions
    console.log('🔗 Linking roles to permissions...');
    let linkCount = 0;
    for (const [roleName, permissions] of Object.entries(rolePermissions)) {
      const roleId = roleIds[roleName];
      if (!roleId) {
        console.log(`  ⚠️  Role "${roleName}" not found, skipping`);
        continue;
      }
      
      for (const permissionKey of permissions) {
        const permissionId = permissionIds[permissionKey];
        if (!permissionId) {
          console.log(`  ⚠️  Permission "${permissionKey}" not found, skipping`);
          continue;
        }
        
        const hasPermission = await complianceStorage.hasPermission(roleId, permissionId);
        if (!hasPermission) {
          await complianceStorage.addRolePermission({
            roleId,
            permissionId,
          });
          linkCount++;
        }
      }
      
      console.log(`  ✓ Linked permissions for role: ${roleName}`);
    }
    console.log(`✅ Role-permission links created: ${linkCount}\n`);
    
    // 4. Seed Chart of Accounts
    console.log('💰 Seeding chart of accounts...');
    const accountIds: Record<string, string> = {};
    for (const account of defaultAccounts) {
      const existingAccount = await complianceStorage.getAccountByNumber(account.accountNumber);
      if (existingAccount) {
        console.log(`  ✓ Account ${account.accountNumber} "${account.name}" already exists`);
        accountIds[account.accountNumber] = existingAccount.id;
      } else {
        const createdAccount = await complianceStorage.createAccount(account);
        accountIds[account.accountNumber] = createdAccount.id;
        console.log(`  ✓ Created account: ${account.accountNumber} - ${account.name}`);
      }
    }
    console.log(`✅ Accounts seeded: ${Object.keys(accountIds).length}\n`);
    
    // Summary
    console.log('🎉 Compliance data seeding complete!\n');
    console.log('Summary:');
    console.log(`  • Roles: ${Object.keys(roleIds).length}`);
    console.log(`  • Permissions: ${Object.keys(permissionIds).length}`);
    console.log(`  • Role-Permission Links: ${linkCount}`);
    console.log(`  • Accounts: ${Object.keys(accountIds).length}`);
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error seeding compliance data:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedCompliance()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedCompliance, defaultRoles, defaultPermissions, rolePermissions, defaultAccounts };
