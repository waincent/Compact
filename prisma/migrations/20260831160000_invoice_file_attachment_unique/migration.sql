-- 发票文件附件:启用原有 file_attachment_id 列,加唯一约束(单发票单文件,可空,Postgres 允许多个 NULL)
CREATE UNIQUE INDEX "invoice_file_attachment_id_key" ON "invoice"("file_attachment_id");
