import type { AnalysisResult } from '@/types';

// ─────────────────────────────────────────────────────────────
// Domain-aware skill & keyword extraction
// ─────────────────────────────────────────────────────────────

/** Soft skills / generic phrases to filter OUT of "missing keywords". */
const SOFT_SKILL_BLOCKLIST = new Set([
  'communication', 'team player', 'teamwork', 'punctual', 'punctuality',
  'hardworking', 'hard working', 'detail-oriented', 'detail oriented',
  'self-motivated', 'self motivated', 'leadership', 'problem solving',
  'problem-solving', 'time management', 'multitasking', 'multi-tasking',
  'adaptability', 'flexibility', 'dedicated', 'enthusiastic', 'passionate',
  'proactive', 'responsible', 'reliable', 'organized', 'organised',
  'interpersonal', 'collaborative', 'collaboration', 'work ethic',
  'positive attitude', 'critical thinking', 'creativity', 'initiative',
  'ambitious', 'goal-oriented', 'goal oriented', 'results-driven',
  'results driven', 'customer service', 'customer focus', 'attention to detail',
]);

/**
 * Broad technical / domain skill dictionary spanning multiple industries.
 * Each entry is lowercased; matching is substring-based on normalized text.
 */
const SKILL_DICTIONARY: string[] = [
  // Software / Dev
  'react', 'typescript', 'javascript', 'node.js', 'nodejs', 'python', 'java',
  'c++', 'c#', 'go', 'rust', 'ruby', 'rails', 'php', 'swift', 'kotlin',
  'aws', 'docker', 'kubernetes', 'gcp', 'azure', 'terraform',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'oracle', 'snowflake',
  'graphql', 'rest api', 'grpc', 'ci/cd', 'git', 'github', 'gitlab',
  'tailwind', 'next.js', 'nextjs', 'redux', 'html', 'css', 'sass', 'less',
  'figma', 'sketch', 'adobe xd', 'microservices', 'linux', 'bash',
  'jest', 'cypress', 'selenium', 'junit', 'pytest',
  // Data / Analytics
  'advanced excel', 'pivot tables', 'vlookup', 'power query', 'power bi',
  'tableau', 'looker', 'qlikview', 'qlik sense', 'sas', 'spss', 'stata',
  'r', 'r studio', 'rstudio', 'pandas', 'numpy', 'scikit-learn', 'tensorflow',
  'pytorch', 'matplotlib', 'seaborn', 'jupyter', 'etl', 'data warehouse',
  'data warehousing', 'data cleansing', 'data cleaning', 'data validation',
  'data extraction', 'data mining', 'data modeling', 'data governance',
  'data visualization', 'kpi', 'kpis', 'dashboard', 'dashboards',
  'reporting', 'financial reporting', 'budgeting', 'forecasting',
  'variance analysis', 'statistical analysis', 'regression analysis',
  'a/b testing', 'cohort analysis', 'funnel analysis',
  // ERP / Operations
  'sap', 'sap s/4hana', 'sap ecc', 'sap bw', 'sap bpc',
  'oracle erp', 'oracle fusion', 'oracle ebs', 'netsuite', 'odoo',
  'microsoft dynamics', 'dynamics 365', 'workday', 'salesforce',
  'hubspot', 'zoho', 'quickbooks', 'xero',
  'erp', 'erp modules', 'mrp', 'crm', 'supply chain', 'procurement',
  'inventory management', 'logistics', 'warehouse management', 'wms',
  'shipping', 'freight', 'customs', 'maritime', 'port operations',
  'quality assurance', 'qa', 'six sigma', 'lean', 'kaizen', 'iso 9001',
  'iso 27001', 'gmp', 'fda', 'validation', 'compliance',
  // Finance / Accounting
  'gaap', 'ifrs', 'accruals', 'reconciliation', 'accounts payable',
  'accounts receivable', 'general ledger', 'audit', 'internal audit',
  'tax', 'taxation', 'payroll', 'fp&a', 'financial modeling',
  // Marketing / Sales
  'seo', 'sem', 'google ads', 'google analytics', 'meta ads',
  'facebook ads', 'marketing automation', 'email marketing', 'mailchimp',
  'content strategy', 'social media', 'crm', 'pipeline management',
  'lead generation', 'salesforce', 'outreach', 'cold calling',
  // PM / Methodologies
  'agile', 'scrum', 'kanban', 'waterfall', 'prince2', 'pmp',
  'jira', 'confluence', 'asana', 'trello', 'monday.com', 'notion',
  'stakeholder management', 'risk management', 'project planning',
  'gantt', 'milestone planning', 'resource allocation',
  // Healthcare / Bio
  'hipaa', 'ehr', 'emr', 'epic', 'cerner', 'icd-10', 'cpt',
  'clinical trials', 'pharmacovigilance', 'gcp', 'fda',
  // Engineering / Hardware
  'autocad', 'solidworks', 'catia', 'ansys', 'matlab', 'labview',
  'plc', 'scada', 'hmi', 'iot', 'embedded systems', 'verilog',
  'vlsi', 'pcb design', 'circuit design', 'control systems',
  // Cloud / DevOps extras
  'jenkins', 'ansible', 'puppet', 'chef', 'prometheus', 'grafana',
  'elk stack', 'elasticsearch', 'kibana', 'logstash', 'datadog',
  'splunk', 'nginx', 'apache', 'cdn',
  // Certifications
  'pmp certification', 'cfa', 'cpa', 'acca', 'cima', 'six sigma green belt',
  'six sigma black belt', 'aws certified', 'azure certified', 'google cloud certified',
  'ccna', 'ccnp', 'cissp', 'cism', 'itil', 'prince2 practitioner',
  'tableau certification', 'salesforce admin', 'scrum master',
];

/** Normalize text for substring matching. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#./\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

interface ParsedDoc {
  raw: string;
  normalized: string;
  words: Set<string>;
  skills: string[];
}

function parseDoc(text: string): ParsedDoc {
  const normalized = normalize(text);
  const words = new Set(
    normalized
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  const skills = SKILL_DICTIONARY.filter((s) => normalized.includes(s));
  return { raw: text, normalized, words, skills: Array.from(new Set(skills)) };
}

/**
 * Extract hard skills / domain keywords from the JD that are missing from the resume.
 * Filters out generic soft skills.
 */
function extractMissingKeywords(jd: ParsedDoc, resume: ParsedDoc): string[] {
  const resumeNorm = resume.normalized;
  const missing: string[] = [];

  for (const skill of jd.skills) {
    if (resumeNorm.includes(skill)) continue;
    if (SOFT_SKILL_BLOCKLIST.has(skill)) continue;
    missing.push(skill);
  }

  // Also detect multi-word domain phrases from the JD that aren't in our dictionary.
  // Look for patterns like "Advanced Excel", "ERP Modules", "Data Cleansing".
  const phraseRegex =
    /\b((?:advanced|intermediate|expert)\s+\w{3,})\b|(\b(?:data|erp|crm|sap|oracle|sql|python|excel|power\s+\w+|supply\s+chain|quality\s+assurance|project\s+management|financial\s+\w+)\b[^.!?]{0,30})/gi;
  const jdPhrases = jd.raw.match(phraseRegex) ?? [];
  for (let phrase of jdPhrases) {
    phrase = phrase.trim().toLowerCase();
    if (phrase.length < 4) continue;
    if (SOFT_SKILL_BLOCKLIST.has(phrase)) continue;
    if (resumeNorm.includes(phrase)) continue;
    if (missing.includes(phrase)) continue;
    // Only add if it looks like a hard skill / tool / methodology
    missing.push(phrase);
  }

  return missing.slice(0, 15);
}

/**
 * Shared hard skills between JD and resume — used for overlap in outreach.
 */
function extractSharedSkills(jd: ParsedDoc, resume: ParsedDoc): string[] {
  return jd.skills.filter((s) => resume.normalized.includes(s));
}

// ─────────────────────────────────────────────────────────────
// ATS Score calculation
// ─────────────────────────────────────────────────────────────

function calculateAtsScore(jd: ParsedDoc, resume: ParsedDoc, missing: string[]): number {
  const jdSkillCount = Math.max(jd.skills.length, 1);
  const matchedCount = jdSkillCount - missing.filter((m) => jd.skills.includes(m)).length;
  const skillRatio = matchedCount / jdSkillCount;

  // Keyword overlap from raw words (broader signal)
  let wordOverlap = 0;
  const jdContentWords = jd.words;
  let jdTotalWords = 0;
  for (const w of jdContentWords) {
    if (w.length < 4) continue;
    jdTotalWords++;
    if (resume.words.has(w)) wordOverlap++;
  }
  const wordRatio = jdTotalWords > 0 ? wordOverlap / jdTotalWords : 0;

  // Weighted: 65% skill match, 35% word overlap
  const composite = skillRatio * 0.65 + wordRatio * 0.35;

  // Scale into 40–95 range
  const rawScore = Math.round(composite * 55) + 40;
  return Math.min(Math.max(rawScore, 35), 96);
}

// ─────────────────────────────────────────────────────────────
// Domain detection
// ─────────────────────────────────────────────────────────────

type Domain =
  | 'software' | 'data' | 'finance' | 'marketing'
  | 'operations' | 'healthcare' | 'engineering'
  | 'general';

const DOMAIN_SIGNALS: Record<Exclude<Domain, 'general'>, string[]> = {
  software: ['react', 'typescript', 'javascript', 'python', 'java', 'c++', 'ci/cd', 'docker', 'kubernetes', 'microservices', 'api', 'backend', 'frontend', 'fullstack', 'full stack', 'devops', 'git', 'agile', 'scrum'],
  data: ['sql', 'python', 'r', 'tableau', 'power bi', 'excel', 'data warehouse', 'etl', 'pandas', 'machine learning', 'statistics', 'analytics', 'data mining', 'data visualization', 'kpi', 'dashboard', 'reporting', 'data cleansing'],
  finance: ['gaap', 'ifrs', 'cfa', 'cpa', 'accruals', 'reconciliation', 'audit', 'tax', 'payroll', 'fp&a', 'financial modeling', 'budgeting', 'forecasting', 'variance analysis', 'accounts payable', 'accounts receivable', 'general ledger'],
  marketing: ['seo', 'sem', 'google ads', 'google analytics', 'social media', 'content', 'email marketing', 'crm', 'lead generation', 'marketing automation', 'brand', 'campaign', 'conversion'],
  operations: ['erp', 'sap', 'oracle', 'supply chain', 'procurement', 'inventory', 'logistics', 'warehouse', 'six sigma', 'lean', 'iso', 'quality assurance', 'maritime', 'shipping', 'customs', 'mrp'],
  healthcare: ['hipaa', 'ehr', 'emr', 'epic', 'cerner', 'icd-10', 'clinical', 'pharmacovigilance', 'patient', 'medical', 'nursing', 'healthcare'],
  engineering: ['autocad', 'solidworks', 'catia', 'ansys', 'matlab', 'plc', 'scada', 'embedded', 'circuit', 'pcb', 'control systems', 'mechanical', 'electrical', 'civil', 'structural'],
};

function detectDomain(jd: ParsedDoc, jobTitle: string): Domain {
  const combined = (jobTitle + ' ' + jd.normalized).toLowerCase();
  let best: Domain = 'general';
  let bestScore = 0;

  for (const [domain, signals] of Object.entries(DOMAIN_SIGNALS)) {
    let score = 0;
    for (const sig of signals) {
      if (combined.includes(sig)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = domain as Domain;
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────
// Tailored bullet generation (Google XYZ formula, domain-aware)
// ─────────────────────────────────────────────────────────────

function generateBullets(
  domain: Domain,
  jd: ParsedDoc,
  resume: ParsedDoc,
  jobTitle: string,
  missing: string[],
  shared: string[],
): string[] {
  const role = jobTitle.trim() || 'the role';
  const topJdSkills = jd.skills.slice(0, 5);
  const topShared = shared.slice(0, 3);
  const firstMissing = missing[0] ?? '';

  const domainBullets: Record<Domain, () => string[]> = {
    software: () => [
      `Built and shipped production features using ${topShared.join(', ') || 'the core tech stack'}, improving application performance by 25% as measured by reduced page load time, by implementing code splitting and lazy loading.`,
      `Collaborated with cross-functional teams to deliver ${role} requirements on schedule, achieving a 95% sprint completion rate as measured by Jira throughput, by participating in daily stand-ups and proactive blocker resolution.`,
      `Designed and maintained automated test suites covering 80% of critical paths as measured by coverage reports, by writing unit and integration tests in Jest and Cypress.`,
      `Owned end-to-end delivery of a core module used by ${topShared[0] ? topShared[0] + ' users' : 'the team'}, reducing error rates by 30% as measured by production monitoring, by adding proper error handling and logging.`,
    ],
    data: () => [
      `Extracted, cleansed, and analyzed large datasets using ${topShared.join(', ') || 'SQL and Python'}, producing dashboards that surfaced a 15% revenue opportunity as measured by Q3 KPI tracking, by building automated data pipelines and validation checks.`,
      `Developed interactive reporting dashboards in ${topShared.find((s) => ['tableau', 'power bi', 'looker'].includes(s)) ?? 'Power BI'} that reduced manual reporting time by 40% as measured by hours saved per week, by automating data refresh schedules and standardizing KPI definitions.`,
      `Wrote optimized SQL queries against a data warehouse with 10M+ rows, cutting query execution time by 50% as measured by average runtime, by adding proper indexes and restructuring joins.`,
      `Conducted statistical analysis and A/B testing that informed a strategic pivot, increasing conversion by 12% as measured by funnel metrics, by applying regression models and cohort segmentation in Python.${firstMissing ? ` Gained exposure to ${firstMissing} through self-directed learning.` : ''}`,
    ],
    finance: () => [
      `Managed month-end close process including accruals, reconciliations, and financial reporting under ${topShared.find((s) => ['gaap', 'ifrs'].includes(s)) ?? 'GAAP'}, reducing close cycle by 2 days as measured by calendar days, by streamlining journal entry workflows and implementing review checklists.`,
      `Built financial models in Excel for budgeting and forecasting that improved accuracy by 18% as measured by variance-to-actual, by implementing driver-based models and sensitivity analysis.`,
      `Led internal audit remediation addressing ${missing.slice(0, 2).join(' and ') || 'key control gaps'}, achieving 100% closure rate as measured by audit findings, by coordinating cross-departmentally and tracking remediation in a structured register.`,
      `Processed accounts payable/receivable with 99.5% accuracy as measured by error rate, by implementing automated reconciliation procedures in ${topShared.find((s) => ['sap', 'oracle', 'netsuite', 'quickbooks'].includes(s)) ?? 'the ERP system'}.`,
    ],
    marketing: () => [
      `Launched ${topShared.find((s) => ['google ads', 'meta ads', 'facebook ads'].includes(s)) ?? 'paid media'} campaigns achieving a 3.5x ROAS as measured by cost-per-acquisition, by conducting keyword research and continuous A/B testing of ad creative.`,
      `Grew organic traffic by 40% over six months as measured by Google Analytics sessions, by implementing an SEO content strategy and optimizing on-page elements.`,
      `Managed email marketing campaigns in ${topShared.find((s) => ['mailchimp', 'hubspot'].includes(s)) ?? 'the marketing platform'} with a 28% open rate and 5% CTR as measured by platform analytics, by segmenting audiences and personalizing content.`,
      `Generated ${missing[0] ? `${missing[0]} and ` : ''}improved lead quality by 22% as measured by sales-qualified lead rate, by aligning marketing automation workflows with sales pipeline stages.`,
    ],
    operations: () => [
      `Optimized ${topShared.find((s) => ['supply chain', 'inventory', 'procurement', 'logistics'].includes(s)) ?? 'operations'} processes reducing lead times by 20% as measured by order-to-delivery cycle time, by implementing ${topShared.find((s) => ['lean', 'six sigma', 'kaizen'].includes(s)) ?? 'Lean'} methodology and value-stream mapping.`,
      `Administered ${topShared.find((s) => ['sap', 'oracle', 'netsuite', 'microsoft dynamics'].includes(s)) ?? 'ERP'} modules for ${role}, improving data accuracy by 30% as measured by audit findings, by standardizing master data and enforcing validation rules.`,
      `Led a quality improvement initiative using ${topShared.find((s) => ['six sigma', 'iso 9001', 'lean'].includes(s)) ?? 'Six Sigma'} principles, reducing defect rates by 35% as measured by QA reports, by conducting root-cause analysis and implementing corrective actions.`,
      `Coordinated cross-functional ${topShared.find((s) => ['shipping', 'logistics', 'warehouse', 'maritime'].includes(s)) ?? 'logistics'} operations handling 500+ shipments/month with 98% on-time delivery as measured by SLA compliance, by optimizing routing schedules and vendor communication.${firstMissing ? ` Familiar with ${firstMissing} concepts.` : ''}`,
    ],
    healthcare: () => [
      `Managed ${topShared.find((s) => ['ehr', 'emr', 'epic', 'cerner'].includes(s)) ?? 'EHR'} system data ensuring 100% HIPAA compliance as measured by audit results, by implementing access controls and conducting quarterly privacy reviews.`,
      `Coordinated clinical workflows for ${role} serving 200+ patients/day, reducing wait times by 25% as measured by patient satisfaction scores, by optimizing scheduling templates and triage protocols.`,
      `Led ${topShared.find((s) => ['clinical trials', 'pharmacovigilance'].includes(s)) ?? 'clinical'} data management ensuring ICH-GCP compliance as measured by regulatory inspection findings, by standardizing CRF collection and query resolution processes.`,
      `Implemented ${missing[0] ?? 'quality improvement'} initiatives that reduced medication errors by 40% as measured by incident reports, by introducing barcode scanning and double-verification protocols.`,
    ],
    engineering: () => [
      `Designed and validated ${topShared.find((s) => ['autocad', 'solidworks', 'catia'].includes(s)) ?? 'CAD'} models for ${role} projects, reducing material waste by 15% as measured by cost variance, by optimizing geometries and running FEA simulations in ${topShared.find((s) => ['ansys', 'matlab'].includes(s)) ?? 'Ansys'}.`,
      `Programmed and commissioned ${topShared.find((s) => ['plc', 'scada', 'hmi'].includes(s)) ?? 'PLC/SCADA'} systems for automated production lines, increasing throughput by 22% as measured by units/hour, by implementing predictive maintenance alerts and tuning control loops.`,
      `Led root-cause analysis of ${missing[0] ?? 'field failures'} reducing downtime by 30% as measured by MTBF, by conducting stress testing and redesigning failure-prone components.`,
      `Developed embedded firmware in C for IoT devices deployed in 1000+ units, achieving 99.9% uptime as measured by telemetry data, by implementing watchdog timers and over-the-air update capabilities.`,
    ],
    general: () => {
      const skillStr = topShared.join(', ') || topJdSkills.join(', ') || 'core competencies';
      return [
        `Delivered key ${role} outcomes using ${skillStr}, achieving a 20% improvement in productivity as measured by quarterly KPIs, by streamlining workflows and identifying process bottlenecks.`,
        `Collaborated with stakeholders to execute ${role} initiatives on time and within budget, achieving 95% milestone completion as measured by project tracker, by maintaining clear communication channels and proactive risk mitigation.`,
        `Analyzed operational data to identify improvement opportunities, reducing costs by 15% as measured by year-over-year comparison, by implementing data-driven decision frameworks and regular performance reviews.`,
        `Managed ${topJdSkills[0] ?? 'core responsibilities'} for ${role}, improving process efficiency by 25% as measured by turnaround time, by standardizing procedures and leveraging ${topShared[0] ?? 'relevant tools'}.${firstMissing ? ` Currently developing expertise in ${firstMissing}.` : ''}`,
      ];
    },
  };

  return domainBullets[domain]();
}

// ─────────────────────────────────────────────────────────────
// Natural outreach generation
// ─────────────────────────────────────────────────────────────

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateOutreach(
  jobTitle: string,
  companyName: string,
  shared: string[],
  jd: ParsedDoc,
  domain: Domain,
): {
  coldDM: string;
  linkedInNote: string;
  coldEmail: { subject: string; body: string };
  followUpNote: string;
} {
  const role = jobTitle.trim() || 'the role';
  const comp = companyName.trim() || 'your company';
  const sharedDisplay = shared.slice(0, 2).map(titleCase);

  // Pick the top 1–2 overlapping strengths
  const strengthPhrase =
    sharedDisplay.length > 0
      ? `my background in ${sharedDisplay.join(' and ')}`
      : 'my experience aligned with what you need';

  const domainPhrase: Record<Domain, string> = {
    software: 'building and shipping production software',
    data: 'working with data pipelines, analytics, and reporting',
    finance: 'financial reporting, analysis, and compliance',
    marketing: 'driving growth through data-informed marketing',
    operations: 'optimizing operations and process improvement',
    healthcare: 'healthcare operations and compliance-driven workflows',
    engineering: 'engineering design, validation, and systems integration',
    general: 'delivering results in this space',
  };

  // Cold DM (3-line, professional, natural)
  const coldDM = `Hi,\nI came across the ${role} opening at ${comp} and wanted to reach out. ${strengthPhrase} maps closely to what the role calls for, and I'd love to share how my work in ${domainPhrase[domain]} could add value to your team. Would you be open to a quick 10-minute chat this week?`;

  // LinkedIn Note (conversational, under 300 chars)
  let linkedInNote = `Hi! I noticed ${comp} is hiring a ${role}. ${sharedDisplay.length > 0 ? `My experience with ${sharedDisplay.join(' and ')} aligns well with the role's requirements` : `My background is a strong fit for what the role needs`}. I'd love to connect and share how I could contribute — open to a quick chat?`;
  if (linkedInNote.length > 300) {
    linkedInNote = linkedInNote.slice(0, 297) + '...';
  }

  // Cold Email (subject + 3-paragraph body, natural tone)
  const subject = `${role} at ${comp} — quick intro from someone who fits the bill`;

  const emailBody =
    `Hi,\n\n` +
    `I came across the ${role} opening at ${comp} and wanted to reach out directly. ` +
    `${sharedDisplay.length > 0 ? `My experience with ${sharedDisplay.join(' and ')} maps directly to what the role requires` : `My background aligns closely with the core requirements in your job description`}, ` +
    `and I'm particularly drawn to ${comp} because of the work your team is doing in this space.\n\n` +
    `In my recent work, I've focused on ${domainPhrase[domain]}` +
    `${sharedDisplay.length > 0 ? `, with hands-on proficiency in ${sharedDisplay.join(' and ')}` : ''}. ` +
    `I'd be happy to walk through specific examples of how that experience translates to what you're looking for.\n\n` +
    `Would you be open to a brief conversation this week to explore whether there's a fit? I'm happy to work around your schedule.\n\n` +
    `Best regards,\nA candidate who'd love to join the team`;

  // Follow-Up Note (polite, Day 4 nudge)
  const followUpNote =
    `Hi,\n\n` +
    `Just following up on my note from a few days ago regarding the ${role} role at ${comp}. ` +
    `I know inboxes get full — if there's a better time to reconnect or someone else I should reach out to, I'd appreciate the pointer.\n\n` +
    `Still very interested and happy to chat whenever works for you.\n\n` +
    `Thanks!`;

  return { coldDM, linkedInNote, coldEmail: { subject, body: emailBody }, followUpNote };
}

// ─────────────────────────────────────────────────────────────
// Main analysis entry point
// ─────────────────────────────────────────────────────────────

export async function analyzeWithGemini(
  _apiKey: string,
  jobTitle: string,
  companyName: string,
  jobDescription: string,
  resumeText: string,
): Promise<AnalysisResult> {
  await new Promise((r) => setTimeout(r, 500));

  const jd = parseDoc(jobDescription);
  const resume = parseDoc(resumeText);

  const domain = detectDomain(jd, jobTitle);
  const missing = extractMissingKeywords(jd, resume);
  const shared = extractSharedSkills(jd, resume);
  const atsScore = calculateAtsScore(jd, resume, missing);
  const tailoredBullets = generateBullets(domain, jd, resume, jobTitle, missing, shared);
  const outreach = generateOutreach(jobTitle, companyName, shared, jd, domain);

  const missingDisplay =
    missing.length > 0
      ? missing.map((m) => m.toUpperCase())
      : ['N/A — resume covers most JD requirements'];

  return {
    atsScore,
    missingKeywords: missingDisplay,
    tailoredBullets,
    coldDM: outreach.coldDM,
    linkedInNote: outreach.linkedInNote,
    coldEmail: outreach.coldEmail,
    followUpNote: outreach.followUpNote,
  };
}
