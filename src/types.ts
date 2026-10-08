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

export function deriveRecruiterInsights(
  base: AnalysisResult,
  jobTitle: string,
  companyName: string,
): RecruiterResult {
  const score = base.atsScore;
  const verdict: RecruiterResult['fitVerdict'] =
    score >= 75 ? 'strong' : score >= 55 ? 'moderate' : 'weak';

  const role = jobTitle.trim() || 'Software Engineer';
  const comp = companyName.trim() || 'the company';
  const matchedSkills = base.tailoredBullets
    .join(' ')
    .match(/using\s+([^,]+)/i)?.[1]
    ?.split(/[,/]/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean) ?? ['MODERN TECH STACK'];

  const strengths = [
    `Strong hands-on experience with ${matchedSkills.slice(0, 3).join(', ')} directly relevant to the ${role} role.`,
    `Demonstrated quantifiable impact - ${base.tailoredBullets[0]?.slice(0, 80) ?? '30% performance improvement'}...`,
    `Solid overall ATS keyword match (${score}%) covering most core requirements in the job description.`,
  ];

  const flags =
    base.missingKeywords.length > 0
      ? [
          `Missing key skills: ${base.missingKeywords.slice(0, 3).join(', ')} - may require ramp-up time.`,
          base.missingKeywords.length > 3
            ? `Broader gap: ${base.missingKeywords.length} required keywords not found in resume.`
            : `Limited evidence of system design or architectural decision-making experience.`,
        ]
      : [
          `No specific metrics or quantifiable outcomes mentioned for past projects.`,
          `Resume lacks clear leadership or mentoring signals expected at this level.`,
        ];

  const questions: InterviewQuestion[] = [
    {
      question: `Walk me through a production system you built using ${matchedSkills[0] ?? 'your core stack'} - what was the architecture and what tradeoffs did you make?`,
      expectedPoints: `Look for: clear articulation of architecture decisions, awareness of scalability/performance tradeoffs, ownership of end-to-end delivery, and concrete metrics.`,
    },
    {
      question: `The role at ${comp} requires ${base.missingKeywords[0] ?? 'cross-functional collaboration'}. Tell me about a time you had to fill a skill gap quickly on a project.`,
      expectedPoints: `Look for: learning agility, proactive problem-solving, ability to ramp on unfamiliar tech, and how they balanced quality with speed under pressure.`,
    },
    {
      question: `Describe a situation where you disagreed with a teammate or manager on a technical approach. How did you resolve it?`,
      expectedPoints: `Look for: maturity in conflict resolution, data-driven decision-making, willingness to compromise, and focus on team outcomes over ego.`,
    },
  ];

  const shortlistEmail: ColdEmail = {
    subject: `Great news - ${comp} would like to move forward with your ${role} application`,
    body: `Hi,\n\nThank you for applying for the ${role} position at ${comp}. After reviewing your resume, we're impressed by your experience with ${matchedSkills.slice(0, 2).join(' and ')} and the quantifiable impact you've driven.\n\nWe'd love to invite you to a technical phone screen to dive deeper into your background. The call will last ~45 minutes and cover architecture, problem-solving, and your experience with ${base.missingKeywords[0] ?? 'our core stack'}.\n\nPlease let us know your availability for next week and we'll send a calendar invite.\n\nBest,\n${comp} Talent Team`,
  };

  const rejectionEmail: ColdEmail = {
    subject: `Update on your ${role} application at ${comp}`,
    body: `Hi,\n\nThank you for taking the time to apply for the ${role} role at ${comp}. We appreciate your interest and the effort you put into your application.\n\nAfter careful review, we've decided not to move forward at this time. The role requires deeper experience with ${base.missingKeywords.slice(0, 2).join(' and ') || 'specific architectural patterns'}, and we encourage you to strengthen those areas and reapply in the future.\n\nWe wish you the very best in your job search and career journey.\n\nBest,\n${comp} Talent Team`,
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
