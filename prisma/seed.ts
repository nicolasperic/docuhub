import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean up
  await prisma.activity.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.documentTag.deleteMany();
  await prisma.documentClient.deleteMany();
  await prisma.documentRole.deleteMany();
  await prisma.documentTeam.deleteMany();
  await prisma.document.deleteMany();
  await prisma.space.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.teamClient.deleteMany();
  await prisma.client.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // ─── Organization ───────────────────────────────────────
  const org = await prisma.organization.create({
    data: { name: "Aztec Coders", slug: "aztec-coders" },
  });

  // ─── Users ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const nico = await prisma.user.create({
    data: {
      name: "Nico Peric",
      email: "nico@azteccoders.com",
      passwordHash,
      organizationId: org.id,
      orgRole: "OWNER",
    },
  });

  const marcel = await prisma.user.create({
    data: {
      name: "Marcel Martinez",
      email: "marcel@azteccoders.com",
      passwordHash,
      organizationId: org.id,
      orgRole: "ADMIN",
    },
  });

  const sachin = await prisma.user.create({
    data: {
      name: "Sachin Maharjan",
      email: "sachin@azteccoders.com",
      passwordHash,
      organizationId: org.id,
      orgRole: "ADMIN",
    },
  });

  // ─── Teams (hierarchical) ──────────────────────────────
  const engineering = await prisma.team.create({
    data: {
      name: "Engineering",
      description: "All engineering teams at Aztec Coders",
      organizationId: org.id,
    },
  });

  const backendTeam = await prisma.team.create({
    data: {
      name: "Backend",
      description: "Magento/Adobe Commerce backend development — modules, APIs, integrations",
      organizationId: org.id,
      parentId: engineering.id,
    },
  });

  const frontendTeam = await prisma.team.create({
    data: {
      name: "Frontend",
      description: "Storefront development — Hyva, Luma, PWA Studio, checkout UX",
      organizationId: org.id,
      parentId: engineering.id,
    },
  });

  const devopsTeam = await prisma.team.create({
    data: {
      name: "DevOps",
      description: "Adobe Commerce Cloud, CI/CD pipelines, infrastructure & monitoring",
      organizationId: org.id,
    },
  });

  // ─── Team Members ──────────────────────────────────────
  await prisma.teamMember.createMany({
    data: [
      { userId: nico.id, teamId: engineering.id, role: "ADMIN" },
      { userId: nico.id, teamId: backendTeam.id, role: "ADMIN" },
      { userId: marcel.id, teamId: backendTeam.id, role: "ADMIN" },
      { userId: marcel.id, teamId: devopsTeam.id, role: "ADMIN" },
      { userId: sachin.id, teamId: frontendTeam.id, role: "ADMIN" },
      { userId: sachin.id, teamId: backendTeam.id, role: "MEMBER" },
    ],
  });

  // ─── Roles ─────────────────────────────────────────────
  const magentoBackendDev = await prisma.role.create({
    data: {
      name: "Magento Backend Developer",
      description: "PHP/Magento module development, service contracts, and API integrations",
      organizationId: org.id,
    },
  });

  const frontendDev = await prisma.role.create({
    data: {
      name: "Frontend Developer",
      description: "Storefront theming, JavaScript, and checkout customization",
      organizationId: org.id,
    },
  });

  const devopsEng = await prisma.role.create({
    data: {
      name: "DevOps Engineer",
      description: "Adobe Commerce Cloud deployments, infrastructure, and monitoring",
      organizationId: org.id,
    },
  });

  const techLead = await prisma.role.create({
    data: {
      name: "Tech Lead",
      description: "Technical leadership, architecture decisions, and code reviews",
      organizationId: org.id,
    },
  });

  // ─── Role Assignments ─────────────────────────────────
  await prisma.userRole.createMany({
    data: [
      { userId: nico.id, roleId: techLead.id },
      { userId: nico.id, roleId: magentoBackendDev.id },
      { userId: marcel.id, roleId: magentoBackendDev.id },
      { userId: marcel.id, roleId: devopsEng.id },
      { userId: sachin.id, roleId: frontendDev.id },
      { userId: sachin.id, roleId: magentoBackendDev.id },
    ],
  });

  // ─── Clients ───────────────────────────────────────────
  const porrua = await prisma.client.create({
    data: {
      name: "Porrua",
      description: "Librería Porrua — Mexico's leading bookstore chain, online and brick-and-mortar",
      organizationId: org.id,
    },
  });

  // ─── Client ↔ Team Assignments ─────────────────────────
  await prisma.teamClient.createMany({
    data: [
      { teamId: backendTeam.id, clientId: porrua.id },
      { teamId: frontendTeam.id, clientId: porrua.id },
      { teamId: devopsTeam.id, clientId: porrua.id },
    ],
  });

  // ─── Tags ──────────────────────────────────────────────
  const [tagMagento, tagAdobe, tagDevOps, tagPerformance, tagOnboarding, tagPorrua] =
    await Promise.all([
      prisma.tag.create({ data: { name: "Magento", color: "#f26322", organizationId: org.id } }),
      prisma.tag.create({ data: { name: "Adobe Commerce", color: "#eb1000", organizationId: org.id } }),
      prisma.tag.create({ data: { name: "DevOps", color: "#0ea5e9", organizationId: org.id } }),
      prisma.tag.create({ data: { name: "Performance", color: "#22c55e", organizationId: org.id } }),
      prisma.tag.create({ data: { name: "Onboarding", color: "#8b5cf6", organizationId: org.id } }),
      prisma.tag.create({ data: { name: "Porrua", color: "#d97706", organizationId: org.id } }),
    ]);

  // ─── Spaces ────────────────────────────────────────────
  const generalSpace = await prisma.space.create({
    data: {
      name: "General",
      description: "Company-wide documentation for Aztec Coders",
      slug: "general",
      icon: "BookOpen",
      type: "ORG_WIDE",
      organizationId: org.id,
    },
  });

  const magentoSpace = await prisma.space.create({
    data: {
      name: "Magento Development",
      description: "Magento/Adobe Commerce development standards, patterns, and reference guides",
      slug: "magento-development",
      icon: "Code",
      type: "TEAM",
      organizationId: org.id,
      teamId: engineering.id,
    },
  });

  const devopsSpace = await prisma.space.create({
    data: {
      name: "DevOps Runbooks",
      description: "Deployment procedures, infrastructure guides, and incident response for Adobe Commerce Cloud",
      slug: "devops-runbooks",
      icon: "Server",
      type: "TEAM",
      organizationId: org.id,
      teamId: devopsTeam.id,
    },
  });

  const porruaSpace = await prisma.space.create({
    data: {
      name: "Porrua",
      description: "Project documentation for Librería Porrua — e-commerce platform on Adobe Commerce",
      slug: "porrua",
      icon: "BookMarked",
      type: "CLIENT",
      organizationId: org.id,
    },
  });

  // ─── Documents ─────────────────────────────────────────

  // 1. Welcome doc (General)
  const welcomeDoc = await prisma.document.create({
    data: {
      title: "Welcome to Aztec Coders",
      slug: "welcome-to-aztec-coders",
      excerpt: "Onboarding guide for new team members at Aztec Coders",
      status: "PUBLISHED",
      spaceId: generalSpace.id,
      authorId: nico.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome to Aztec Coders" }] },
          { type: "paragraph", content: [{ type: "text", text: "Welcome to the team! Aztec Coders is a software factory specializing in e-commerce solutions built on Magento and Adobe Commerce. We help retailers across Latin America and beyond build, scale, and optimize their online stores." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What We Do" }] },
          { type: "paragraph", content: [{ type: "text", text: "We deliver end-to-end Adobe Commerce implementations — from initial architecture and custom module development to storefront theming, third-party integrations, performance optimization, and ongoing support." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Getting Started" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Set up your local Magento development environment (see the Magento Development space)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Review our coding standards and module development guidelines" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Get access to Adobe Commerce Cloud projects from the DevOps team" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Check out the client spaces for project-specific documentation" }] }] },
          ]},
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Our Stack" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Adobe Commerce / Magento 2 (PHP 8.2+)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "MySQL 8 / MariaDB, Redis, Elasticsearch/OpenSearch, RabbitMQ" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Hyva themes and PWA Studio for storefronts" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Adobe Commerce Cloud (ECE-Tools) for hosting and CI/CD" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Docker (Warden) for local development" }] }] },
          ]},
        ],
      }),
      documentTags: { create: [{ tagId: tagOnboarding.id }] },
    },
  });

  // 2. Module Development Standards (Magento Development)
  const moduleStandardsDoc = await prisma.document.create({
    data: {
      title: "Magento Module Development Standards",
      slug: "module-development-standards",
      excerpt: "Coding standards, naming conventions, and architectural patterns for custom Magento modules",
      status: "PUBLISHED",
      spaceId: magentoSpace.id,
      authorId: nico.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Magento Module Development Standards" }] },
          { type: "paragraph", content: [{ type: "text", text: "This document defines the standards all developers at Aztec Coders must follow when building custom Magento modules. Adhering to these patterns ensures consistency, maintainability, and compatibility with Adobe Commerce upgrades." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Module Structure" }] },
          { type: "paragraph", content: [{ type: "text", text: "All custom modules must live under the AztecCoders vendor namespace. Use the standard Magento module directory structure:" }] },
          { type: "codeBlock", attrs: { language: "text" }, content: [{ type: "text", text: "app/code/AztecCoders/ModuleName/\n├── Api/                  # Service contracts (interfaces)\n├── Block/                # View models / block classes\n├── Controller/           # HTTP controllers\n├── etc/                  # Configuration (di.xml, module.xml, routes, etc.)\n│   ├── adminhtml/\n│   └── frontend/\n├── Model/                # Business logic and data models\n│   └── ResourceModel/\n├── Observer/             # Event observers\n├── Plugin/               # Interceptors (plugins)\n├── Setup/                # Install/upgrade scripts (if needed)\n├── Test/                 # Unit and integration tests\n├── view/                 # Frontend assets, layouts, templates\n│   ├── adminhtml/\n│   └── frontend/\n├── composer.json\n└── registration.php" }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key Principles" }] },
          { type: "orderedList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Use service contracts." }, { type: "text", text: " Always define interfaces in Api/ and bind implementations via di.xml. Never depend on concrete models directly." }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Prefer plugins over observers." }, { type: "text", text: " Use around/before/after plugins for modifying core behavior. Reserve observers for side-effects (logging, cache invalidation)." }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Avoid rewriting classes." }, { type: "text", text: " Class preferences (rewrites) are a last resort. They create upgrade conflicts and break compatibility with other extensions." }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Write declarative schema." }, { type: "text", text: " Use db_schema.xml instead of Setup scripts for all database changes. Always include db_schema_whitelist.json." }] }] },
          ]},
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Coding Standards" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Follow PSR-12 and the Magento Coding Standard (magento/magento-coding-standard)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Use strict types in every PHP file: declare(strict_types=1);" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "All public methods must have PHPDoc blocks with @param and @return types" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Constructor injection only — no ObjectManager::getInstance() calls" }] }] },
          ]},
        ],
      }),
      documentTeams: { create: [{ teamId: backendTeam.id }] },
      documentRoles: { create: [{ roleId: magentoBackendDev.id }] },
      documentTags: { create: [{ tagId: tagMagento.id }, { tagId: tagAdobe.id }] },
    },
  });

  // 2a. Child doc: API Integration Patterns (under Module Standards)
  await prisma.document.create({
    data: {
      title: "API Integration Patterns",
      slug: "api-integration-patterns",
      excerpt: "Standard patterns for integrating Magento with third-party APIs and ERPs",
      status: "PUBLISHED",
      spaceId: magentoSpace.id,
      authorId: marcel.id,
      parentId: moduleStandardsDoc.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "API Integration Patterns" }] },
          { type: "paragraph", content: [{ type: "text", text: "When integrating Magento with external systems (ERPs, payment gateways, shipping providers, CRMs), follow these patterns to keep integrations robust, testable, and decoupled from core logic." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Gateway Pattern" }] },
          { type: "paragraph", content: [{ type: "text", text: "Create a dedicated Gateway class per external service. The gateway encapsulates all HTTP communication, authentication, and response mapping. Inject it via the service contract interface." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Message Queue for Async Operations" }] },
          { type: "paragraph", content: [{ type: "text", text: "Use Magento's MessageQueue framework (RabbitMQ) for operations that don't need to be synchronous — inventory syncs, order exports, catalog updates. Define topics in communication.xml and queue_topology.xml." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Error Handling & Retries" }] },
          { type: "paragraph", content: [{ type: "text", text: "All external API calls must implement retry logic with exponential backoff. Log failures to a custom integration_log table so we can diagnose issues in production without digging through var/log." }] },
        ],
      }),
      documentTeams: { create: [{ teamId: backendTeam.id }] },
      documentRoles: { create: [{ roleId: magentoBackendDev.id }] },
      documentTags: { create: [{ tagId: tagMagento.id }] },
    },
  });

  // 3. Adobe Commerce Cloud Deployment Guide (DevOps)
  await prisma.document.create({
    data: {
      title: "Adobe Commerce Cloud Deployment Guide",
      slug: "cloud-deployment-guide",
      excerpt: "Step-by-step guide for deploying to Adobe Commerce Cloud environments",
      status: "PUBLISHED",
      spaceId: devopsSpace.id,
      authorId: marcel.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Adobe Commerce Cloud Deployment Guide" }] },
          { type: "paragraph", content: [{ type: "text", text: "This runbook covers the standard deployment process for Adobe Commerce Cloud (ECE) projects. All deployments at Aztec Coders follow this procedure." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Environments" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Integration:" }, { type: "text", text: " Development branches auto-deploy here. Used for feature testing." }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Staging:" }, { type: "text", text: " Mirror of production. All releases go through staging first. Performance and UAT testing happens here." }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Production:" }, { type: "text", text: " Live environment. Deployments require approval from the Tech Lead." }] }] },
          ]},
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Pre-deployment Checklist" }] },
          { type: "orderedList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "All CI checks pass (PHPStan, PHPCS, unit tests, integration tests)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Staging deployment verified — storefront, checkout, and admin all functional" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Release notes written and shared in #deployments Slack channel" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Database migrations reviewed (db_schema.xml changes)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Static content deployed and verified on staging" }] }] },
          ]},
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Deployment Steps" }] },
          { type: "orderedList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Merge the release branch into the production branch via PR" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Monitor the Cloud deployment pipeline in the Adobe Commerce Cloud Console" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Verify post-deploy hooks complete successfully (cache warm-up, indexers)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Run a quick smoke test: homepage, category page, product page, add-to-cart, checkout" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Monitor New Relic and logs for 30 minutes post-deploy" }] }] },
          ]},
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Rollback" }] },
          { type: "paragraph", content: [{ type: "text", text: "If critical issues are found, use `magento-cloud snapshot:restore` to roll back to the previous snapshot. Notify the team immediately in #incidents." }] },
        ],
      }),
      documentTeams: { create: [{ teamId: devopsTeam.id }, { teamId: backendTeam.id }] },
      documentRoles: { create: [{ roleId: devopsEng.id }] },
      documentTags: { create: [{ tagId: tagDevOps.id }, { tagId: tagAdobe.id }] },
    },
  });

  // 4. Porrua Project Overview (Client space)
  const porruaOverview = await prisma.document.create({
    data: {
      title: "Porrua Project Overview",
      slug: "project-overview",
      excerpt: "Architecture overview and project scope for Librería Porrua's Adobe Commerce platform",
      status: "PUBLISHED",
      spaceId: porruaSpace.id,
      authorId: nico.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Porrua — Project Overview" }] },
          { type: "paragraph", content: [{ type: "text", text: "Librería Porrua is one of Mexico's oldest and most recognized bookstore chains, with over 70 physical stores and a growing e-commerce presence. We are building and maintaining their Adobe Commerce platform at porrua.mx." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Project Scope" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Full Adobe Commerce 2.4.7 implementation on Commerce Cloud" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Custom catalog import from Porrua's legacy ERP (SAP) with daily sync via RabbitMQ" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Integration with Mexican payment methods: Conekta, MercadoPago, OXXO Pay" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Custom shipping module for in-store pickup across 70+ locations" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Hyva theme for storefront performance (target: < 2s LCP)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "CFDI invoicing (Mexican fiscal requirements) integrated with SAT" }] }] },
          ]},
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key Contacts at Porrua" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Rodrigo Mendoza" }, { type: "text", text: " — E-commerce Director, main stakeholder" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Ana García" }, { type: "text", text: " — IT Manager, handles ERP and infrastructure on their side" }] }] },
          ]},
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Environments" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Production:" }, { type: "text", text: " porrua.mx (Adobe Commerce Cloud, US-East region)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Staging:" }, { type: "text", text: " staging.porrua.mx" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Integration:" }, { type: "text", text: " dev.porrua.mx (auto-deploy from develop branch)" }] }] },
          ]},
        ],
      }),
      documentClients: { create: [{ clientId: porrua.id }] },
      documentTeams: { create: [{ teamId: backendTeam.id }, { teamId: frontendTeam.id }] },
      documentTags: { create: [{ tagId: tagPorrua.id }, { tagId: tagAdobe.id }] },
    },
  });

  // 4a. Child doc: Porrua Catalog Integration (under Project Overview)
  await prisma.document.create({
    data: {
      title: "Porrua Catalog Integration",
      slug: "catalog-integration",
      excerpt: "Technical documentation for the SAP-to-Magento catalog import pipeline",
      status: "PUBLISHED",
      spaceId: porruaSpace.id,
      authorId: marcel.id,
      parentId: porruaOverview.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Porrua Catalog Integration" }] },
          { type: "paragraph", content: [{ type: "text", text: "Porrua's catalog of 500,000+ books and media products is managed in SAP. We import this data into Magento nightly via a custom integration module (AztecCoders_PorruaCatalog)." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Data Flow" }] },
          { type: "orderedList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "SAP exports a delta CSV to an SFTP server every night at 2:00 AM CST" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "A cron job in Magento picks up the file and publishes product messages to RabbitMQ" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Consumer workers process products in batches of 500 (create, update, disable)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "After import, reindex and cache flush are triggered automatically" }] }] },
          ]},
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key Fields Mapped" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "ISBN → SKU" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "SAP Material Number → custom attribute porrua_material_id" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Author, Publisher, Genre → custom attributes with attribute sets" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Price (MXN) and inventory from SAP stock tables" }] }] },
          ]},
        ],
      }),
      documentClients: { create: [{ clientId: porrua.id }] },
      documentTeams: { create: [{ teamId: backendTeam.id }] },
      documentRoles: { create: [{ roleId: magentoBackendDev.id }] },
      documentTags: { create: [{ tagId: tagPorrua.id }, { tagId: tagMagento.id }] },
    },
  });

  // 5. Performance Optimization Guide (Draft — General)
  await prisma.document.create({
    data: {
      title: "Magento Performance Optimization Guide",
      slug: "performance-optimization-guide",
      excerpt: "Best practices for optimizing Adobe Commerce storefront and backend performance",
      status: "DRAFT",
      spaceId: magentoSpace.id,
      authorId: sachin.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Magento Performance Optimization Guide" }] },
          { type: "paragraph", content: [{ type: "text", text: "This guide covers the performance optimizations we apply across all client projects. Work in progress — contributions welcome." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Frontend Performance" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Use Hyva theme to eliminate RequireJS and KnockoutJS overhead" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Lazy-load images below the fold using native loading=\"lazy\"" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Minimize CSS with Tailwind purge and critical CSS extraction" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Target Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms" }] }] },
          ]},
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Backend Performance" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Enable full-page cache (Varnish) on all cacheable pages" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Use Redis for session storage and cache backend" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Optimize MySQL queries: avoid loading full collections, use select() to limit columns" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Run indexers in schedule mode, not on-save" }] }] },
          ]},
        ],
      }),
      documentTeams: { create: [{ teamId: frontendTeam.id }, { teamId: backendTeam.id }] },
      documentRoles: { create: [{ roleId: frontendDev.id }, { roleId: magentoBackendDev.id }] },
      documentTags: { create: [{ tagId: tagPerformance.id }, { tagId: tagMagento.id }] },
    },
  });

  // ─── Activity & Favorites ──────────────────────────────
  const allDocs = await prisma.document.findMany();
  for (const doc of allDocs.slice(0, 4)) {
    await prisma.activity.create({
      data: { type: "VIEW", userId: nico.id, documentId: doc.id },
    });
  }

  await prisma.activity.create({
    data: { type: "CREATE", userId: nico.id, documentId: welcomeDoc.id },
  });

  await prisma.activity.create({
    data: { type: "VIEW", userId: marcel.id, documentId: moduleStandardsDoc.id },
  });

  await prisma.activity.create({
    data: { type: "VIEW", userId: sachin.id, documentId: porruaOverview.id },
  });

  // Favorites
  await prisma.favorite.create({
    data: { userId: nico.id, documentId: welcomeDoc.id },
  });

  await prisma.favorite.create({
    data: { userId: nico.id, documentId: porruaOverview.id },
  });

  await prisma.favorite.create({
    data: { userId: marcel.id, documentId: moduleStandardsDoc.id },
  });

  // ─── Comments ──────────────────────────────────────────
  await prisma.comment.create({
    data: {
      content: "Should we add a section about GraphQL API development? We're starting to use it more for headless storefronts.",
      userId: sachin.id,
      documentId: moduleStandardsDoc.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "Good idea. I'll add a GraphQL section covering schema definition and resolver patterns.",
      userId: nico.id,
      documentId: moduleStandardsDoc.id,
    },
  });

  console.log("Seed complete!");
  console.log("");
  console.log("Login credentials:");
  console.log("  nico@azteccoders.com / password123 (Owner)");
  console.log("  marcel@azteccoders.com / password123 (Admin)");
  console.log("  sachin@azteccoders.com / password123 (Admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
