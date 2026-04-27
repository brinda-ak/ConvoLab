CREATE TABLE "ParticipantConfig" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "personaLean" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParticipantConfig_externalId_key" ON "ParticipantConfig"("externalId");
