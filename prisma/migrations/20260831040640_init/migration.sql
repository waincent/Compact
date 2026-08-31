-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "avatar" VARCHAR(255),
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "role" INTEGER NOT NULL DEFAULT 4,
    "status" INTEGER NOT NULL DEFAULT 1,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_name" VARCHAR(100),
    "credit_code" VARCHAR(50),
    "company_type" INTEGER NOT NULL DEFAULT 2,
    "contact_name" VARCHAR(50),
    "contact_phone" VARCHAR(20),
    "bank_name" VARCHAR(100),
    "bank_account" VARCHAR(50),
    "remark" VARCHAR(500),
    "status" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "status" INTEGER NOT NULL DEFAULT 1,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "manager_id" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "project_id" INTEGER NOT NULL,
    "party_a_id" INTEGER NOT NULL,
    "party_b_id" INTEGER NOT NULL,
    "our_party_role" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "sign_date" DATE NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_record" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "direction" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "record_date" DATE NOT NULL,
    "voucher_attachment_id" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "direction" INTEGER NOT NULL DEFAULT 1,
    "payment_record_id" INTEGER,
    "original_invoice_id" INTEGER,
    "invoice_code" VARCHAR(30),
    "invoice_number" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 13,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount_with_tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "invoice_type" INTEGER NOT NULL DEFAULT 1,
    "issue_date" DATE NOT NULL,
    "file_attachment_id" INTEGER,
    "status" INTEGER NOT NULL DEFAULT 1,
    "remark" VARCHAR(300),
    "version" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_change_log" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "change_type" VARCHAR(30) NOT NULL,
    "before_value" VARCHAR(500),
    "after_value" VARCHAR(500),
    "reason" VARCHAR(300),
    "operator_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_change_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment" (
    "id" SERIAL NOT NULL,
    "business_type" VARCHAR(50) NOT NULL,
    "business_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_dict" (
    "id" SERIAL NOT NULL,
    "dict_type" VARCHAR(50) NOT NULL,
    "dict_label" VARCHAR(50) NOT NULL,
    "dict_value" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "sys_dict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "module" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "business_type" VARCHAR(50),
    "business_id" INTEGER,
    "detail_json" TEXT,
    "ip" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "username" VARCHAR(50) NOT NULL,
    "ip" VARCHAR(50),
    "user_agent" VARCHAR(255),
    "success" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_param" (
    "id" SERIAL NOT NULL,
    "param_key" VARCHAR(100) NOT NULL,
    "param_value" VARCHAR(500) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sys_param_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_sequence" (
    "id" SERIAL NOT NULL,
    "bizKey" VARCHAR(50) NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sys_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "company_credit_code_key" ON "company"("credit_code");

-- CreateIndex
CREATE INDEX "company_company_type_is_deleted_idx" ON "company"("company_type", "is_deleted");

-- CreateIndex
CREATE INDEX "company_is_deleted_created_at_idx" ON "company"("is_deleted", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_code_key" ON "project"("code");

-- CreateIndex
CREATE INDEX "project_status_is_deleted_idx" ON "project"("status", "is_deleted");

-- CreateIndex
CREATE INDEX "project_manager_id_is_deleted_idx" ON "project"("manager_id", "is_deleted");

-- CreateIndex
CREATE INDEX "project_is_deleted_end_date_idx" ON "project"("is_deleted", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "contract_code_key" ON "contract"("code");

-- CreateIndex
CREATE INDEX "contract_project_id_idx" ON "contract"("project_id");

-- CreateIndex
CREATE INDEX "contract_party_a_id_idx" ON "contract"("party_a_id");

-- CreateIndex
CREATE INDEX "contract_party_b_id_idx" ON "contract"("party_b_id");

-- CreateIndex
CREATE INDEX "contract_status_is_deleted_idx" ON "contract"("status", "is_deleted");

-- CreateIndex
CREATE INDEX "contract_is_deleted_end_date_idx" ON "contract"("is_deleted", "end_date");

-- CreateIndex
CREATE INDEX "payment_record_contract_id_direction_idx" ON "payment_record"("contract_id", "direction");

-- CreateIndex
CREATE INDEX "payment_record_is_deleted_status_idx" ON "payment_record"("is_deleted", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_invoice_number_key" ON "invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "invoice_contract_id_direction_idx" ON "invoice"("contract_id", "direction");

-- CreateIndex
CREATE INDEX "invoice_payment_record_id_idx" ON "invoice"("payment_record_id");

-- CreateIndex
CREATE INDEX "invoice_original_invoice_id_idx" ON "invoice"("original_invoice_id");

-- CreateIndex
CREATE INDEX "invoice_is_deleted_status_idx" ON "invoice"("is_deleted", "status");

-- CreateIndex
CREATE INDEX "contract_change_log_contract_id_idx" ON "contract_change_log"("contract_id");

-- CreateIndex
CREATE INDEX "attachment_business_type_business_id_idx" ON "attachment"("business_type", "business_id");

-- CreateIndex
CREATE INDEX "sys_dict_dict_type_status_idx" ON "sys_dict"("dict_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sys_dict_dict_type_dict_value_key" ON "sys_dict"("dict_type", "dict_value");

-- CreateIndex
CREATE INDEX "operation_log_user_id_created_at_idx" ON "operation_log"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "operation_log_module_created_at_idx" ON "operation_log"("module", "created_at");

-- CreateIndex
CREATE INDEX "login_log_user_id_created_at_idx" ON "login_log"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sys_param_param_key_key" ON "sys_param"("param_key");

-- CreateIndex
CREATE UNIQUE INDEX "sys_sequence_bizKey_key" ON "sys_sequence"("bizKey");

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_party_a_id_fkey" FOREIGN KEY ("party_a_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_party_b_id_fkey" FOREIGN KEY ("party_b_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_record" ADD CONSTRAINT "payment_record_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_record" ADD CONSTRAINT "payment_record_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_payment_record_id_fkey" FOREIGN KEY ("payment_record_id") REFERENCES "payment_record"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_original_invoice_id_fkey" FOREIGN KEY ("original_invoice_id") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_change_log" ADD CONSTRAINT "contract_change_log_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_change_log" ADD CONSTRAINT "contract_change_log_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_log" ADD CONSTRAINT "operation_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_log" ADD CONSTRAINT "login_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
