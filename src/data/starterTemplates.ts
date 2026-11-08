import type { ModuleGroup, SchemaTable } from '../types/schema';
import { DEFAULT_MODULES, DEFAULT_TABLES } from './defaultSchema';

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  iconName: string;
  modules: ModuleGroup[];
  tables: SchemaTable[];
}

export const SAAS_MODULES: ModuleGroup[] = [
  { id: 'mod_tenancy', name: 'Tenancy', color: '#6366f1' },
  { id: 'mod_access', name: 'Access Control', color: '#06b6d4' },
  { id: 'mod_billing', name: 'Billing & Plans', color: '#10b981' },
];

export const SAAS_TABLES: SchemaTable[] = [
  {
    id: 'tbl_organizations',
    name: 'organizations',
    moduleId: 'mod_tenancy',
    x: 60,
    y: 100,
    comment: 'Top-level enterprise accounts and workspaces',
    columns: [
      { id: 'col_org_id', name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' },
      { id: 'col_org_name', name: 'name', type: 'varchar(255)', isPk: false, isNullable: false },
      { id: 'col_org_slug', name: 'slug', type: 'varchar(100)', isPk: false, isUnique: true, isNullable: false },
      { id: 'col_org_created_at', name: 'created_at', type: 'timestamptz', isPk: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
    ],
  },
  {
    id: 'tbl_saas_users',
    name: 'users',
    moduleId: 'mod_access',
    x: 420,
    y: 100,
    comment: 'Global accounts eligible for organization membership',
    columns: [
      { id: 'col_suser_id', name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' },
      { id: 'col_suser_email', name: 'email', type: 'varchar(255)', isPk: false, isUnique: true, isNullable: false },
      { id: 'col_suser_name', name: 'full_name', type: 'varchar(100)', isPk: false, isNullable: false },
      { id: 'col_suser_avatar', name: 'avatar_url', type: 'text', isPk: false, isNullable: true },
      { id: 'col_suser_created_at', name: 'created_at', type: 'timestamptz', isPk: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
    ],
  },
  {
    id: 'tbl_memberships',
    name: 'memberships',
    moduleId: 'mod_access',
    x: 240,
    y: 360,
    comment: 'Role-Based Access Control junction linking users to orgs',
    columns: [
      { id: 'col_mem_id', name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' },
      {
        id: 'col_mem_org_id',
        name: 'organization_id',
        type: 'uuid',
        isPk: false,
        isNullable: false,
        fkTargetTableId: 'tbl_organizations',
        fkTargetColumnId: 'col_org_id',
        fkOnDelete: 'CASCADE',
      },
      {
        id: 'col_mem_user_id',
        name: 'user_id',
        type: 'uuid',
        isPk: false,
        isNullable: false,
        fkTargetTableId: 'tbl_saas_users',
        fkTargetColumnId: 'col_suser_id',
        fkOnDelete: 'CASCADE',
      },
      { id: 'col_mem_role', name: 'role', type: 'varchar(50)', isPk: false, isNullable: false, defaultValue: "'member'" },
      { id: 'col_mem_created_at', name: 'created_at', type: 'timestamptz', isPk: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
    ],
  },
  {
    id: 'tbl_subscriptions',
    name: 'subscriptions',
    moduleId: 'mod_billing',
    x: 60,
    y: 440,
    comment: 'Stripe/Paddle recurring billing tiers per organization',
    columns: [
      { id: 'col_sub_id', name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' },
      {
        id: 'col_sub_org_id',
        name: 'organization_id',
        type: 'uuid',
        isPk: false,
        isNullable: false,
        fkTargetTableId: 'tbl_organizations',
        fkTargetColumnId: 'col_org_id',
        fkOnDelete: 'CASCADE',
      },
      { id: 'col_sub_plan', name: 'plan', type: 'varchar(50)', isPk: false, isNullable: false, defaultValue: "'pro'" },
      { id: 'col_sub_status', name: 'status', type: 'varchar(50)', isPk: false, isNullable: false, defaultValue: "'active'" },
      { id: 'col_sub_period_end', name: 'current_period_end', type: 'timestamptz', isPk: false, isNullable: false },
    ],
  },
  {
    id: 'tbl_audit_logs',
    name: 'audit_logs',
    moduleId: 'mod_tenancy',
    x: 600,
    y: 400,
    comment: 'Compliance and security audit trail for tenant actions',
    columns: [
      { id: 'col_log_id', name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' },
      {
        id: 'col_log_org_id',
        name: 'organization_id',
        type: 'uuid',
        isPk: false,
        isNullable: false,
        fkTargetTableId: 'tbl_organizations',
        fkTargetColumnId: 'col_org_id',
        fkOnDelete: 'CASCADE',
      },
      {
        id: 'col_log_user_id',
        name: 'user_id',
        type: 'uuid',
        isPk: false,
        isNullable: true,
        fkTargetTableId: 'tbl_saas_users',
        fkTargetColumnId: 'col_suser_id',
        fkOnDelete: 'SET NULL',
      },
      { id: 'col_log_action', name: 'action', type: 'varchar(100)', isPk: false, isNullable: false },
      { id: 'col_log_ip', name: 'ip_address', type: 'varchar(50)', isPk: false, isNullable: true },
      { id: 'col_log_created_at', name: 'created_at', type: 'timestamptz', isPk: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
    ],
  },
];

export const BLOG_MODULES: ModuleGroup[] = [
  { id: 'mod_publishing', name: 'Publishing', color: '#8b5cf6' },
  { id: 'mod_taxonomy', name: 'Taxonomy', color: '#ec4899' },
  { id: 'mod_community', name: 'Community', color: '#f59e0b' },
];

export const BLOG_TABLES: SchemaTable[] = [
  {
    id: 'tbl_authors',
    name: 'authors',
    moduleId: 'mod_publishing',
    x: 60,
    y: 100,
    comment: 'Content creators and editorial staff',
    columns: [
      { id: 'col_auth_id', name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' },
      { id: 'col_auth_name', name: 'name', type: 'varchar(100)', isPk: false, isNullable: false },
      { id: 'col_auth_bio', name: 'bio', type: 'text', isPk: false, isNullable: true },
      { id: 'col_auth_twitter', name: 'twitter_handle', type: 'varchar(50)', isPk: false, isNullable: true },
      { id: 'col_auth_created_at', name: 'created_at', type: 'timestamptz', isPk: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
    ],
  },
  {
    id: 'tbl_posts',
    name: 'posts',
    moduleId: 'mod_publishing',
    x: 420,
    y: 100,
    comment: 'Articles, essays, and draft publications',
    columns: [
      { id: 'col_post_id', name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' },
      {
        id: 'col_post_author_id',
        name: 'author_id',
        type: 'uuid',
        isPk: false,
        isNullable: false,
        fkTargetTableId: 'tbl_authors',
        fkTargetColumnId: 'col_auth_id',
        fkOnDelete: 'CASCADE',
      },
      { id: 'col_post_title', name: 'title', type: 'varchar(255)', isPk: false, isNullable: false },
      { id: 'col_post_slug', name: 'slug', type: 'varchar(255)', isPk: false, isUnique: true, isNullable: false },
      { id: 'col_post_content', name: 'content', type: 'text', isPk: false, isNullable: false },
      { id: 'col_post_status', name: 'status', type: 'varchar(50)', isPk: false, isNullable: false, defaultValue: "'draft'" },
      { id: 'col_post_published_at', name: 'published_at', type: 'timestamptz', isPk: false, isNullable: true },
    ],
  },
  {
    id: 'tbl_tags',
    name: 'tags',
    moduleId: 'mod_taxonomy',
    x: 60,
    y: 440,
    comment: 'Categories, topics, and classification labels',
    columns: [
      { id: 'col_tag_id', name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' },
      { id: 'col_tag_name', name: 'name', type: 'varchar(100)', isPk: false, isNullable: false },
      { id: 'col_tag_slug', name: 'slug', type: 'varchar(100)', isPk: false, isUnique: true, isNullable: false },
    ],
  },
  {
    id: 'tbl_post_tags',
    name: 'post_tags',
    moduleId: 'mod_taxonomy',
    x: 240,
    y: 440,
    comment: 'Many-to-many junction between articles and taxonomy tags',
    columns: [
      { id: 'col_pt_id', name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' },
      {
        id: 'col_pt_post_id',
        name: 'post_id',
        type: 'uuid',
        isPk: false,
        isNullable: false,
        fkTargetTableId: 'tbl_posts',
        fkTargetColumnId: 'col_post_id',
        fkOnDelete: 'CASCADE',
      },
      {
        id: 'col_pt_tag_id',
        name: 'tag_id',
        type: 'uuid',
        isPk: false,
        isNullable: false,
        fkTargetTableId: 'tbl_tags',
        fkTargetColumnId: 'col_tag_id',
        fkOnDelete: 'CASCADE',
      },
    ],
  },
  {
    id: 'tbl_comments',
    name: 'comments',
    moduleId: 'mod_community',
    x: 600,
    y: 380,
    comment: 'Reader discussions and feedback on articles',
    columns: [
      { id: 'col_comm_id', name: 'id', type: 'uuid', isPk: true, isNullable: false, defaultValue: 'gen_random_uuid()' },
      {
        id: 'col_comm_post_id',
        name: 'post_id',
        type: 'uuid',
        isPk: false,
        isNullable: false,
        fkTargetTableId: 'tbl_posts',
        fkTargetColumnId: 'col_post_id',
        fkOnDelete: 'CASCADE',
      },
      { id: 'col_comm_author', name: 'author_name', type: 'varchar(100)', isPk: false, isNullable: false },
      { id: 'col_comm_email', name: 'author_email', type: 'varchar(255)', isPk: false, isNullable: false },
      { id: 'col_comm_content', name: 'content', type: 'text', isPk: false, isNullable: false },
      { id: 'col_comm_approved', name: 'is_approved', type: 'boolean', isPk: false, isNullable: false, defaultValue: 'true' },
      { id: 'col_comm_created_at', name: 'created_at', type: 'timestamptz', isPk: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
    ],
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Customers, catalog, orders, and line items',
    iconName: 'ShoppingBag',
    modules: DEFAULT_MODULES,
    tables: DEFAULT_TABLES,
  },
  {
    id: 'saas',
    name: 'SaaS Multi-Tenant & RBAC',
    description: 'Organizations, memberships, subscriptions, and audit logs',
    iconName: 'Building2',
    modules: SAAS_MODULES,
    tables: SAAS_TABLES,
  },
  {
    id: 'blog',
    name: 'Blog & Content Platform',
    description: 'Authors, published posts, taxonomy tags, and comments',
    iconName: 'FileText',
    modules: BLOG_MODULES,
    tables: BLOG_TABLES,
  },
];

