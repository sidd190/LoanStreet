-- CreateTable
CREATE TABLE "EmployeeActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "EmployeeActionLog_employeeId_idx" ON "EmployeeActionLog"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeActionLog_timestamp_idx" ON "EmployeeActionLog"("timestamp");

-- CreateIndex
CREATE INDEX "EmployeeActionLog_action_idx" ON "EmployeeActionLog"("action");
