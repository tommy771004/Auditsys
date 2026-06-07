const fs = require('fs');

const files = [
  "src/Server/Services/auditIntelligence.ts",
  "src/Server/Services/auditSynthesis.ts",
  "src/Server/Services/browserCollector.ts",
  "src/Server/Services/deterministicCollector.ts",
  "src/Server/Services/harnessRunner.ts",
  "src/Server/Services/liveScanCollector.ts",
  "src/Server/Services/multiAgentEngine.ts",
  "src/components/ui/DashboardWidget.tsx",
  "src/components/ui/SeoChecklist.tsx",
  "src/components/ui/TwoRetryGovernance.tsx",
  "src/hooks/useAuditAgent.ts",
  "src/hooks/useLatestAuditReport.ts",
  "src/pages/AuditConsole.tsx",
  "src/services/auditReportStore.ts",
  "src/services/reportViewModel.ts",
  "src/types/agent.types.ts"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (file.startsWith('src/Server/Services')) {
    content = content.replace(/from "\.\/auditPipelineTypes"/g, 'from "../../shared/types/auditPipelineTypes"');
  } else {
    content = content.replace(/Server\/Services\/auditPipelineTypes/g, 'shared/types/auditPipelineTypes');
  }
  fs.writeFileSync(file, content);
}
console.log("Imports updated.");
