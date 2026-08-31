-- 合同验收单据:验收日期 + 验收单文件(单张单文件,attachment 可空,Postgres 唯一索引允许多个 NULL)
CREATE TABLE "acceptance_doc" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "accept_date" DATE NOT NULL,
    "attachment_id" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acceptance_doc_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "acceptance_doc_attachment_id_key" ON "acceptance_doc"("attachment_id");
CREATE INDEX "acceptance_doc_contract_id_idx" ON "acceptance_doc"("contract_id");

ALTER TABLE "acceptance_doc" ADD CONSTRAINT "acceptance_doc_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acceptance_doc" ADD CONSTRAINT "acceptance_doc_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "acceptance_doc" ADD CONSTRAINT "acceptance_doc_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
