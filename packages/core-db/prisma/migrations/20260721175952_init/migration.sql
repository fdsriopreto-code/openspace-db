-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "openspace";

-- CreateEnum
CREATE TYPE "openspace"."role_name" AS ENUM ('Owner', 'Admin', 'Developer', 'ReadOnly', 'ServiceAccount');

-- CreateEnum
CREATE TYPE "openspace"."plugin_kind" AS ENUM ('library', 'service');

-- CreateEnum
CREATE TYPE "openspace"."plugin_status" AS ENUM ('discovered', 'installing', 'installed', 'migrating', 'enabled', 'disabled', 'uninstalling', 'error');

-- CreateEnum
CREATE TYPE "openspace"."audit_actor_type" AS ENUM ('user', 'service_account');

-- CreateEnum
CREATE TYPE "openspace"."audit_result" AS ENUM ('ok', 'denied', 'error');

-- CreateEnum
CREATE TYPE "openspace"."environment" AS ENUM ('development', 'staging', 'production');

-- CreateEnum
CREATE TYPE "openspace"."backup_status" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "openspace"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openspace"."roles" (
    "id" UUID NOT NULL,
    "name" "openspace"."role_name" NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openspace"."user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "openspace"."role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openspace"."sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openspace"."api_keys" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "scopes" TEXT[],
    "created_by" UUID,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openspace"."plugins" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "type" "openspace"."plugin_kind" NOT NULL,
    "status" "openspace"."plugin_status" NOT NULL DEFAULT 'discovered',
    "installed_at" TIMESTAMP(3),
    "enabled_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "plugins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openspace"."plugin_configs" (
    "plugin_id" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plugin_configs_pkey" PRIMARY KEY ("plugin_id")
);

-- CreateTable
CREATE TABLE "openspace"."audit_log" (
    "id" UUID NOT NULL,
    "actor_type" "openspace"."audit_actor_type" NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "params_redacted" JSONB NOT NULL DEFAULT '{}',
    "result" "openspace"."audit_result" NOT NULL,
    "ip" TEXT,
    "environment" "openspace"."environment" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openspace"."projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "environment" "openspace"."environment" NOT NULL DEFAULT 'development',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openspace"."containers" (
    "id" UUID NOT NULL,
    "service_name" TEXT NOT NULL,
    "plugin_id" TEXT,
    "status" TEXT NOT NULL,
    "last_health_check_at" TIMESTAMP(3),

    CONSTRAINT "containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openspace"."backups" (
    "id" UUID NOT NULL,
    "database" TEXT NOT NULL,
    "size_bytes" BIGINT,
    "status" "openspace"."backup_status" NOT NULL DEFAULT 'pending',
    "storage_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openspace"."migrations_history" (
    "id" UUID NOT NULL,
    "plugin_id" TEXT,
    "name" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migrations_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "openspace"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "openspace"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_resource_action_key" ON "openspace"."role_permissions"("role_id", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "openspace"."sessions"("refresh_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_token_hash_key" ON "openspace"."api_keys"("token_hash");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_created_at_idx" ON "openspace"."audit_log"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_resource_action_idx" ON "openspace"."audit_log"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "containers_service_name_key" ON "openspace"."containers"("service_name");

-- AddForeignKey
ALTER TABLE "openspace"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "openspace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openspace"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "openspace"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openspace"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "openspace"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openspace"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "openspace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openspace"."api_keys" ADD CONSTRAINT "api_keys_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "openspace"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openspace"."api_keys" ADD CONSTRAINT "api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "openspace"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openspace"."plugin_configs" ADD CONSTRAINT "plugin_configs_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "openspace"."plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openspace"."containers" ADD CONSTRAINT "containers_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "openspace"."plugins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "openspace"."migrations_history" ADD CONSTRAINT "migrations_history_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "openspace"."plugins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
