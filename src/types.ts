export type AppMode = 'jobseeker' | 'recruiter';
export type Tier = 'free' | '3months' | '6months' | '1year';

export interface TierConfig {
  label: string;
  shortLabel: string;
  recruiterScreeningCap: number;
  recruiterBatchMax: number;
  recruiterExport: boolean;
  recruiterPipelineArchive: boolean;
  jobSeekerAppCap: number;
  jobSeekerMultiPlatform: boolean;
  priorityProcessing: boolean;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  free: {
    label: 'Free',
    shortLabel: 'FREE',
    recruiterScreeningCap: 0,
    recruiterBatchMax: 0,
    recruiterExport: false,
    recruiterPipelineArchive: false,
    jobSeekerAppCap: 2,
    jobSeekerMultiPlatform: false,
    priorityProcessing: false,
  },
  '3months': {
    label: 'Placement Sprint',
    shortLabel: 'SPRINT',
    recruiterScreeningCap: 250,
    recruiterBatchMax: 10,
    recruiterExport: true,
    recruiterPipelineArchive: false,
    jobSeekerAppCap: 50,
    jobSeekerMultiPlatform: false,
    priorityProcessing: false,
  },
  '6months': {
    label: 'Career Pro / Growth Recruiter',
    shortLabel: 'PRO',
    recruiterScreeningCap: 1000,
    recruiterBatchMax: 99,
    recruiterExport: true,
    recruiterPipelineArchive: true,
    jobSeekerAppCap: Infinity,
    jobSeekerMultiPlatform: true,
    priorityProcessing: false,
  },
  '1year': {
    label: 'All-Access / Enterprise',
    shortLabel: 'ENTERPRISE',
    recruiterScreeningCap: Infinity,
    recruiterBatchMax: 99,
    recruiterExport: true,
    recruiterPipelineArchive: true,
    jobSeekerAppCap: Infinity,
    jobSeekerMultiPlatform: true,
    priorityProcessing: true,
  },
};

export function isPaidTier(tier: Tier): boolean {
  return tier !== 'free';
}

export interface ColdEmail {
  subject: string;
  body: string;
}

export interface AnalysisResult {
  atsScore: number;
  missingKeywords: string[];
  tailoredBullets: string[];
  coldDM: string;
  linkedInNote: string;
  coldEmail: ColdEmail;
  followUpNote: string;
}

export interface InterviewQuestion {
  question: string;
  expectedPoints: string;
}

export interface RecruiterResult {
  fitVerdict: 'strong' | 'moderate' | 'weak';
  fitScore: number;
  keyStrengths: string[];
  redFlags: string[];
  interviewQuestions: InterviewQuestion[];
  shortlistEmail: ColdEmail;
  rejectionEmail: ColdEmail;
}

type RecruiterDomain =
  | 'software' | 'data' | 'finance' | 'marketing'
  | 'operations' | 'healthcare' | 'engineering'
  | 'general';

const RECRUITER_DOMAIN_SIGNALS: Record<Exclude<RecruiterDomain, 'general'>, string[]> = {
  software: ['react', 'typescript', 'javascript', 'python', 'java', 'api', 'backend', 'frontend', 'devops', 'ci/cd', 'docker', 'kubernetes', 'microservices'],
  data: ['sql', 'python', 'r', 'tableau', 'power bi', 'excel', 'etl', 'data warehouse', 'analytics', 'dashboard', 'kpi', 'reporting', 'machine learning', 'data cleansing'],
  finance: ['gaap', 'ifrs', 'cfa', 'cpa', 'audit', 'tax', 'payroll', 'fp&a', 'financial modeling', 'budgeting', 'forecasting', 'reconciliation', 'accounts payable'],
  marketing: ['seo', 'sem', 'google ads', 'google analytics', 'social media', 'content', 'email marketing', 'crm', 'lead generation', 'campaign', 'conversion'],
  operations: ['erp', 'sap', 'oracle', 'supply chain', 'procurement', 'inventory', 'logistics', 'six sigma', 'lean', 'iso', 'quality assurance', 'maritime', 'shipping'],
  healthcare: ['hipaa', 'ehr', 'emr', 'epic', 'cerner', 'clinical', 'patient', 'medical', 'healthcare', 'pharmacovigilance'],
  engineering: ['autocad', 'solidworks', 'catia', 'ansys', 'matlab', 'plc', 'scada', 'embedded', 'circuit', 'control systems', 'mechanical', 'electrical'],
};

function detectRecruiterDomain(base: AnalysisResult, jobTitle: string): RecruiterDomain {
  const combined = (jobTitle + ' ' + base.tailoredBullets.join(' ') + ' ' + base.missingKeywords.join(' ')).toLowerCase();
  let best: RecruiterDomain = 'general';
  let bestScore = 0;
  for (const [domain, signals] of Object.entries(RECRUITER_DOMAIN_SIGNALS)) {
    let score = 0;
    for (const sig of signals) {
      if (combined.includes(sig)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = domain as RecruiterDomain;
    }
  }
  return best;
}

const DOMAIN_INTERVIEW_FOCUS: Record<RecruiterDomain, string> = {
  software: 'system design, problem-solving, and your experience with the core tech stack',
  data: 'data pipeline design, SQL proficiency, analytical problem-solving, and dashboard/reporting experience',
  finance: 'financial reporting accuracy, reconciliation processes, regulatory knowledge, and modeling experience',
  marketing: 'campaign strategy, attribution models, tool proficiency, and ROI measurement',
  operations: 'process optimization, ERP/system proficiency, supply chain or logistics experience, and quality methodologies',
  healthcare: 'compliance knowledge, clinical workflow understanding, system proficiency, and patient safety practices',
  engineering: 'design methodology, simulation/analysis experience, project execution, and technical problem-solving',
  general: 'relevant experience, problem-solving approach, and domain knowledge',
};

export function deriveRecruiterInsights(
  base: AnalysisResult,
  jobTitle: string,
  companyName: string,
): RecruiterResult {
  const score = base.atsScore;
  const verdict: RecruiterResult['fitVerdict'] =
    score >= 75 ? 'strong' : score >= 55 ? 'moderate' : 'weak';

  const role = jobTitle.trim() || 'the role';
  const comp = companyName.trim() || 'the company';
  const domain = detectRecruiterDomain(base, jobTitle);

  // Extract real matched skills from the tailored bullets (skills mentioned after "using")
  const bulletText = base.tailoredBullets.join(' ');
  const matchedSkills = bulletText
    .match(/using\s+([^,.]+?)(?:[,.]|,\s+achieving)/i)?.[1]
    ?.split(/[,/]/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 1 && s.length < 40) ?? [];

  // Fallback: pull from missing keywords complement (skills that ARE in the resume)
  const matchedDisplay = matchedSkills.length > 0
    ? matchedSkills.slice(0, 3)
    : ['RELEVANT EXPERIENCE'];

  const strengths = [
    `Direct experience with ${matchedDisplay.slice(0, 3).join(', ')} — closely aligned with the ${role} requirements.`,
    `Quantifiable impact demonstrated in past work: ${base.tailoredBullets[0]?.slice(0, 90) ?? 'measurable outcomes in previous roles'}...`,
    `Overall ATS keyword match of ${score}% covers most core requirements in the job description.`,
  ];

  const hasGaps = base.missingKeywords.length > 0 && !base.missingKeywords[0]?.startsWith('N/A');
  const flags = hasGaps
    ? [
        `Missing key competencies: ${base.missingKeywords.slice(0, 3).join(', ')} — may need ramp-up time in these areas.`,
        base.missingKeywords.length > 3
          ? `Broader gap: ${base.missingKeywords.length} required keywords not found in the resume.`
          : `Limited evidence of direct experience with ${base.missingKeywords[0]?.toLowerCase() ?? 'a core requirement'}.`,
      ]
    : [
        `Resume could benefit from more specific, quantified outcomes for past projects.`,
        `Consider probing depth of hands-on experience during the interview to validate skill level.`,
      ];

  const domainFocus = DOMAIN_INTERVIEW_FOCUS[domain];
  const firstMissing = (hasGaps ? base.missingKeywords[0]?.toLowerCase() : null) ?? 'a key competency for the role';

  const questions: InterviewQuestion[] = [
    {
      question: `Walk me through a project where you used ${matchedDisplay[0]?.toLowerCase() ?? 'your core skills'} — what was your specific contribution and what outcome did you achieve?`,
      expectedPoints: `Look for: clear ownership of their piece, concrete metrics or outcomes, understanding of how their work fit into the bigger picture, and honest reflection on challenges.`,
    },
    {
      question: `The ${role} role at ${comp} involves ${firstMissing}. Tell me about a time you had to get up to speed on something new quickly — how did you approach it?`,
      expectedPoints: `Look for: learning agility, proactive problem-solving, ability to ramp on unfamiliar areas, and how they balanced quality with speed under real constraints.`,
    },
    {
      question: `Describe a situation where you disagreed with a colleague or manager on how to approach a task. How did you work through it?`,
      expectedPoints: `Look for: maturity in handling disagreement, evidence-based reasoning, willingness to listen and adapt, and focus on outcomes over ego.`,
    },
  ];

  const shortlistEmail: ColdEmail = {
    subject: `Great news — ${comp} would like to move forward with your ${role} application`,
    body: `Hi,\n\nThank you for applying for the ${role} position at ${comp}. After reviewing your resume, we're impressed by your experience with ${matchedDisplay.slice(0, 2).join(' and ').toLowerCase()} and the measurable impact you've driven in your work.\n\nWe'd love to invite you to a conversation to dive deeper into your background. The call will last about 45 minutes and cover ${domainFocus}.\n\nPlease let us know your availability for next week and we'll send a calendar invite.\n\nBest,\n${comp} Talent Team`,
  };

  const rejectionEmail: ColdEmail = {
    subject: `Update on your ${role} application at ${comp}`,
    body: `Hi,\n\nThank you for taking the time to apply for the ${role} role at ${comp}. We appreciate your interest and the effort you put into your application.\n\nAfter careful review, we've decided not to move forward at this time. The role requires deeper experience with ${hasGaps ? base.missingKeywords.slice(0, 2).join(' and ').toLowerCase() : 'certain core competencies'}, and we encourage you to strengthen those areas and reapply in the future.\n\nWe wish you the very best in your job search and career journey.\n\nBest,\n${comp} Talent Team`,
  };

  return {
    fitVerdict: verdict,
    fitScore: score,
    keyStrengths: strengths,
    redFlags: flags,
    interviewQuestions: questions,
    shortlistEmail,
    rejectionEmail,
  };
}

export interface JobInput {
  jobDescription: string;
  jobTitle: string;
  companyName: string;
}

export interface ResumeInput {
  resumeText: string;
}

export interface BulkCandidate {
  id: string;
  label: string;
  resumeText: string;
  result: AnalysisResult;
  fitVerdict: 'strong' | 'moderate' | 'weak';
  fitScore: number;
  strengths: string[];
  disqualifiers: string[];
}

export type BulkCandidateStatus = 'Shortlist' | 'Review' | 'Reject';

export function getBulkStatus(fitVerdict: 'strong' | 'moderate' | 'weak'): BulkCandidateStatus {
  if (fitVerdict === 'strong') return 'Shortlist';
  if (fitVerdict === 'moderate') return 'Review';
  return 'Reject';
}
