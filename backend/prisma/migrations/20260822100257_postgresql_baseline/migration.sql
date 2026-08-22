-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "StylistProfileStatus" AS ENUM ('PENDING', 'ACTIVE');

-- CreateEnum
CREATE TYPE "ClientDebtStatus" AS ENUM ('OPEN', 'SETTLED');

-- CreateEnum
CREATE TYPE "DailyLogEntryKind" AS ENUM ('SERVICE', 'DEBT_PAYMENT');

-- CreateEnum
CREATE TYPE "AppReleasePlatform" AS ENUM ('ANDROID');

-- CreateEnum
CREATE TYPE "AppReleaseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "gender" "Gender",
    "gender_onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" TEXT,
    "email_verification_expires_at" TIMESTAMP(3),
    "google_id" TEXT,
    "facebook_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "password_changed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_cancellation_counts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cancellation_count" INTEGER NOT NULL DEFAULT 0,
    "penalty_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_cancellation_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salon_settings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "logo" TEXT,
    "pause_between_services" INTEGER NOT NULL DEFAULT 10,
    "cancellation_deadline_hours" INTEGER NOT NULL DEFAULT 24,
    "max_cancellations_before_penalty" INTEGER NOT NULL DEFAULT 3,
    "penalty_duration_days" INTEGER NOT NULL DEFAULT 30,
    "reservation_lock_minutes" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salon_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salon_working_hours" (
    "id" TEXT NOT NULL,
    "salon_settings_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,
    "is_working_day" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "salon_working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "salon_settings_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT,
    "send_push" BOOLEAN NOT NULL DEFAULT false,
    "push_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stylist_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bio" TEXT,
    "specialization" TEXT,
    "status" "StylistProfileStatus" NOT NULL DEFAULT 'PENDING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "hire_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stylist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stylist_working_hours" (
    "id" TEXT NOT NULL,
    "stylist_profile_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "date_override" DATE,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_working_day" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stylist_working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_subcategories" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "subcategory_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_description" TEXT,
    "hero_image" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'FEMALE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "loyalty_enabled" BOOLEAN NOT NULL DEFAULT false,
    "loyalty_max_discount_percent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stylist_services" (
    "id" TEXT NOT NULL,
    "stylist_profile_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stylist_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "reservation_date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "client_notes" TEXT,
    "booking_origin" TEXT NOT NULL DEFAULT 'CLIENT_SELF_SERVICE',
    "acceptance_mode" TEXT NOT NULL DEFAULT 'INBOX',
    "attendance_policy" TEXT NOT NULL DEFAULT 'CLIENT_REQUIRED',
    "created_by_user_id" TEXT,
    "confirmed_stylist_id" TEXT,
    "attendance_confirmed_at" TIMESTAMP(3),
    "attendance_confirmed_by" TEXT,
    "attendance_waived_at" TIMESTAMP(3),
    "attendance_waived_by_user_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reschedule_proposed_start_time" TEXT,
    "reschedule_proposed_end_time" TEXT,
    "reschedule_status" TEXT,
    "delay_notified_at" TIMESTAMP(3),
    "reminder_sent_at" TIMESTAMP(3),
    "use_break_after_overrun" BOOLEAN,
    "use_break_decided_at" TIMESTAMP(3),
    "loyalty_discount_percent" INTEGER NOT NULL DEFAULT 0,
    "loyalty_discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "loyalty_points_used" INTEGER NOT NULL DEFAULT 0,
    "pay_debts_intent" BOOLEAN NOT NULL DEFAULT false,
    "public_reference_code" TEXT NOT NULL,
    "client_view_token" TEXT NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_service_items" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_stylist_responses" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "stylist_profile_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "locked_at" TIMESTAMP(3),
    "lock_expires_at" TIMESTAMP(3),
    "has_locked_once" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" TEXT,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_stylist_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_log_entries" (
    "id" TEXT NOT NULL,
    "stylist_profile_id" TEXT NOT NULL,
    "reservation_id" TEXT,
    "service_id" TEXT NOT NULL,
    "client_id" TEXT,
    "kind" "DailyLogEntryKind" NOT NULL DEFAULT 'SERVICE',
    "debt_id" TEXT,
    "date" DATE NOT NULL,
    "actual_price" DECIMAL(10,2) NOT NULL,
    "tip_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "public_reference_code" TEXT NOT NULL,
    "loyalty_discount_percent" INTEGER NOT NULL DEFAULT 0,
    "loyalty_discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "loyalty_points_used" INTEGER NOT NULL DEFAULT 0,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "pending_reminder_sent_at" TIMESTAMP(3),
    "source_entry_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "delete_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_log_entry_service_items" (
    "id" TEXT NOT NULL,
    "daily_log_entry_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_log_entry_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_log_images" (
    "id" TEXT NOT NULL,
    "daily_log_entry_id" TEXT NOT NULL,
    "upload_id" TEXT NOT NULL,
    "is_before" BOOLEAN NOT NULL DEFAULT false,
    "is_after" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_log_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_books" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_book_lock_events" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_book_lock_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_category_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requires_attachment_per_item" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_category_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_template_fields" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "default_value" TEXT,
    "line_role" TEXT NOT NULL DEFAULT 'NONE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_template_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_fixed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "invoice_upload_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_field_values" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_attachments" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "upload_id" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_books" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "total_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_tips" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_book_entries" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "daily_log_entry_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "tip_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_book_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_book_manual_entries" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "service_id" TEXT NOT NULL,
    "stylist_profile_id" TEXT,
    "client_id" TEXT,
    "daily_log_entry_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "tip_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_book_manual_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_debts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "stylist_profile_id" TEXT NOT NULL,
    "service_id" TEXT,
    "manual_entry_id" TEXT,
    "reservation_id" TEXT,
    "daily_log_entry_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "status" "ClientDebtStatus" NOT NULL DEFAULT 'OPEN',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),
    "settled_by_id" TEXT,

    CONSTRAINT "client_debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_book_lock_events" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_book_lock_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_book_manual_entry_audits" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "manual_entry_id" TEXT,
    "action" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_book_manual_entry_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hero_image" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "upload_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "stylist_profile_id" TEXT,
    "reservation_id" TEXT,
    "service_rating" INTEGER NOT NULL,
    "stylist_rating" INTEGER,
    "comment" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "path_original" TEXT NOT NULL,
    "path_thumb" TEXT,
    "path_small" TEXT,
    "path_medium" TEXT,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "channel" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_releases" (
    "id" TEXT NOT NULL,
    "platform" "AppReleasePlatform" NOT NULL DEFAULT 'ANDROID',
    "version" TEXT NOT NULL,
    "version_code" INTEGER NOT NULL,
    "min_supported_version_code" INTEGER NOT NULL DEFAULT 1,
    "force_update" BOOLEAN NOT NULL DEFAULT false,
    "apk_path" TEXT NOT NULL,
    "apk_sha256" TEXT NOT NULL,
    "apk_size_bytes" INTEGER NOT NULL,
    "release_notes" TEXT,
    "status" "AppReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_facebook_id_key" ON "users"("facebook_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_cancellation_counts_user_id_key" ON "client_cancellation_counts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "salon_working_hours_salon_settings_id_day_of_week_key" ON "salon_working_hours"("salon_settings_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "stylist_profiles_user_id_key" ON "stylist_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "stylist_services_stylist_profile_id_service_id_key" ON "stylist_services"("stylist_profile_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_public_reference_code_key" ON "reservations"("public_reference_code");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_client_view_token_key" ON "reservations"("client_view_token");

-- CreateIndex
CREATE INDEX "reservation_service_items_service_id_idx" ON "reservation_service_items"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_service_items_reservation_id_service_id_key" ON "reservation_service_items"("reservation_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_stylist_responses_reservation_id_stylist_profil_key" ON "reservation_stylist_responses"("reservation_id", "stylist_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_log_entries_public_reference_code_key" ON "daily_log_entries"("public_reference_code");

-- CreateIndex
CREATE INDEX "daily_log_entries_debt_id_idx" ON "daily_log_entries"("debt_id");

-- CreateIndex
CREATE INDEX "daily_log_entries_deleted_at_idx" ON "daily_log_entries"("deleted_at");

-- CreateIndex
CREATE INDEX "daily_log_entries_status_deleted_at_idx" ON "daily_log_entries"("status", "deleted_at");

-- CreateIndex
CREATE INDEX "daily_log_entries_source_entry_id_idx" ON "daily_log_entries"("source_entry_id");

-- CreateIndex
CREATE INDEX "daily_log_entry_service_items_service_id_idx" ON "daily_log_entry_service_items"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_log_entry_service_items_daily_log_entry_id_service_id_key" ON "daily_log_entry_service_items"("daily_log_entry_id", "service_id");

-- CreateIndex
CREATE INDEX "daily_log_images_daily_log_entry_id_is_before_idx" ON "daily_log_images"("daily_log_entry_id", "is_before");

-- CreateIndex
CREATE INDEX "daily_log_images_daily_log_entry_id_is_after_idx" ON "daily_log_images"("daily_log_entry_id", "is_after");

-- CreateIndex
CREATE UNIQUE INDEX "expense_books_year_month_key" ON "expense_books"("year", "month");

-- CreateIndex
CREATE INDEX "expense_book_lock_events_book_id_created_at_idx" ON "expense_book_lock_events"("book_id", "created_at");

-- CreateIndex
CREATE INDEX "expense_template_fields_template_id_sort_order_idx" ON "expense_template_fields"("template_id", "sort_order");

-- CreateIndex
CREATE INDEX "expenses_book_id_created_at_idx" ON "expenses"("book_id", "created_at");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_field_values_expense_id_field_id_key" ON "expense_field_values"("expense_id", "field_id");

-- CreateIndex
CREATE UNIQUE INDEX "income_books_year_month_key" ON "income_books"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "income_book_entries_book_id_daily_log_entry_id_key" ON "income_book_entries"("book_id", "daily_log_entry_id");

-- CreateIndex
CREATE INDEX "income_book_manual_entries_book_id_date_idx" ON "income_book_manual_entries"("book_id", "date");

-- CreateIndex
CREATE INDEX "income_book_manual_entries_daily_log_entry_id_idx" ON "income_book_manual_entries"("daily_log_entry_id");

-- CreateIndex
CREATE INDEX "client_debts_client_id_status_idx" ON "client_debts"("client_id", "status");

-- CreateIndex
CREATE INDEX "client_debts_stylist_profile_id_status_idx" ON "client_debts"("stylist_profile_id", "status");

-- CreateIndex
CREATE INDEX "client_debts_created_by_id_status_idx" ON "client_debts"("created_by_id", "status");

-- CreateIndex
CREATE INDEX "client_debts_daily_log_entry_id_idx" ON "client_debts"("daily_log_entry_id");

-- CreateIndex
CREATE INDEX "client_debts_manual_entry_id_status_idx" ON "client_debts"("manual_entry_id", "status");

-- CreateIndex
CREATE INDEX "income_book_lock_events_book_id_created_at_idx" ON "income_book_lock_events"("book_id", "created_at");

-- CreateIndex
CREATE INDEX "income_book_manual_entry_audits_book_id_created_at_idx" ON "income_book_manual_entry_audits"("book_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_type_key" ON "notification_preferences"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_user_id_key" ON "loyalty_accounts"("user_id");

-- CreateIndex
CREATE INDEX "app_releases_platform_status_version_code_idx" ON "app_releases"("platform", "status", "version_code");

-- CreateIndex
CREATE UNIQUE INDEX "app_releases_platform_version_code_key" ON "app_releases"("platform", "version_code");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_cancellation_counts" ADD CONSTRAINT "client_cancellation_counts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salon_working_hours" ADD CONSTRAINT "salon_working_hours_salon_settings_id_fkey" FOREIGN KEY ("salon_settings_id") REFERENCES "salon_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_salon_settings_id_fkey" FOREIGN KEY ("salon_settings_id") REFERENCES "salon_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stylist_profiles" ADD CONSTRAINT "stylist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stylist_working_hours" ADD CONSTRAINT "stylist_working_hours_stylist_profile_id_fkey" FOREIGN KEY ("stylist_profile_id") REFERENCES "stylist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_subcategories" ADD CONSTRAINT "service_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "service_subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stylist_services" ADD CONSTRAINT "stylist_services_stylist_profile_id_fkey" FOREIGN KEY ("stylist_profile_id") REFERENCES "stylist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stylist_services" ADD CONSTRAINT "stylist_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_confirmed_stylist_id_fkey" FOREIGN KEY ("confirmed_stylist_id") REFERENCES "stylist_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_attendance_waived_by_user_id_fkey" FOREIGN KEY ("attendance_waived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_service_items" ADD CONSTRAINT "reservation_service_items_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_service_items" ADD CONSTRAINT "reservation_service_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_stylist_responses" ADD CONSTRAINT "reservation_stylist_responses_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_stylist_responses" ADD CONSTRAINT "reservation_stylist_responses_stylist_profile_id_fkey" FOREIGN KEY ("stylist_profile_id") REFERENCES "stylist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_entries" ADD CONSTRAINT "daily_log_entries_stylist_profile_id_fkey" FOREIGN KEY ("stylist_profile_id") REFERENCES "stylist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_entries" ADD CONSTRAINT "daily_log_entries_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_entries" ADD CONSTRAINT "daily_log_entries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_entries" ADD CONSTRAINT "daily_log_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_entries" ADD CONSTRAINT "daily_log_entries_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "client_debts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_entries" ADD CONSTRAINT "daily_log_entries_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_entries" ADD CONSTRAINT "daily_log_entries_source_entry_id_fkey" FOREIGN KEY ("source_entry_id") REFERENCES "daily_log_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_entry_service_items" ADD CONSTRAINT "daily_log_entry_service_items_daily_log_entry_id_fkey" FOREIGN KEY ("daily_log_entry_id") REFERENCES "daily_log_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_entry_service_items" ADD CONSTRAINT "daily_log_entry_service_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_images" ADD CONSTRAINT "daily_log_images_daily_log_entry_id_fkey" FOREIGN KEY ("daily_log_entry_id") REFERENCES "daily_log_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_images" ADD CONSTRAINT "daily_log_images_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_book_lock_events" ADD CONSTRAINT "expense_book_lock_events_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "expense_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_book_lock_events" ADD CONSTRAINT "expense_book_lock_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_template_fields" ADD CONSTRAINT "expense_template_fields_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "expense_category_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "expense_category_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "expense_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_field_values" ADD CONSTRAINT "expense_field_values_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_field_values" ADD CONSTRAINT "expense_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "expense_template_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_entries" ADD CONSTRAINT "income_book_entries_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "income_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_entries" ADD CONSTRAINT "income_book_entries_daily_log_entry_id_fkey" FOREIGN KEY ("daily_log_entry_id") REFERENCES "daily_log_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_manual_entries" ADD CONSTRAINT "income_book_manual_entries_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "income_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_manual_entries" ADD CONSTRAINT "income_book_manual_entries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_manual_entries" ADD CONSTRAINT "income_book_manual_entries_stylist_profile_id_fkey" FOREIGN KEY ("stylist_profile_id") REFERENCES "stylist_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_manual_entries" ADD CONSTRAINT "income_book_manual_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_manual_entries" ADD CONSTRAINT "income_book_manual_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_manual_entries" ADD CONSTRAINT "income_book_manual_entries_daily_log_entry_id_fkey" FOREIGN KEY ("daily_log_entry_id") REFERENCES "daily_log_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_debts" ADD CONSTRAINT "client_debts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_debts" ADD CONSTRAINT "client_debts_stylist_profile_id_fkey" FOREIGN KEY ("stylist_profile_id") REFERENCES "stylist_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_debts" ADD CONSTRAINT "client_debts_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_debts" ADD CONSTRAINT "client_debts_manual_entry_id_fkey" FOREIGN KEY ("manual_entry_id") REFERENCES "income_book_manual_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_debts" ADD CONSTRAINT "client_debts_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_debts" ADD CONSTRAINT "client_debts_daily_log_entry_id_fkey" FOREIGN KEY ("daily_log_entry_id") REFERENCES "daily_log_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_debts" ADD CONSTRAINT "client_debts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_debts" ADD CONSTRAINT "client_debts_settled_by_id_fkey" FOREIGN KEY ("settled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_lock_events" ADD CONSTRAINT "income_book_lock_events_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "income_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_lock_events" ADD CONSTRAINT "income_book_lock_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_manual_entry_audits" ADD CONSTRAINT "income_book_manual_entry_audits_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "income_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_manual_entry_audits" ADD CONSTRAINT "income_book_manual_entry_audits_manual_entry_id_fkey" FOREIGN KEY ("manual_entry_id") REFERENCES "income_book_manual_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_book_manual_entry_audits" ADD CONSTRAINT "income_book_manual_entry_audits_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "gallery_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_stylist_profile_id_fkey" FOREIGN KEY ("stylist_profile_id") REFERENCES "stylist_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_releases" ADD CONSTRAINT "app_releases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
