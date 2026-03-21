-- CreateTable
CREATE TABLE "SaeMilestone" (
    "id" TEXT NOT NULL,
    "saeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaeMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneProgress" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isReached" BOOLEAN NOT NULL DEFAULT true,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaeMilestone_saeId_idx" ON "SaeMilestone"("saeId");

-- CreateIndex
CREATE INDEX "MilestoneProgress_milestoneId_idx" ON "MilestoneProgress"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneProgress_studentId_idx" ON "MilestoneProgress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneProgress_milestoneId_studentId_key" ON "MilestoneProgress"("milestoneId", "studentId");

-- AddForeignKey
ALTER TABLE "SaeMilestone" ADD CONSTRAINT "SaeMilestone_saeId_fkey" FOREIGN KEY ("saeId") REFERENCES "Sae"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneProgress" ADD CONSTRAINT "MilestoneProgress_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "SaeMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneProgress" ADD CONSTRAINT "MilestoneProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
